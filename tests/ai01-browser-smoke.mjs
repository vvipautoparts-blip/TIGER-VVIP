import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL = process.env.AI01_SMOKE_URL || 'http://127.0.0.1:4173/owner-control.html?preview=owner';
const OUT='artifacts/ai01-browser-smoke'; mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const which=n=>spawnSync('which',[n],{encoding:'utf8'}).stdout.trim();
const chrome=process.env.CHROME_BIN||which('google-chrome')||which('chromium')||which('chromium-browser');
if(!chrome) throw new Error('Chrome/Chromium not found');
const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=9229',`--user-data-dir=/tmp/ai01-${process.pid}`,'about:blank'],{stdio:'ignore'});
let ws;
try {
  let v; for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:9229/json/version');if(r.ok){v=await r.json();break}}catch{} await sleep(100)}
  if(!v) throw new Error('Chrome DevTools unavailable');
  const t=await (await fetch('http://127.0.0.1:9229/json/new?about:blank',{method:'PUT'})).json();
  ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  let id=0; const waits=new Map(), handlers=new Map();
  const on=(m,f)=>handlers.set(m,[...(handlers.get(m)||[]),f]);
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;waits.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
  const event=(m,timeout=20000)=>new Promise((resolve,reject)=>{const f=p=>{clearTimeout(tm);handlers.set(m,(handlers.get(m)||[]).filter(x=>x!==f));resolve(p)};on(m,f);const tm=setTimeout(()=>reject(new Error(`Timeout ${m}`)),timeout)});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&waits.has(m.id)){const p=waits.get(m.id);waits.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}if(m.method)for(const f of handlers.get(m.method)||[])f(m.params)};
  const exceptions=[], consoleErrors=[], requests=[];
  on('Runtime.exceptionThrown',p=>exceptions.push(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text));
  on('Runtime.consoleAPICalled',p=>{if(['error','assert'].includes(p.type))consoleErrors.push(p.args.map(a=>a.value??a.description??'').join(' '))});
  on('Network.requestWillBeSent',p=>requests.push(p.request?.url||''));
  await Promise.all(['Page.enable','Runtime.enable','Network.enable'].map(m=>send(m)));
  const evalJs=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value};
  const ready=async()=>{for(let i=0;i<80;i++){if(await evalJs(`!!(document.querySelector('[data-owner-console]:not([hidden])')&&document.querySelector('[data-ai-command-center]'))`))return;await sleep(125)}throw new Error('AI-01 console not ready')};
  const inspect=async(name,width,height,mobile)=>{
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});
    const loaded=event('Page.loadEventFired'); await send('Page.navigate',{url:URL}); await loaded; await ready(); await sleep(400);
    const data=await evalJs(`(()=>{const h=document.documentElement,g=document.querySelector('[data-owner-auth-gate]'),o=document.querySelector('[data-owner-console]'),p=document.querySelector('[data-ai-command-center]'),a=[...document.querySelectorAll('[data-ai-agent]')],i=p?.querySelector('input[type="text"]'),s=document.querySelector('[data-owner-status]')?.textContent||'';return{lang:h.lang,dir:h.dir,gateHidden:!!g?.hidden,gateRendered:!!g&&getComputedStyle(g).display!=='none'&&g.getClientRects().length>0,ownerVisible:!!o&&!o.hidden,panel:!!p,count:a.length,ids:a.map(x=>x.dataset.aiAgent),heads:a.map(x=>x.querySelector('h3')?.textContent.trim()||''),promptDisabled:!!i?.disabled,overflow:h.scrollWidth>h.clientWidth+1,scrollWidth:h.scrollWidth,clientWidth:h.clientWidth,fallback:s.includes('تعذر تجهيز الوحدة بأمان')}})()`);
    const shot=await send('Page.captureScreenshot',{format:'png'}); writeFileSync(`${OUT}/${name}.png`,Buffer.from(shot.data,'base64')); return data;
  };
  const desktop=await inspect('desktop-1440x1000',1440,1000,false), mobile=await inspect('mobile-390x844',390,844,true);
  const ids=['general_manager','technical_manager','financial_analytics_manager','user_assistant'];
  const heads=['AI General Manager','AI Technical Manager','AI Financial & Analytics Manager','AI User Assistant'];
  const aiNeedles=['api.openai.com','openai.azure.com','anthropic.com','generativelanguage.googleapis.com','aiplatform.googleapis.com','bedrock-runtime','api.cohere.ai','api.mistral.ai','api.groq.com','api.perplexity.ai','api.together.xyz','api.fireworks.ai','api.replicate.com','api-inference.huggingface.co','/v1/chat/completions','/v1/responses'];
  const aiRequests=[...new Set(requests.filter(u=>aiNeedles.some(n=>u.toLowerCase().includes(n))))];
  const checks={
    owner_access_flow:[desktop,mobile].every(x=>x.gateHidden&&!x.gateRendered&&x.ownerVisible&&!x.fallback),
    four_ai_modules:[desktop,mobile].every(x=>x.count===4&&JSON.stringify(x.ids)===JSON.stringify(ids)&&JSON.stringify(x.heads)===JSON.stringify(heads)),
    arabic_rtl:[desktop,mobile].every(x=>x.lang==='ar'&&x.dir==='rtl'),
    no_javascript_console_errors:exceptions.filter(Boolean).length===0&&consoleErrors.length===0,
    no_horizontal_overflow:[desktop,mobile].every(x=>!x.overflow),
    prompt_disabled:[desktop,mobile].every(x=>x.promptDisabled),
    no_live_ai_provider_request:aiRequests.length===0
  };
  const nonLocalHosts=[...new Set(requests.map(u=>{try{const x=new globalThis.URL(u);return ['127.0.0.1','localhost'].includes(x.hostname)?null:x.hostname}catch{return null}}).filter(Boolean))];
  const report={chrome:v.Browser,sourceUrl:URL,desktop,mobile,checks,exceptions:[...new Set(exceptions.filter(Boolean))],consoleErrors:[...new Set(consoleErrors)],aiProviderRequests:aiRequests,nonLocalHosts};
  writeFileSync(`${OUT}/report.json`,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
  const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k); if(failed.length)throw new Error(`AI-01 browser smoke failed: ${failed.join(', ')}`);
  console.log('AI01_BROWSER_SMOKE=PASS');
} finally { try{ws?.close()}catch{} proc.kill('SIGTERM') }

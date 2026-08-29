const test=require('node:test'); const assert=require('node:assert/strict'); const path=require('node:path'); const {pathToFileURL}=require('node:url');
const mod=()=>import(pathToFileURL(path.resolve(__dirname,'../scripts/cleanup/phoenix-observer.mjs')).href);
function runner(map){return (cmd,args)=>{const key=[cmd,...args].join(' '); return map[key]??{ok:false,error_code:'ENOENT'};};}
test('observer is read-only and represents unavailable planes explicitly', async()=>{const m=await mod(); const run=runner({
'df -Pk /tmp/x':{ok:true,stdout:'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/x 1000 400 600 40% /'},
'df -Pi /tmp/x':{ok:true,stdout:'Filesystem Inodes IUsed IFree IUse% Mounted on\n/dev/x 100 25 75 25% /'},
'git rev-parse HEAD':{ok:true,stdout:'abc'},'git status --porcelain=v1':{ok:true,stdout:''}
}); const o=m.observeLocalPlanes({root:'/tmp/x',run,includeRepositoryObjects:false,environmentIdentity:'test-env',observedAt:'2026-08-29T00:00:00Z'}); assert.equal(o.filesystem.capacity.free_bytes,600*1024); assert.equal(o.filesystem.inodes.free_inodes,75); assert.equal(o.git.head,'abc'); assert.equal(o.plane_coverage.find(x=>x.plane==='github_actions_cache').state,'BLOCKED_CAPABILITY');});
test('malformed command output fails closed instead of inventing capacity',async()=>{const m=await mod(); const run=runner({'df -Pk /tmp/x':{ok:true,stdout:'bad'},'df -Pi /tmp/x':{ok:true,stdout:'bad'}}); const o=m.observeLocalPlanes({root:'/tmp/x',run,includeRepositoryObjects:false}); assert.equal(o.filesystem.capacity.available,false); assert.equal(o.filesystem.inodes.available,false);});
test('observer source contains no destructive cleanup primitive',()=>{const fs=require('node:fs'); const s=fs.readFileSync(path.resolve(__dirname,'../scripts/cleanup/phoenix-observer.mjs'),'utf8'); assert.doesNotMatch(s,/docker\s+(system\s+)?prune|supabase\s+(stop|db\s+reset)|rm\s+-rf/);});

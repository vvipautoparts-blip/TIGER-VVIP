'use strict';
const MiB=1024*1024;
const MIN_REQUEST_BYTES=15*MiB;
const MAX_REQUEST_BYTES=16*MiB;
const TOKEN=/^[A-Za-z0-9._:-]{1,96}$/;
function fail(){const e=new Error('media_production_runtime_unready');e.code='media_production_runtime_unready';throw e;}
function fn(v,name){return v&&typeof v[name]==='function';}
function token(v){return typeof v==='string'&&TOKEN.test(v);}
function assertNoHeifServerCapability(imageStack){
  for(const name of ['convertHeic','convertHeif','decodeHeic','decodeHeif'])if(typeof imageStack[name]==='function')fail();
}
function assertProductionMediaRuntimeReady(deps){
  if(!deps||typeof deps!=='object'||Array.isArray(deps))fail();
  const r=deps.productionRuntime;
  if(!r||r.schemaVersion!=='F05_PRODUCTION_RUNTIME_V1'||r.environment!=='production'||!token(r.provider))fail();
  const limit=r.requestLimit;
  if(!limit||limit.enforced!==true||!Number.isSafeInteger(limit.maxBytes)||limit.maxBytes<MIN_REQUEST_BYTES||limit.maxBytes>MAX_REQUEST_BYTES||limit.contentEncoding!=='identity-only')fail();
  const image=r.imageStack;
  if(!image||!token(image.backend)||!token(image.version)||image.jpeg!==true||image.webp!==true||image.metadataStrip!==true||image.srgb!==true||image.animationDisabled!==true||image.heicDecode!==false)fail();
  if(!r.audit||r.audit.durable!==true||r.audit.privacySafe!==true)fail();
  if(!r.telemetry||r.telemetry.privacyBudgeted!==true||r.telemetry.routeScoped!==true)fail();
  if(!r.alerting||r.alerting.routeScoped!==true)fail();
  if(!r.circuitControl||r.circuitControl.authority!=='trusted_policy_plane'||r.circuitControl.recommendationOnlyInput!==true)fail();
  if(!deps.imageStack||!fn(deps.imageStack,'inspect')||!fn(deps.imageStack,'rewrite'))fail();
  assertNoHeifServerCapability(deps.imageStack);
  if(!deps.auditSink||!fn(deps.auditSink,'write')||!deps.telemetrySink||!fn(deps.telemetrySink,'write')||!deps.alertSink||!fn(deps.alertSink,'notify')||!deps.policyControl||!fn(deps.policyControl,'applyCircuitRecommendation'))fail();
  return Object.freeze({schemaVersion:'F05_PRODUCTION_RUNTIME_READY_V1',ok:true,provider:r.provider,imageBackend:image.backend,maxRequestBytes:limit.maxBytes,circuitAuthority:r.circuitControl.authority});
}
exports.assertProductionMediaRuntimeReady=assertProductionMediaRuntimeReady;
Object.freeze(module.exports);

(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){
    exports.DEFAULT_CIRCUIT_POLICY=api.DEFAULT_CIRCUIT_POLICY;
    exports.evaluateHeifCircuit=api.evaluateHeifCircuit;
    Object.freeze(module.exports);
  }else root.VVIP_F05_FORMAT_CIRCUIT_BREAKER=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ALLOWED_KEYS=new Set(['decodeRoute','sampleCount','successCount','timeoutCount','oomCount','crashCount','integrityRejectCount']);
  const ROUTES=new Set(['wasm','native']);
  const DEFAULT_CIRCUIT_POLICY=Object.freeze({minSamples:20,maxHardFailureRate:0.08,maxTimeoutRate:0.10,maxTotalFailureRate:0.20});
  function fail(){const e=new Error('media_circuit_input_invalid');e.code='media_circuit_input_invalid';throw e;}
  function count(value){return Number.isSafeInteger(value)&&value>=0;}
  function sampleBucket(n){if(n<20)return'lt20';if(n<100)return'20_99';if(n<500)return'100_499';return'500_plus';}
  function actionFor(route){return route==='wasm'?'RECOMMEND_SUSPEND_WASM_FALLBACK':'RECOMMEND_SUSPEND_HEIF_NATIVE_ROUTE';}
  function result(route,state,action,reason,n){return Object.freeze({schemaVersion:'F05_MEDIA_CIRCUIT_V1',scope:route,state,action,reason,sampleBucket:sampleBucket(n),authority:'recommendation_only'});}
  function validatePolicy(policy){return policy&&Number.isSafeInteger(policy.minSamples)&&policy.minSamples>=20&&typeof policy.maxHardFailureRate==='number'&&policy.maxHardFailureRate>0&&policy.maxHardFailureRate<=1&&typeof policy.maxTimeoutRate==='number'&&policy.maxTimeoutRate>0&&policy.maxTimeoutRate<=1&&typeof policy.maxTotalFailureRate==='number'&&policy.maxTotalFailureRate>0&&policy.maxTotalFailureRate<=1;}
  function evaluateHeifCircuit(window,policy=DEFAULT_CIRCUIT_POLICY){
    if(!window||typeof window!=='object'||Array.isArray(window)||!validatePolicy(policy))fail();
    for(const key of Object.keys(window))if(!ALLOWED_KEYS.has(key))fail();
    if(!ROUTES.has(window.decodeRoute))fail();
    for(const key of ['sampleCount','successCount','timeoutCount','oomCount','crashCount','integrityRejectCount'])if(!count(window[key]))fail();
    const total=window.successCount+window.timeoutCount+window.oomCount+window.crashCount+window.integrityRejectCount;
    if(total!==window.sampleCount||window.sampleCount<1)fail();
    if(window.integrityRejectCount>0)return result(window.decodeRoute,'OPEN',actionFor(window.decodeRoute),'integrity',window.sampleCount);
    if(window.sampleCount<policy.minSamples)return result(window.decodeRoute,'CLOSED','KEEP_ACTIVE','insufficient_samples',window.sampleCount);
    const hard=(window.oomCount+window.crashCount)/window.sampleCount;
    const timeout=window.timeoutCount/window.sampleCount;
    const failures=(window.timeoutCount+window.oomCount+window.crashCount)/window.sampleCount;
    if(hard>=policy.maxHardFailureRate)return result(window.decodeRoute,'OPEN',actionFor(window.decodeRoute),'oom_crash_rate',window.sampleCount);
    if(timeout>=policy.maxTimeoutRate)return result(window.decodeRoute,'OPEN',actionFor(window.decodeRoute),'timeout_rate',window.sampleCount);
    if(failures>=policy.maxTotalFailureRate)return result(window.decodeRoute,'OPEN',actionFor(window.decodeRoute),'failure_rate',window.sampleCount);
    return result(window.decodeRoute,'CLOSED','KEEP_ACTIVE','healthy',window.sampleCount);
  }
  return Object.freeze({DEFAULT_CIRCUIT_POLICY,evaluateHeifCircuit});
});

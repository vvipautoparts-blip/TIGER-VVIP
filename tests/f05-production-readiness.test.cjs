'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { assertProductionMediaRuntimeReady }=require('../scripts/media/server/f05-production-readiness.js');

function ready(overrides={}){
  const base={
    productionRuntime:{
      schemaVersion:'F05_PRODUCTION_RUNTIME_V1',environment:'production',provider:'aws',
      requestLimit:{enforced:true,maxBytes:16*1024*1024,contentEncoding:'identity-only'},
      imageStack:{backend:'sharp-libvips',version:'1',jpeg:true,webp:true,metadataStrip:true,srgb:true,animationDisabled:true,heicDecode:false},
      audit:{durable:true,privacySafe:true},telemetry:{privacyBudgeted:true,routeScoped:true},alerting:{routeScoped:true},
      circuitControl:{authority:'trusted_policy_plane',recommendationOnlyInput:true}
    },
    imageStack:{inspect(){},rewrite(){}},auditSink:{write(){}},telemetrySink:{write(){}},alertSink:{notify(){}},policyControl:{applyCircuitRecommendation(){}}
  };
  return Object.assign(base,overrides);
}

test('production runtime readiness is fail-closed and binds real ports',()=>{
  const proof=assertProductionMediaRuntimeReady(ready());
  assert.equal(proof.ok,true);
  assert.equal(proof.provider,'aws');
  assert.equal(Object.isFrozen(proof),true);
  assert.throws(()=>assertProductionMediaRuntimeReady({}),/media_production_runtime_unready/);
  assert.throws(()=>assertProductionMediaRuntimeReady(ready({telemetrySink:null})),/media_production_runtime_unready/);
});

test('production runtime forbids server HEIC conversion capability and weak limits',()=>{
  const withHeic=ready();withHeic.imageStack.convertHeic=()=>{};
  assert.throws(()=>assertProductionMediaRuntimeReady(withHeic),/media_production_runtime_unready/);
  const weak=ready();weak.productionRuntime.requestLimit.maxBytes=32*1024*1024;
  assert.throws(()=>assertProductionMediaRuntimeReady(weak),/media_production_runtime_unready/);
});

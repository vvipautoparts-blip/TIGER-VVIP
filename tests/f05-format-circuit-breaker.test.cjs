'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { evaluateHeifCircuit, DEFAULT_CIRCUIT_POLICY }=require('../scripts/media/f05-format-circuit-breaker.js');

function window(overrides={}){return{decodeRoute:'wasm',sampleCount:100,successCount:96,timeoutCount:2,oomCount:1,crashCount:1,integrityRejectCount:0,...overrides};}

test('circuit breaker keeps healthy WASM active and returns a bounded recommendation only',()=>{
  const result=evaluateHeifCircuit(window());
  assert.equal(result.state,'CLOSED');
  assert.equal(result.action,'KEEP_ACTIVE');
  assert.equal(result.scope,'wasm');
  assert.equal('deviceId' in result,false);
  assert.equal('userId' in result,false);
  assert.equal(Object.isFrozen(result),true);
});

test('single decoder integrity mismatch opens WASM circuit immediately',()=>{
  const result=evaluateHeifCircuit(window({sampleCount:1,successCount:0,timeoutCount:0,oomCount:0,crashCount:0,integrityRejectCount:1}));
  assert.equal(result.state,'OPEN');
  assert.equal(result.action,'DISABLE_WASM_FALLBACK');
  assert.equal(result.reason,'integrity');
});

test('sustained OOM crash or timeout rates open only the affected route',()=>{
  const wasm=evaluateHeifCircuit(window({successCount:80,timeoutCount:8,oomCount:6,crashCount:6}));
  assert.equal(wasm.state,'OPEN');
  assert.equal(wasm.action,'DISABLE_WASM_FALLBACK');
  const native=evaluateHeifCircuit(window({decodeRoute:'native',successCount:80,timeoutCount:8,oomCount:6,crashCount:6}));
  assert.equal(native.action,'DISABLE_HEIF_NATIVE_ROUTE');
});

test('small samples do not trip rate-based breaker but integrity remains immediate',()=>{
  const small=evaluateHeifCircuit(window({sampleCount:5,successCount:1,timeoutCount:2,oomCount:1,crashCount:1}));
  assert.equal(small.state,'CLOSED');
  assert.equal(small.reason,'insufficient_samples');
  assert.ok(DEFAULT_CIRCUIT_POLICY.minSamples>=20);
});

test('circuit breaker rejects identifiers free-form telemetry and inconsistent aggregate counts',()=>{
  assert.throws(()=>evaluateHeifCircuit({...window(),deviceId:'abc'}),/media_circuit_input_invalid/);
  assert.throws(()=>evaluateHeifCircuit({...window(),rawError:'stack'}),/media_circuit_input_invalid/);
  assert.throws(()=>evaluateHeifCircuit(window({sampleCount:10,successCount:10,timeoutCount:2,oomCount:0,crashCount:0})),/media_circuit_input_invalid/);
});

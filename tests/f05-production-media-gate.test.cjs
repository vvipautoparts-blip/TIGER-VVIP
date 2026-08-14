'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { createProductionMediaGate }=require('../scripts/media/server/f05-production-media-gate.js');

function deps(){return{
  authorizeAdMedia:async()=>true,
  sha256:async()=> 'a'.repeat(64),
  imageStack:{inspect:async()=>({}),rewrite:async bytes=>({bytes:new Uint8Array(bytes)})},
  auditSink:{write:async()=>{}}
};}

test('production gate binds request envelope to derivative gate ports',async()=>{
  const gate=createProductionMediaGate(deps());
  const bytes=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const result=await gate.handle({
    request:{method:'POST',contentLength:bytes.length,contentEncoding:'identity'},
    actor:{id:'u'},adScope:{adId:'a'},candidateBytes:bytes,mediaPassport:{x:1}
  });
  assert.equal(result.ok,true);
  assert.equal(result.input.candidateBytes,bytes);
  assert.equal(result.input.actor.id,'u');
  assert.deepEqual(Object.keys(result.ports).sort(),['auditSecurityEvent','authorizeAdMedia','inspectCandidate','rewriteCanonical','sha256'].sort());
});

test('production gate fails before derivative processing on compressed or dishonest request envelope',async()=>{
  const gate=createProductionMediaGate(deps());
  const bytes=new Uint8Array(100);
  await assert.rejects(()=>gate.handle({request:{method:'POST',contentLength:100,contentEncoding:'gzip'},actor:{},adScope:{},candidateBytes:bytes,mediaPassport:{}}),/media_request_invalid/);
  await assert.rejects(()=>gate.handle({request:{method:'POST',contentLength:50,contentEncoding:'identity'},actor:{},adScope:{},candidateBytes:bytes,mediaPassport:{}}),/media_request_invalid/);
});

test('production gate object is frozen and has no original HEIC conversion capability',()=>{
  const gate=createProductionMediaGate(deps());
  assert.equal(Object.isFrozen(gate),true);
  assert.deepEqual(Object.keys(gate),['handle']);
  assert.equal('convertHeic' in gate,false);
  assert.equal('decodeHeic' in gate,false);
});

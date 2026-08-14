'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { createProductionMediaGate }=require('../scripts/media/server/f05-production-media-gate.js');

function deps(){
  const calls=[];
  return {
    calls,
    authorizeAdMedia:async(actor,scope)=>{calls.push(['authorize',actor,scope]);return true;},
    sha256:async bytes=>{calls.push(['sha',bytes.length]);return 'a'.repeat(64);},
    imageStack:{
      inspect:async(bytes,policy)=>{calls.push(['inspect',policy]);return {mime:'image/jpeg',width:1600,height:1200,hasForbiddenMetadata:false,isPolyglot:false,colorSpace:'srgb'};},
      rewrite:async(bytes,policy)=>{calls.push(['rewrite',policy]);return {bytes:new Uint8Array(bytes)};}
    },
    auditSink:{write:async event=>{calls.push(['audit',event]);}}
  };
}

function passport(bytes){
  return {
    schemaVersion:'F05_MEDIA_PASSPORT_V1',
    mediaPolicyVersion:'F05_BPLUS_V1',
    outputMime:'image/jpeg',
    sizeBytes:bytes.length,
    width:1600,
    height:1200,
    sha256:'a'.repeat(64)
  };
}

test('production gate binds request envelope to authoritative derivative verification and rewrite',async()=>{
  const d=deps();
  const gate=createProductionMediaGate(d);
  const bytes=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const result=await gate.handle({
    request:{method:'POST',contentLength:bytes.length,contentEncoding:'identity'},
    actor:{id:'u'},adScope:{adId:'a'},candidateBytes:bytes,mediaPassport:passport(bytes)
  });
  assert.equal(result.ok,true);
  assert.equal(result.canonicalMime,'image/jpeg');
  assert.equal(result.width,1600);
  assert.equal(result.height,1200);
  assert.equal(result.sha256,'a'.repeat(64));
  assert.ok(result.canonicalBytes instanceof Uint8Array);
  assert.ok(d.calls.some(x=>x[0]==='authorize'));
  assert.equal(d.calls.filter(x=>x[0]==='inspect').length,2);
  assert.equal(d.calls.filter(x=>x[0]==='rewrite').length,1);
  assert.ok(d.calls.some(x=>x[0]==='audit'&&x[1].outcome==='accepted'));
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

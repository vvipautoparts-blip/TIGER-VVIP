'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProductionMediaPorts, validateMediaRequestEnvelope, PRODUCTION_MEDIA_LIMITS } = require('../scripts/media/server/f05-production-media-ports.js');

function deps(overrides={}) {
  const calls=[];
  return {
    calls,
    authorizeAdMedia: async()=>true,
    sha256: async()=> 'a'.repeat(64),
    imageStack: {
      inspect: async(bytes, policy)=>{ calls.push(['inspect', policy]); return {mime:'image/jpeg',width:1600,height:1200,hasForbiddenMetadata:false,isPolyglot:false}; },
      rewrite: async(bytes, policy)=>{ calls.push(['rewrite', policy]); return {bytes:new Uint8Array(bytes)}; }
    },
    auditSink: { write: async event=>{ calls.push(['audit', event]); } },
    ...overrides
  };
}

test('production media request envelope rejects compressed HTTP bodies and oversized requests',()=>{
  assert.equal(PRODUCTION_MEDIA_LIMITS.maxCandidateBytes,15*1024*1024);
  assert.equal(validateMediaRequestEnvelope({method:'POST',contentLength:1024,contentEncoding:'identity'}).ok,true);
  assert.throws(()=>validateMediaRequestEnvelope({method:'POST',contentLength:1024,contentEncoding:'gzip'}),/media_request_invalid/);
  assert.throws(()=>validateMediaRequestEnvelope({method:'POST',contentLength:PRODUCTION_MEDIA_LIMITS.maxRequestBytes+1,contentEncoding:'identity'}),/media_request_invalid/);
  assert.throws(()=>validateMediaRequestEnvelope({method:'GET',contentLength:1024}),/media_request_invalid/);
});

test('production ports force metadata rejection, polyglot rejection and sRGB rewrite policy',async()=>{
  const d=deps();
  const ports=createProductionMediaPorts(d);
  const bytes=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
  const inspected=await ports.inspectCandidate(bytes,'image/jpeg');
  assert.equal(inspected.mime,'image/jpeg');
  const rewritten=await ports.rewriteCanonical(bytes,{mime:'image/jpeg',width:1600,height:1200});
  assert.ok(rewritten.bytes instanceof Uint8Array);
  const inspectPolicy=d.calls.find(x=>x[0]==='inspect')[1];
  assert.deepEqual(inspectPolicy.allowedMimes,['image/jpeg','image/webp']);
  assert.equal(inspectPolicy.rejectMetadata,true);
  assert.equal(inspectPolicy.rejectPolyglot,true);
  const rewritePolicy=d.calls.find(x=>x[0]==='rewrite')[1];
  assert.equal(rewritePolicy.stripMetadata,true);
  assert.equal(rewritePolicy.colorSpace,'srgb');
  assert.equal(rewritePolicy.allowAnimation,false);
});

test('production ports fail closed when required image stack or audit sink is unavailable',()=>{
  const noStack=deps(); delete noStack.imageStack;
  assert.throws(()=>createProductionMediaPorts(noStack),/media_production_ports_unavailable/);
  const noAudit=deps(); delete noAudit.auditSink;
  assert.throws(()=>createProductionMediaPorts(noAudit),/media_production_ports_unavailable/);
});

test('production ports expose only derivative-gate capabilities and never HEIC decode',()=>{
  const ports=createProductionMediaPorts(deps());
  assert.deepEqual(Object.keys(ports).sort(),['auditSecurityEvent','authorizeAdMedia','inspectCandidate','rewriteCanonical','sha256'].sort());
  assert.equal('decodeHeic' in ports,false);
  assert.equal('convertHeic' in ports,false);
  assert.equal(Object.isFrozen(ports),true);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyAndRewriteCandidate } = require('../scripts/media/server/f05-derivative-gate.js');

const SHA='a'.repeat(64);
const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xdb,0,2,0xff,0xd9]);
function passport(){return{schemaVersion:'F05_MEDIA_PASSPORT_V1',mediaPolicyVersion:'F05_BPLUS_V1',outputMime:'image/jpeg',width:1600,height:1200,sizeBytes:jpeg.length,sha256:SHA};}
function ports(audit,overrides={}){return{
  authorizeAdMedia:async()=>true,
  sha256:async()=>SHA,
  inspectCandidate:async()=>({mime:'image/jpeg',width:1600,height:1200,hasForbiddenMetadata:false,isPolyglot:false}),
  rewriteCanonical:async()=>({bytes:jpeg}),
  auditSecurityEvent:audit,
  ...overrides
};}

test('server final gate records a bounded security audit event on tampering rejection',async()=>{
  const events=[];
  await assert.rejects(()=>verifyAndRewriteCandidate({actor:{id:'u1'},adScope:{adId:'a1'},candidateBytes:Uint8Array.from([1,2,3]),mediaPassport:passport()},ports(async event=>events.push(event))),error=>error&&error.code==='media_derivative_invalid');
  assert.equal(events.length,1);
  assert.equal(events[0].schemaVersion,'F05_MEDIA_SECURITY_AUDIT_V1');
  assert.equal(events[0].outcome,'rejected');
  assert.equal(events[0].stage,'signature');
  assert.equal(events[0].code,'media_derivative_invalid');
  assert.equal('actor' in events[0],false);
  assert.equal('adScope' in events[0],false);
  assert.equal('candidateBytes' in events[0],false);
  assert.equal('filename' in events[0],false);
  assert.equal(Object.isFrozen(events[0]),true);
});

test('server final gate records accepted canonical rewrite without user/media identifiers',async()=>{
  const events=[];
  const result=await verifyAndRewriteCandidate({actor:{id:'u1'},adScope:{adId:'a1'},candidateBytes:jpeg,mediaPassport:passport()},ports(async event=>events.push(event)));
  assert.equal(result.ok,true);
  assert.equal(events.at(-1).outcome,'accepted');
  assert.equal(events.at(-1).stage,'canonical');
  assert.equal(events.at(-1).canonicalMime,'image/jpeg');
  assert.equal(events.at(-1).sizeBucket,'lt1mib');
});

test('server final gate fails closed if the required security audit port is absent',async()=>{
  const p=ports(async()=>{});
  delete p.auditSecurityEvent;
  await assert.rejects(()=>verifyAndRewriteCandidate({actor:{id:'u1'},adScope:{adId:'a1'},candidateBytes:jpeg,mediaPassport:passport()},p),error=>error&&error.code==='media_derivative_invalid');
});

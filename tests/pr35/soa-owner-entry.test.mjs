import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerEntryCoordinator, resolveOwnerEndpoint } from '../../scripts/security/soa/owner-entry.js';

test('production entry fails closed when endpoint is missing', async () => {
  const events=[];
  const coordinator=createOwnerEntryCoordinator({
    root:{querySelector:()=>null}, locationLike:{hostname:'example.com',origin:'https://example.com',search:''},
    readEvidence:async()=>({advisoryOnly:true,clerkUserId:'user_1',sessionId:'sess_1',sessionAuthenticated:true}),
    getToken:async()=> 'token', onReady:async()=>events.push('ready')
  });
  const result=await coordinator.start();
  assert.equal(result.mode,'LOCKED');
  assert.deepEqual(events,[]);
});

test('production entry renders sovereign dashboard only after exact server-confirmed READY', async () => {
  const events=[];
  const root={querySelector:(selector)=> selector==='meta[name="tiger-soa-owner-access-endpoint"]'?{content:'https://api.example.com/functions/v1/tiger-sovereign-owner-access'}:null};
  const coordinator=createOwnerEntryCoordinator({
    root, locationLike:{hostname:'example.com',origin:'https://example.com',search:''},
    readEvidence:async()=>({advisoryOnly:true,clerkUserId:'user_1',sessionId:'sess_1',sessionAuthenticated:true}),
    getToken:async()=> 'token',
    requestServerState:async()=>({source:'SOA_SERVER_VERIFIED',allowed:true,clerkUserId:'user_1',sessionId:'sess_1',authorityStatus:'ACTIVE',killSwitch:false,recoveryState:'NONE',holdState:'CLEAR'}),
    onReady:async()=>events.push('ready')
  });
  const result=await coordinator.start();
  assert.equal(result.mode,'READY');
  assert.deepEqual(events,['ready']);
});

test('server identity mismatch never reaches READY', async () => {
  const events=[];
  const root={querySelector:(selector)=> selector.includes('endpoint')?{content:'https://api.example.com/functions/v1/tiger-sovereign-owner-access'}:null};
  const coordinator=createOwnerEntryCoordinator({
    root, locationLike:{hostname:'example.com',origin:'https://example.com',search:''},
    readEvidence:async()=>({advisoryOnly:true,clerkUserId:'user_1',sessionId:'sess_1',sessionAuthenticated:true}),
    getToken:async()=> 'token',
    requestServerState:async()=>({source:'SOA_SERVER_VERIFIED',allowed:true,clerkUserId:'user_other',sessionId:'sess_1',authorityStatus:'ACTIVE',killSwitch:false,recoveryState:'NONE',holdState:'CLEAR'}),
    onReady:async()=>events.push('ready')
  });
  const result=await coordinator.start();
  assert.equal(result.mode,'LOCKED');
  assert.deepEqual(events,[]);
});

test('local preview may load legacy demo but is never sovereign authorized', async () => {
  const events=[];
  const coordinator=createOwnerEntryCoordinator({
    root:{querySelector:()=>null}, locationLike:{hostname:'localhost',origin:'http://localhost:8000',search:'?preview=owner'},
    readEvidence:async()=>null, getToken:async()=>null, loadLocalPreview:async()=>events.push('legacy')
  });
  const result=await coordinator.start();
  assert.equal(result.mode,'LOCAL_PREVIEW');
  assert.equal(result.sovereignAuthorized,false);
  assert.deepEqual(events,['legacy']);
});

test('relative owner endpoint resolves only against the current secure origin', () => {
  assert.equal(resolveOwnerEndpoint('/functions/v1/tiger-sovereign-owner-access',{hostname:'app.example.com',origin:'https://app.example.com'}),'https://app.example.com/functions/v1/tiger-sovereign-owner-access');
});

test('endpoint rejects insecure production HTTP and credentials in URL', () => {
  assert.equal(resolveOwnerEndpoint('http://api.example.com/functions/v1/tiger-sovereign-owner-access',{hostname:'example.com',origin:'https://example.com'}),null);
  assert.equal(resolveOwnerEndpoint('https://user:pass@api.example.com/functions/v1/tiger-sovereign-owner-access',{hostname:'example.com',origin:'https://example.com'}),null);
  assert.equal(resolveOwnerEndpoint('http://127.0.0.1:54321/functions/v1/tiger-sovereign-owner-access',{hostname:'localhost',origin:'http://localhost:8000'}),'http://127.0.0.1:54321/functions/v1/tiger-sovereign-owner-access');
});

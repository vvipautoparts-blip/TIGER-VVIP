'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gatePath = path.join(__dirname,'..','scripts','security','soa','owner-control-gate.js');
const bootstrapPath = path.join(__dirname,'..','scripts','pr35','pr35-bootstrap.js');

async function gate() { return import(`file://${gatePath}?v=${Date.now()}`); }

test('owner UI refuses legacy/browser authority and needs exact server-confirmed binding', async () => {
  const { resolveOwnerUiGateDecision } = await gate();
  const evidence = { advisoryOnly:true, clerkUserId:'user_owner', sessionId:'sess_1', sessionAuthenticated:true };
  assert.equal(resolveOwnerUiGateDecision({ evidence, serverState:null }).mode, 'LOCKED');
  assert.equal(resolveOwnerUiGateDecision({ evidence, serverState:{source:'BROWSER',allowed:true,clerkUserId:'user_owner',sessionId:'sess_1',authorityStatus:'ACTIVE'} }).mode, 'LOCKED');
  assert.equal(resolveOwnerUiGateDecision({ evidence, serverState:{source:'SOA_SERVER_VERIFIED',allowed:true,clerkUserId:'other',sessionId:'sess_1',authorityStatus:'ACTIVE',killSwitch:false,recoveryState:'NONE',holdState:'CLEAR'} }).mode, 'LOCKED');
});

test('owner UI exposes explicit reverify recovery restricted and ready states', async () => {
  const { resolveOwnerUiGateDecision } = await gate();
  const evidence = { advisoryOnly:true, clerkUserId:'user_owner', sessionId:'sess_1', sessionAuthenticated:true };
  const base = {source:'SOA_SERVER_VERIFIED',allowed:true,clerkUserId:'user_owner',sessionId:'sess_1',authorityStatus:'ACTIVE',killSwitch:false,recoveryState:'NONE',holdState:'CLEAR'};
  assert.equal(resolveOwnerUiGateDecision({evidence, serverState:{...base, requiresReverification:true}}).mode,'REVERIFY');
  assert.equal(resolveOwnerUiGateDecision({evidence, serverState:{...base, recoveryState:'PENDING'}}).mode,'RECOVERY');
  assert.equal(resolveOwnerUiGateDecision({evidence, serverState:{...base, authorityStatus:'SUSPENDED'}}).mode,'RESTRICTED');
  assert.equal(resolveOwnerUiGateDecision({evidence, serverState:base}).mode,'READY');
});

test('local preview is explicit and cannot masquerade as production authority', async () => {
  const { resolveOwnerUiGateDecision } = await gate();
  assert.deepEqual(resolveOwnerUiGateDecision({localPreview:true}), { mode:'LOCAL_PREVIEW', code:'OWNER_LOCAL_PREVIEW_ONLY', canRender:true, sovereignAuthorized:false });
});

test('gate source contains no browser persistence or logging of owner private state', () => {
  const source = fs.readFileSync(gatePath,'utf8');
  assert.doesNotMatch(source,/localStorage|sessionStorage|console\.(?:log|debug|info|warn|error)/);
});

test('PR35 bootstrap must invoke SOA gate before mountConsole in production path', () => {
  const source = fs.readFileSync(bootstrapPath,'utf8');
  assert.match(source,/owner-control-gate\.js/);
  assert.match(source,/clerk-owner-assurance\.js/);
  const gateAt = source.indexOf('ownerGate');
  const mountAt = source.indexOf('owner.mountConsole');
  assert.ok(gateAt >= 0 && mountAt > gateAt, 'SOA owner gate must precede legacy console mount');
});

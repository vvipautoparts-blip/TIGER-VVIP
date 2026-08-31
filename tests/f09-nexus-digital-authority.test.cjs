'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { ACTIONS, evaluateNexusDigitalAuthority }=require('../scripts/ai/nexus-owner-boundary.cjs');

test('digital AI may analyze and recommend with zero financial benefit',()=>{
 for(const action of [ACTIONS.ANALYZE,ACTIONS.RECOMMEND]){
  const r=evaluateNexusDigitalAuthority({actorType:'DIGITAL',action});
  assert.equal(r.decision,'ALLOW');
  assert.equal(r.financialBeneficiary,false);
  assert.equal(r.commissionBps,0);
  assert.equal(r.shareBps,0);
  assert.equal(r.walletAllowed,false);
 }
});

test('digital AI cannot decide sovereign finance/country/release actions',()=>{
 const forbidden=[ACTIONS.DECIDE_PENDING_INTERNAL_16,ACTIONS.TRANSFER_FUNDS,ACTIONS.ACTIVATE_COUNTRY,ACTIONS.ACTIVATE_REAL_MONEY,ACTIONS.DEPLOY_PRODUCTION,ACTIONS.SET_GLOBAL_LAUNCH_ELIGIBLE,ACTIONS.CHANGE_OWNER_AUTHORITY,ACTIONS.MARKETPLACE_INTERMEDIATE];
 for(const action of forbidden){
  const r=evaluateNexusDigitalAuthority({actorType:'DIGITAL',action,ownerApproved:true});
  assert.equal(r.decision,'DENY',action);
  assert.equal(r.reasonCode,'OWNER_SOVEREIGN_ACTION_DIGITAL_DENIED',action);
 }
});

test('unknown actions fail closed',()=>{
 const r=evaluateNexusDigitalAuthority({actorType:'DIGITAL',action:'invented_action'});
 assert.equal(r.decision,'DENY');
 assert.equal(r.reasonCode,'UNKNOWN_DIGITAL_ACTION');
});

test('boundary is only for authenticated digital actor classification',()=>{
 for(const actorType of ['HUMAN',null,undefined,'']){
  const r=evaluateNexusDigitalAuthority({actorType,action:ACTIONS.ANALYZE});
  assert.equal(r.decision,'DENY');
  assert.equal(r.reasonCode,'DIGITAL_ACTOR_REQUIRED');
 }
});

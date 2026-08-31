'use strict';

const ACTIONS=Object.freeze({
 ANALYZE:'analyze',RECOMMEND:'recommend',
 DECIDE_PENDING_INTERNAL_16:'decide_pending_internal_16',TRANSFER_FUNDS:'transfer_funds',
 ACTIVATE_COUNTRY:'activate_country',ACTIVATE_REAL_MONEY:'activate_real_money',DEPLOY_PRODUCTION:'deploy_production',
 SET_GLOBAL_LAUNCH_ELIGIBLE:'set_global_launch_eligible',CHANGE_OWNER_AUTHORITY:'change_owner_authority',
 MARKETPLACE_INTERMEDIATE:'marketplace_intermediate'
});
const ALLOWED=new Set([ACTIONS.ANALYZE,ACTIONS.RECOMMEND]);
const OWNER_SOVEREIGN=new Set(Object.values(ACTIONS).filter(x=>!ALLOWED.has(x)));
const ZERO_FINANCIAL=Object.freeze({financialBeneficiary:false,commissionBps:0,shareBps:0,walletAllowed:false,payoutDestination:null});

function evaluateNexusDigitalAuthority(input={}){
 if(input.actorType!=='DIGITAL')return Object.freeze({decision:'DENY',reasonCode:'DIGITAL_ACTOR_REQUIRED',...ZERO_FINANCIAL});
 if(ALLOWED.has(input.action))return Object.freeze({decision:'ALLOW',reasonCode:'DIGITAL_ADVISORY_ACTION_ALLOWED',...ZERO_FINANCIAL});
 if(OWNER_SOVEREIGN.has(input.action))return Object.freeze({decision:'DENY',reasonCode:'OWNER_SOVEREIGN_ACTION_DIGITAL_DENIED',...ZERO_FINANCIAL});
 return Object.freeze({decision:'DENY',reasonCode:'UNKNOWN_DIGITAL_ACTION',...ZERO_FINANCIAL});
}
module.exports=Object.freeze({ACTIONS,ZERO_FINANCIAL,evaluateNexusDigitalAuthority});

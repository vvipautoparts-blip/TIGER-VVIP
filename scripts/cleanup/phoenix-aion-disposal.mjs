import { createLifecycleLedger, recordLifecycleStage, issueDisposalCertificate, DELETION_CHAIN } from '../../project-control/aion/metabolism.mjs';
import { isTrustedTargetLease } from './phoenix-shadow-plan.mjs';

function isoAt(baseMs, offset){return new Date(baseMs+offset).toISOString();}
function ref(stage, lease, supplied){return supplied?.[stage] ?? `phoenix:${stage.toLowerCase()}:${lease.lease_digest.slice(0,32)}`;}

export async function executeAionDisposal(input={}){
  const {lease,authorization,rollbackPlanRef,evidenceRefs={},executor,owner='TIGER_PHOENIX_CLEANROOM',now=new Date()}=input;
  if(!isTrustedTargetLease(lease)) throw new Error('PHOENIX_UNTRUSTED_TARGET_LEASE');
  if(lease.requires_aion_disposal_gate!==true) throw new Error('PHOENIX_AION_GATE_REQUIRED');
  if(!authorization||authorization.decision!=='APPROVED'||typeof authorization.authority!=='string'||!authorization.authority) throw new Error('PHOENIX_AION_APPROVAL_REQUIRED');
  if(typeof rollbackPlanRef!=='string'||!rollbackPlanRef) throw new Error('PHOENIX_ROLLBACK_PLAN_REQUIRED');
  if(typeof executor!=='function') throw new Error('PHOENIX_DISPOSAL_EXECUTOR_REQUIRED');
  const base=new Date(now).getTime(); if(!Number.isFinite(base)) throw new Error('PHOENIX_INVALID_TIME');
  let ledger=createLifecycleLedger({asset_id:lease.target_id,owner,created_at:isoAt(base,0)});
  const stages=['DETECT','CLASSIFY','EXPLAIN','APPROVE','QUARANTINE','REHEARSE','VERIFY'];
  for(let i=0;i<stages.length;i++){
    const stage=stages[i];
    const event={stage,occurred_at:isoAt(base,i+1),evidence_ref:ref(stage,lease,evidenceRefs)};
    if(stage==='CLASSIFY') event.classification='orphaned';
    if(stage==='APPROVE') event.authorization=authorization;
    if(stage==='REHEARSE') event.rollback_plan_ref=rollbackPlanRef;
    ledger=recordLifecycleStage(ledger,event);
  }
  const executionResult=await executor(Object.freeze({target_id:lease.target_id,target_path:lease.target_path,target_digest:lease.target_digest,lease_digest:lease.lease_digest,verified_stage:'VERIFY'}));
  ledger=recordLifecycleStage(ledger,{stage:'DELETE',occurred_at:isoAt(base,8),evidence_ref:ref('DELETE',lease,evidenceRefs)});
  ledger=recordLifecycleStage(ledger,{stage:'SEAL',occurred_at:isoAt(base,9),evidence_ref:ref('SEAL',lease,evidenceRefs)});
  const certificate=issueDisposalCertificate(ledger);
  if(JSON.stringify(ledger.events.map(e=>e.stage))!==JSON.stringify(DELETION_CHAIN)) throw new Error('PHOENIX_AION_CHAIN_DRIFT');
  return Object.freeze({ledger,certificate,execution_result:executionResult??null});
}

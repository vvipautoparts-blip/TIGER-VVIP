import crypto from 'node:crypto';

const STATES = new Set(['RECLAIM_ELIGIBLE','MANUAL_REVIEW_REQUIRED','RETENTION_HOLD','STATEFUL_LOCK','SOVEREIGN_LOCK','SECURITY_LOCK','INSUFFICIENT_EVIDENCE']);
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function decision(state, reason, input, extra={}){
  if(!STATES.has(state)) throw new Error('POR_STATE_INVALID');
  const body={state,reason,candidate_id:input.candidate?.id??null,classification:input.classification??null,observation_digest:input.observationDigest??null,policy_digest:input.policyDigest??null,requires_aion_disposal_gate:state==='RECLAIM_ELIGIBLE',...extra};
  return Object.freeze({...body,por_digest:digest(body)});
}

export function proveReclamation(input={}){
  const {candidate={},classification,observationDigest,dependencies=[],regeneration=null,retention=null,policyDigest}=input;
  if(!observationDigest||!policyDigest||!candidate?.id) return decision('INSUFFICIENT_EVIDENCE','MISSING_IDENTITY_OR_DIGEST',input);
  if(classification==='S0_SOVEREIGN') return decision('SOVEREIGN_LOCK','S0_SOVEREIGN',input);
  if(classification==='S4_STATEFUL_LOCAL') return decision('STATEFUL_LOCK','S4_STATEFUL_LOCAL',input);
  if(candidate.security_sensitive===true||candidate.secret_material===true||candidate.credential_material===true||candidate.protected_release_identity===true||candidate.protected_release_provenance===true) return decision('SECURITY_LOCK','SECURITY_OR_RELEASE_IDENTITY_PROTECTED',input);
  if(candidate.git_history_rewrite===true||candidate.unique_pr_branch_commits===true) return decision('SOVEREIGN_LOCK','REPOSITORY_IDENTITY_PROTECTED',input);
  if(classification==='S1_EVIDENCE'){
    if(retention?.active===true||candidate.active_canonical_evidence===true) return decision('RETENTION_HOLD','ACTIVE_EVIDENCE_RETENTION',input,{retention_ref:retention?.ref??null});
    return decision('MANUAL_REVIEW_REQUIRED','EVIDENCE_REQUIRES_EXPLICIT_REVIEW',input);
  }
  const protectedDependency=dependencies.find(d=>d?.protected===true||d?.class==='S0_SOVEREIGN'||d?.class==='S1_EVIDENCE'||d?.class==='S4_STATEFUL_LOCAL');
  if(protectedDependency) return decision('MANUAL_REVIEW_REQUIRED','PROTECTED_DEPENDENCY_PRESENT',input,{dependency_id:protectedDependency.id??null});
  if(classification==='S2_REBUILDABLE'){
    if(!regeneration?.recipe_ref||!regeneration?.source_digest||regeneration?.verified!==true) return decision('INSUFFICIENT_EVIDENCE','REGENERATION_PROOF_REQUIRED',input);
    if(candidate.source_digest&&candidate.source_digest!==regeneration.source_digest) return decision('INSUFFICIENT_EVIDENCE','REGENERATION_SOURCE_DIGEST_MISMATCH',input);
    return decision('RECLAIM_ELIGIBLE','REBUILDABLE_PROVEN',input,{regeneration_ref:regeneration.recipe_ref});
  }
  if(classification==='S3_EPHEMERAL'){
    if(candidate.authoritative===true||candidate.current_runtime_required===true) return decision('SOVEREIGN_LOCK','AUTHORITATIVE_TARGET_CONFLICT',input);
    return decision('RECLAIM_ELIGIBLE','SAFE_EPHEMERAL',input);
  }
  return decision('INSUFFICIENT_EVIDENCE','UNKNOWN_CLASSIFICATION',input);
}

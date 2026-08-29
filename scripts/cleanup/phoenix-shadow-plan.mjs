import crypto from 'node:crypto';

const TRUSTED_CONTEXTS = new WeakSet();
const TRUSTED_PLANS = new WeakMap();
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function targetDigest(obj){return obj?.sha256 ?? obj?.digest ?? obj?.content_digest ?? null;}
function badTargetId(id){return typeof id!=='string'||id.length===0||/[?*\[\]]/.test(id);}

export function createTrustedShadowContext(input={}){
  if(!input.policyDigest||!input.ownerDecisionDigest||!input.environmentIdentity) throw new Error('TRUST_CONTEXT_IDENTITY_REQUIRED');
  const ctx=Object.freeze({
    policyDigest:input.policyDigest,
    ownerDecisionDigest:input.ownerDecisionDigest,
    environmentIdentity:input.environmentIdentity,
    maxAgeMs:Number.isFinite(input.maxAgeMs)?input.maxAgeMs:300000
  });
  TRUSTED_CONTEXTS.add(ctx);
  return ctx;
}

export function createShadowPlan(trustedContext, manifest, porDecisions, now=new Date()){
  if(!TRUSTED_CONTEXTS.has(trustedContext)) throw new Error('UNTRUSTED_SHADOW_CONTEXT');
  if(!manifest?.manifest_digest||manifest.environment_identity!==trustedContext.environmentIdentity) throw new Error('MANIFEST_CONTEXT_MISMATCH');
  if(manifest.policy_identity?.policy_sha256!==trustedContext.policyDigest||manifest.policy_identity?.owner_decision_sha256!==trustedContext.ownerDecisionDigest) throw new Error('AUTHORITY_DIGEST_MISMATCH');
  const eligible=new Map((porDecisions??[]).filter(d=>d?.state==='RECLAIM_ELIGIBLE'&&d.requires_aion_disposal_gate===true).map(d=>[d.candidate_id,d]));
  const targets=[];
  for(const obj of manifest.objects??[]){
    const por=eligible.get(obj.id);
    if(!por) continue;
    const digest=targetDigest(obj);
    if(!digest) throw new Error(`TARGET_DIGEST_REQUIRED:${obj.id}`);
    targets.push(Object.freeze({id:obj.id,path:obj.path??null,digest,por_digest:por.por_digest,expected_effect:por.expected_effect??'DISPOSE_OBJECT',regeneration_ref:por.regeneration_ref??null}));
  }
  targets.sort((a,b)=>a.id.localeCompare(b.id));
  const issued=new Date(now).getTime();
  if(!Number.isFinite(issued)) throw new Error('INVALID_SHADOW_TIME');
  const body={schema_version:'TIGER-PHOENIX-SHADOW-PLAN-1',environment_identity:trustedContext.environmentIdentity,manifest_digest:manifest.manifest_digest,policy_digest:trustedContext.policyDigest,owner_decision_digest:trustedContext.ownerDecisionDigest,issued_at:new Date(issued).toISOString(),expires_at:new Date(issued+trustedContext.maxAgeMs).toISOString(),targets,protected_exclusions:[...(manifest.protected_namespaces??[])].sort()};
  const view=Object.freeze({...body,shadow_plan_digest:hash(body)});
  TRUSTED_PLANS.set(view,Object.freeze({context:trustedContext,targetMap:new Map(targets.map(t=>[t.id,t]))}));
  return view;
}

export function consumeShadowTarget(trustedPlanContext,currentObservation,targetId,now=new Date()){
  const internal=TRUSTED_PLANS.get(trustedPlanContext);
  if(!internal) return Object.freeze({state:'UNTRUSTED_PLAN_BLOCKED'});
  if(badTargetId(targetId)) return Object.freeze({state:'TARGET_ID_BLOCKED'});
  const target=internal.targetMap.get(targetId);
  if(!target) return Object.freeze({state:'UNITEMIZED_TARGET_BLOCKED'});
  const at=new Date(now).getTime();
  if(!Number.isFinite(at)||at>new Date(trustedPlanContext.expires_at).getTime()) return Object.freeze({state:'STALE_PLAN_BLOCKED'});
  if(currentObservation?.environment_identity!==trustedPlanContext.environment_identity) return Object.freeze({state:'ENVIRONMENT_DRIFT_BLOCKED'});
  if(currentObservation?.manifest_digest!==trustedPlanContext.manifest_digest) return Object.freeze({state:'MANIFEST_DRIFT_BLOCKED'});
  if(currentObservation?.policy_identity?.policy_sha256!==trustedPlanContext.policy_digest||currentObservation?.policy_identity?.owner_decision_sha256!==trustedPlanContext.owner_decision_digest) return Object.freeze({state:'AUTHORITY_DRIFT_BLOCKED'});
  const exact=(currentObservation.objects??[]).find(o=>o.id===targetId);
  if(!exact){
    const replacement=(currentObservation.objects??[]).find(o=>target.path&&o.path===target.path);
    return Object.freeze({state:replacement?'TARGET_DRIFT_BLOCKED':'TARGET_MISSING_BLOCKED'});
  }
  if(targetDigest(exact)!==target.digest||exact.path!==target.path) return Object.freeze({state:'TARGET_DRIFT_BLOCKED'});
  const leaseBody={schema_version:'TIGER-PHOENIX-TRUSTED-TARGET-LEASE-1',target_id:target.id,target_path:target.path,target_digest:target.digest,shadow_plan_digest:trustedPlanContext.shadow_plan_digest,por_digest:target.por_digest,environment_identity:trustedPlanContext.environment_identity,issued_at:new Date(at).toISOString(),expires_at:trustedPlanContext.expires_at,requires_aion_disposal_gate:true};
  return Object.freeze({...leaseBody,state:'TRUSTED_TARGET_LEASE',lease_digest:hash(leaseBody)});
}

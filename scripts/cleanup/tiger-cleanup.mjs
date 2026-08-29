import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCleanupPolicy, classifyCandidate } from './phoenix-policy.mjs';
import { observeLocalPlanes } from './phoenix-observer.mjs';
import { buildManifest, sha256Canonical } from './phoenix-manifest.mjs';
import { proveReclamation } from './proof-of-reclamation.mjs';
import { createTrustedShadowContext, createShadowPlan, consumeShadowTarget } from './phoenix-shadow-plan.mjs';
import { executeAionDisposal } from './phoenix-aion-disposal.mjs';
import { verifyCleanup } from './phoenix-verify.mjs';
import { createCleanupPassport } from './phoenix-passport.mjs';

function normalizeMode(mode){
  if(mode==='full-safe'||mode==='scoped') return mode;
  throw new Error(`CLEANUP_MODE_INVALID:${mode}`);
}
function valueFor(mapping,id){
  if(mapping instanceof Map) return mapping.get(id) ?? null;
  return mapping?.[id] ?? null;
}
function mergeCoverage(base, addition){
  const map=new Map((base??[]).map(x=>[x.plane,{...x}]));
  if(addition?.plane) map.set(addition.plane,{plane:addition.plane,state:addition.state});
  return [...map.values()].sort((a,b)=>String(a.plane).localeCompare(String(b.plane)));
}
async function collectObservation(observe, remoteAdapters){
  const local=await observe();
  if(!local?.environment_identity||!local?.observed_at) throw new Error('CLEANUP_OBSERVATION_INVALID');
  const objects=[...(local.objects??[])].map(x=>({...x}));
  let planeCoverage=[...(local.plane_coverage??[])].map(x=>({...x}));
  for(const adapter of remoteAdapters??[]){
    if(!adapter||typeof adapter.observe!=='function') throw new Error('CLEANUP_REMOTE_ADAPTER_INVALID');
    const result=await adapter.observe();
    if(!result?.plane||!result?.state) throw new Error('CLEANUP_REMOTE_OBSERVATION_INVALID');
    planeCoverage=mergeCoverage(planeCoverage,result);
    for(const object of result.objects??[]) objects.push({...object,remote_plane:result.plane});
  }
  const ids=new Set();
  for(const object of objects){if(!object?.id||ids.has(object.id)) throw new Error(`CLEANUP_OBJECT_ID_INVALID_OR_DUPLICATE:${object?.id??''}`);ids.add(object.id);}
  return {...local,objects:objects.sort((a,b)=>String(a.id).localeCompare(String(b.id))),plane_coverage:planeCoverage};
}
function protectedLockRefs(decisions){
  return decisions.filter(d=>d.state!=='RECLAIM_ELIGIBLE').map(d=>`${d.state}:${d.candidate_id}`).sort();
}
function policyIdentity(policy, protectedNamespaces){
  const owner=policy.verified_owner_decision_sha256 ?? policy.owner_decision_sha256;
  if(!policy.policy_sha256||!owner) throw new Error('CLEANUP_POLICY_IDENTITY_INCOMPLETE');
  return {policy_sha256:policy.policy_sha256,owner_decision_sha256:owner,protected_namespaces:[...(protectedNamespaces??[])]};
}

export async function runTigerCleanup(options={}){
  const root=path.resolve(options.root??process.cwd());
  const mode=normalizeMode(options.mode??'full-safe');
  const policy=options.policy??loadCleanupPolicy(options.policyPath??path.join(root,'project-control/cleanup/phoenix-cleanroom-policy.v1.json'),{repoRoot:root});
  const identity=policyIdentity(policy,options.protectedNamespaces);
  const observe=options.observe??(()=>observeLocalPlanes({root}));
  const remoteAdapters=options.remoteAdapters??[];
  const now=options.now instanceof Date?options.now:new Date(options.now??Date.now());
  if(Number.isNaN(now.getTime())) throw new Error('CLEANUP_TIME_INVALID');

  const beforeObservation=await collectObservation(observe,remoteAdapters);
  const beforeManifest=buildManifest(beforeObservation,identity);
  const classifications=[];const porDecisions=[];
  for(const object of beforeManifest.objects){
    const classification=classifyCandidate(object,policy);
    classifications.push(Object.freeze({candidate_id:object.id,...classification}));
    porDecisions.push(proveReclamation({
      candidate:object,
      classification:classification.classification,
      observationDigest:beforeManifest.manifest_digest,
      policyDigest:policy.policy_sha256,
      dependencies:valueFor(options.dependenciesById,object.id)??[],
      regeneration:valueFor(options.regenerationById,object.id),
      retention:valueFor(options.retentionById,object.id)
    }));
  }
  const porRoot=sha256Canonical(porDecisions);
  const trustedContext=createTrustedShadowContext({policyDigest:policy.policy_sha256,ownerDecisionDigest:identity.owner_decision_sha256,environmentIdentity:beforeManifest.environment_identity,maxAgeMs:options.shadowMaxAgeMs??300000});
  const shadowPlan=createShadowPlan(trustedContext,beforeManifest,porDecisions,now);
  const leases=[];
  for(const target of shadowPlan.targets){
    const lease=consumeShadowTarget(shadowPlan,beforeManifest,target.id,now);
    if(lease.state!=='TRUSTED_TARGET_LEASE') throw new Error(`CLEANUP_TARGET_LEASE_BLOCKED:${target.id}:${lease.state}`);
    leases.push(lease);
  }

  if(leases.length>0&&(!options.authorization||!options.rollbackPlanRef||typeof options.disposeExecutor!=='function')) throw new Error('CLEANUP_DESTRUCTIVE_AUTHORITY_REQUIRED');
  const aionResults=[];
  for(const lease of leases){
    aionResults.push(await executeAionDisposal({lease,authorization:options.authorization,rollbackPlanRef:options.rollbackPlanRef,executor:options.disposeExecutor,owner:options.owner??'TIGER_PHOENIX_CLEANROOM',now}));
  }
  const aionCertificates=aionResults.map(x=>x.certificate);
  const afterObservation=await collectObservation(observe,remoteAdapters);
  const afterManifest=buildManifest(afterObservation,identity);
  const verification=verifyCleanup(beforeManifest,shadowPlan.targets,afterManifest,aionCertificates);
  const passport=createCleanupPassport({scope:mode,beforeManifest,afterManifest,shadowPlanDigest:shadowPlan.shadow_plan_digest,porRoot,aionCertificates,verification,protectedLocks:protectedLockRefs(porDecisions)});
  return Object.freeze({
    schema_version:'TIGER-PHOENIX-CLEANUP-RUN-1',mode,policy_identity:identity,
    before_manifest:beforeManifest,classifications,por_decisions:porDecisions,por_root:porRoot,
    shadow_plan:shadowPlan,aion_certificates:aionCertificates,after_manifest:afterManifest,verification,passport,
    report:Object.freeze({targets_planned:shadowPlan.targets.length,targets_disposed:aionCertificates.length,protected_lock_count:passport.protected_locks.length,blocked_planes:passport.blocked_planes,final_status:passport.final_status})
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const mode=arg('--mode')??'full-safe';
  try{
    const result=await runTigerCleanup({mode});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    process.exit(result.passport.final_status==='FAILED_VERIFICATION'?1:result.passport.final_status==='GREEN_FULL_SCOPE'||result.passport.final_status==='GREEN_SCOPED'?0:2);
  }catch(error){console.error(error?.stack??String(error));process.exit(1);}
}

function objectDigest(o){return o?.sha256??o?.digest??o?.content_digest??null;}
function mapById(objects){return new Map((objects??[]).map(o=>[o.id,o]));}
function targetIds(targetSet){return new Set((targetSet??[]).map(t=>typeof t==='string'?t:t?.id??t?.target_id).filter(Boolean));}
function isProtected(obj,namespaces){const p=String(obj?.path??'');return (namespaces??[]).some(ns=>p===ns||p.startsWith(`${ns}/`));}

export function verifyCleanup(beforeManifest,targetSet,afterManifest,aionCertificates=[]){
  if(!beforeManifest?.manifest_digest||!afterManifest?.manifest_digest) throw new Error('VERIFY_MANIFESTS_REQUIRED');
  if(beforeManifest.environment_identity!==afterManifest.environment_identity) return Object.freeze({status:'FAILED_VERIFICATION',reason:'ENVIRONMENT_IDENTITY_MISMATCH'});
  const before=mapById(beforeManifest.objects), after=mapById(afterManifest.objects), intended=targetIds(targetSet);
  const actualDeleted=[...before.keys()].filter(id=>!after.has(id)).sort();
  const unexpectedDeleted=actualDeleted.filter(id=>!intended.has(id));
  const intendedNotDeleted=[...intended].filter(id=>before.has(id)&&after.has(id)).sort();
  const changedNonTargets=[]; const protectedChanges=[];
  for(const [id,b] of before){const a=after.get(id);if(!a)continue;const changed=objectDigest(a)!==objectDigest(b)||a.path!==b.path;if(changed&&!intended.has(id))changedNonTargets.push(id);if(changed&&isProtected(b,beforeManifest.protected_namespaces))protectedChanges.push(id);}
  for(const id of actualDeleted){const b=before.get(id);if(isProtected(b,beforeManifest.protected_namespaces))protectedChanges.push(id);}
  const certAssets=new Set((aionCertificates??[]).filter(c=>c?.schema_version==='TIGER-AION-DISPOSAL-CERTIFICATE-1').map(c=>c.asset_id));
  const missingCertificates=actualDeleted.filter(id=>intended.has(id)&&!certAssets.has(id));
  const coverage=[...(afterManifest.plane_coverage??[])];
  const blockedPlanes=coverage.filter(p=>['UNAVAILABLE','BLOCKED_CAPABILITY'].includes(p.state)).map(p=>p.plane).sort();
  const ok=unexpectedDeleted.length===0&&intendedNotDeleted.length===0&&changedNonTargets.length===0&&protectedChanges.length===0&&missingCertificates.length===0;
  return Object.freeze({
    status:ok?'VERIFIED':'FAILED_VERIFICATION',
    before_manifest_digest:beforeManifest.manifest_digest,after_manifest_digest:afterManifest.manifest_digest,
    intended_objects:[...intended].sort(),actual_deleted_objects:actualDeleted,unexpected_deletions:unexpectedDeleted,
    intended_not_deleted:intendedNotDeleted,changed_non_targets:changedNonTargets.sort(),protected_changes:[...new Set(protectedChanges)].sort(),
    missing_aion_certificates:missingCertificates,blocked_planes:blockedPlanes,coverage_complete:blockedPlanes.length===0
  });
}

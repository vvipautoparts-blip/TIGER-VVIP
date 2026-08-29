import crypto from 'node:crypto';
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function capacity(manifest){const c=manifest?.filesystem?.capacity??{};const i=manifest?.filesystem?.inodes??{};return {free_bytes:c.free_bytes??null,total_bytes:c.total_bytes??null,free_inodes:i.free_inodes??null,total_inodes:i.total_inodes??null};}
export function createCleanupPassport(input={}){
  const {scope='scoped',beforeManifest,afterManifest,shadowPlanDigest,porRoot,aionCertificates=[],verification,protectedLocks=[]}=input;
  if(!beforeManifest?.manifest_digest||!afterManifest?.manifest_digest||!shadowPlanDigest||!porRoot||!verification) throw new Error('PASSPORT_EVIDENCE_INCOMPLETE');
  let finalStatus;
  if(verification.status!=='VERIFIED') finalStatus='FAILED_VERIFICATION';
  else if(scope==='full-safe'&&!verification.coverage_complete) finalStatus=verification.blocked_planes?.length?'PARTIAL':'BLOCKED';
  else finalStatus=scope==='full-safe'?'GREEN_FULL_SCOPE':'GREEN_SCOPED';
  const body={
    schema_version:'TIGER_CLEANUP_PASSPORT_V1',scope,final_status:finalStatus,
    before_manifest_root:beforeManifest.manifest_digest,after_manifest_root:afterManifest.manifest_digest,
    shadow_plan_evidence_digest:shadowPlanDigest,por_root:porRoot,
    aion_certificate_refs:aionCertificates.map(c=>({asset_id:c.asset_id,content_digest:c.content_digest??null})).sort((a,b)=>String(a.asset_id).localeCompare(String(b.asset_id))),
    coverage_map:[...(afterManifest.plane_coverage??[])].sort((a,b)=>String(a.plane).localeCompare(String(b.plane))),
    capacity_before:capacity(beforeManifest),capacity_after:capacity(afterManifest),
    intended_objects:verification.intended_objects??[],actual_objects:verification.actual_deleted_objects??[],
    protected_locks:[...protectedLocks].sort(),unexpected_deletion_count:(verification.unexpected_deletions??[]).length,
    blocked_planes:verification.blocked_planes??[]
  };
  return Object.freeze({...body,passport_digest:digest(body)});
}

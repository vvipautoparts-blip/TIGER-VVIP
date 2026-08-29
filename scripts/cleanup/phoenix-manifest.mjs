import crypto from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export function canonicalJson(value) { return JSON.stringify(canonical(value)); }
export function sha256Canonical(value) { return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex'); }

export function buildManifest(observation, policyIdentity) {
  if (!observation?.environment_identity || !observation?.observed_at) throw new Error('OBSERVATION_IDENTITY_REQUIRED');
  if (!policyIdentity?.policy_sha256 || !policyIdentity?.owner_decision_sha256) throw new Error('POLICY_IDENTITY_REQUIRED');
  const objects = [...(observation.objects ?? [])].map(o=>({...o})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const plane_coverage = [...(observation.plane_coverage ?? [])].map(p=>({...p})).sort((a,b)=>String(a.plane).localeCompare(String(b.plane)));
  const body = {
    schema_version:'TIGER-PHOENIX-MANIFEST-1',
    environment_identity:observation.environment_identity,
    observed_at:observation.observed_at,
    policy_identity:{policy_sha256:policyIdentity.policy_sha256,owner_decision_sha256:policyIdentity.owner_decision_sha256},
    objects,
    protected_namespaces:[...(policyIdentity.protected_namespaces ?? [])].sort(),
    plane_coverage,
    filesystem:observation.filesystem ?? null,
    git:observation.git ?? null
  };
  return Object.freeze({...body,manifest_digest:sha256Canonical(body)});
}

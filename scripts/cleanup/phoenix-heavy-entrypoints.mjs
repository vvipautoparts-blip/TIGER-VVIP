export const HEAVY_ENTRYPOINTS=Object.freeze([
  Object.freeze({path:'scripts/quality-gate.sh',execution_plane:'persistent_local',operation_class:'quality_gate',guard:'bash scripts/cleanup/phoenix-headroom.sh quality_gate'}),
  Object.freeze({path:'.github/workflows/f05-heif-wasm-build.yml',execution_plane:'hosted_ephemeral',operation_class:'docker_build',exemption:'HOSTED_EPHEMERAL_RUNNER'}),
  Object.freeze({path:'.github/workflows/lc03-supabase-security-rehearsal.yml',execution_plane:'hosted_ephemeral',operation_class:'heavy_rehearsal',exemption:'HOSTED_EPHEMERAL_RUNNER'}),
  Object.freeze({path:'.github/workflows/lc04-production-legacy-rpc-rehearsal.yml',execution_plane:'hosted_ephemeral',operation_class:'heavy_rehearsal',exemption:'HOSTED_EPHEMERAL_RUNNER'}),
  Object.freeze({path:'.github/workflows/lc05-credential-surface-isolation-rehearsal.yml',execution_plane:'hosted_ephemeral',operation_class:'heavy_rehearsal',exemption:'HOSTED_EPHEMERAL_RUNNER'}),
  Object.freeze({path:'.github/workflows/lc06-rls-performance-hardening-rehearsal.yml',execution_plane:'hosted_ephemeral',operation_class:'heavy_rehearsal',exemption:'HOSTED_EPHEMERAL_RUNNER'})
]);
export function validateHeavyEntrypoints(entries=HEAVY_ENTRYPOINTS){const seen=new Set();for(const e of entries){if(!e.path||seen.has(e.path))throw new Error(`HEAVY_ENTRYPOINT_DUPLICATE:${e.path??''}`);seen.add(e.path);if(e.execution_plane==='persistent_local'&&!e.guard)throw new Error(`HEAVY_ENTRYPOINT_GUARD_REQUIRED:${e.path}`);if(e.execution_plane==='hosted_ephemeral'&&!e.exemption)throw new Error(`HEAVY_ENTRYPOINT_EXEMPTION_REQUIRED:${e.path}`);if(!['persistent_local','hosted_ephemeral'].includes(e.execution_plane))throw new Error(`HEAVY_ENTRYPOINT_PLANE_INVALID:${e.path}`);}return true;}

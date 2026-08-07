'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const DATABASE_SPECS = deepFreeze({
  ai_approval_requests: {
    sourcePath: 'supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql',
    truthState: 'VERIFIED_REPOSITORY_CONTRACT',
    purpose: 'Persistent owner-gated AI approval request contract with exact payload/scope binding and one-time lifecycle controls.',
    rls: 'RLS is enabled by the migration; direct browser-role authority is revoked and privileged trust operations remain a trusted server/service-role responsibility. Repository contract does not prove remote apply.',
    fields: [
      { name: 'id', type: 'uuid', purpose: 'Primary approval-request identifier.', security: 'Server-generated identity used for exact request/consumption linkage.' },
      { name: 'owner_subject', type: 'text', purpose: 'Verified owner subject bound to the approval.', security: 'Prevents a receipt/approval from being replayed as another owner.' },
      { name: 'requesting_agent', type: 'text', purpose: 'Approved TIGER AI agent requesting the protected action.', security: 'Constrained to the four canonical agents.' },
      { name: 'action', type: 'text', purpose: 'Protected action requested.', security: 'Database constraint limits the action vocabulary; policy/runtime adds stricter authority semantics.' },
      { name: 'payload_digest', type: 'text', purpose: 'SHA-256 digest of the exact protected action payload.', security: 'Prevents approval reuse after payload mutation.' },
      { name: 'scope_digest', type: 'text', purpose: 'SHA-256 digest of the exact requested scope.', security: 'Prevents scope widening after approval.' },
      { name: 'scope', type: 'jsonb', purpose: 'Structured scope document associated with the request.', security: 'Must be a JSON object and is immutable across the protected approval binding.' },
      { name: 'decision_passport_id', type: 'text', purpose: 'Optional link to a decision passport.', security: 'Supports provenance without granting authority by itself.' },
      { name: 'reason', type: 'text', purpose: 'Human-readable request/decision rationale.', security: 'Context only; never substitutes for owner identity or digests.' },
      { name: 'status', type: 'text', purpose: 'Approval lifecycle state.', security: 'Constrained lifecycle supports pending/approved/rejected/consumed/expired/revoked states.' },
      { name: 'created_at', type: 'timestamptz', purpose: 'Creation timestamp.', security: 'Anchors expiry and audit chronology.' },
      { name: 'expires_at', type: 'timestamptz', purpose: 'Hard approval expiry.', security: 'Must be later than creation and blocks stale authority.' },
      { name: 'approved_at', type: 'timestamptz', purpose: 'Approval timestamp.', security: 'Required when approval state is approved.' },
      { name: 'rejected_at', type: 'timestamptz', purpose: 'Rejection timestamp.', security: 'Preserves negative owner decision history.' },
      { name: 'revoked_at', type: 'timestamptz', purpose: 'Revocation timestamp.', security: 'Supports explicit withdrawal of previously granted approval.' },
      { name: 'consumed_at', type: 'timestamptz', purpose: 'One-time consumption timestamp.', security: 'Supports replay prevention at the persistent trust boundary.' },
      { name: 'updated_at', type: 'timestamptz', purpose: 'Last lifecycle update timestamp.', security: 'Supports ordered transition audit and stale-state detection.' },
    ],
  },
  ai_audit_events: {
    sourcePath: 'supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql',
    truthState: 'VERIFIED_REPOSITORY_CONTRACT',
    purpose: 'Append-oriented AI audit event contract with correlation, authority context and hash-chain fields.',
    rls: 'RLS and privilege revocation isolate browser roles; append-only triggers protect the ledger from mutation. Repository definition is not proof of staging/production application.',
    fields: [
      { name: 'id', type: 'uuid', purpose: 'Primary audit-event identifier.', security: 'Server-generated immutable event identity.' },
      { name: 'correlation_id', type: 'text', purpose: 'End-to-end request/mission correlation identifier.', security: 'Links distributed evidence without exposing secrets.' },
      { name: 'actor_subject', type: 'text', purpose: 'Verified human/service actor subject.', security: 'Binds the event to the authenticated actor boundary.' },
      { name: 'agent_id', type: 'text', purpose: 'TIGER AI agent responsible for the action.', security: 'Supports agent-scope accountability.' },
      { name: 'action', type: 'text', purpose: 'Action evaluated or performed.', security: 'Recorded for forensic and policy review.' },
      { name: 'decision', type: 'text', purpose: 'Policy/runtime decision.', security: 'Constrained to ALLOW, DENY, OWNER_APPROVAL_REQUIRED or ERROR.' },
      { name: 'reason_code', type: 'text', purpose: 'Stable machine-readable decision reason.', security: 'Enables deterministic investigations without relying on free-form prose.' },
      { name: 'country_code', type: 'text', purpose: 'Optional market/country context.', security: 'Supports jurisdiction and isolation review.' },
      { name: 'sector_code', type: 'text', purpose: 'Optional platform-sector context.', security: 'Supports least-scope forensic filtering.' },
      { name: 'resource', type: 'text', purpose: 'Target resource descriptor.', security: 'Supports evidence linkage while remaining bounded/sanitized by runtime policy.' },
      { name: 'tool_id', type: 'text', purpose: 'Optional tool identifier.', security: 'Links tool execution to the audited decision chain.' },
      { name: 'approval_id', type: 'uuid', purpose: 'Optional foreign-key link to the owner approval.', security: 'Delete is restricted, preserving authority provenance.' },
      { name: 'model_id', type: 'text', purpose: 'Optional model identifier.', security: 'Supports model-governance and incident correlation.' },
      { name: 'prompt_version', type: 'text', purpose: 'Optional prompt version.', security: 'Supports prompt-change traceability and regression review.' },
      { name: 'metadata', type: 'jsonb', purpose: 'Bounded structured audit metadata.', security: 'Runtime/database controls reject secret-shaped/unbounded metadata.' },
      { name: 'previous_hash', type: 'text', purpose: 'Previous event hash in the audit chain.', security: 'Supports tamper-evident chain continuity.' },
      { name: 'event_hash', type: 'text', purpose: 'SHA-256 event hash.', security: 'Unique constrained hash prevents silent event replacement under the repository contract.' },
      { name: 'created_at', type: 'timestamptz', purpose: 'Event creation timestamp.', security: 'Provides immutable audit chronology.' },
    ],
  },
});

const API_SPECS = deepFreeze([
  {
    id: 'AI-EDGE-TIGER-SOVEREIGN',
    route: 'SUPABASE_EDGE_FUNCTION:tiger-sovereign-ai',
    truthState: 'VERIFIED_REPOSITORY_CONTRACT',
    sourcePath: 'supabase/functions/tiger-sovereign-ai/index.ts',
    requestFields: ['agentId', 'input', 'correlationId', 'locale'],
    security: 'Server-only/default-off AI boundary with bounded origin, identity verification, server-owned model/prompt configuration and no client-supplied model tools.',
  },
  { id: 'API-V1-AI-EXECUTE', route: '/v1/ai/execute', truthState: 'DESIGNED', sourcePath: null, requestFields: [], security: 'Must wrap the protected server boundary; not represented as deployed until code and runtime evidence exist.' },
  { id: 'API-V1-AI-APPROVAL-REQUESTS', route: '/v1/ai/approval-requests', truthState: 'DESIGNED', sourcePath: null, requestFields: [], security: 'Must bind verified owner identity, exact action/payload/scope digest, nonce/expiry and persistent one-time consumption.' },
  { id: 'API-V1-AI-AUDIT-EVENTS', route: '/v1/ai/audit-events', truthState: 'DESIGNED', sourcePath: null, requestFields: [], security: 'Must expose only authorized/sanitized audit projections and preserve append-only authority boundaries.' },
]);

const UI_SPECS = deepFreeze([
  { id: 'OWNER-CONTROL-PANEL', title: 'Owner Control Panel', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['owner-control.html', 'scripts/ai/vvip-ai-owner-console.js'], components: ['Owner shell', 'TIGER AI owner console mount', 'RTL document direction', 'protected-control integration hooks'] },
  { id: 'TIGER-AI-FOUR-AGENT-WORKSPACE', title: 'Four TIGER AI Agent Workspace', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['scripts/ai/vvip-ai-owner-console.js', 'scripts/ai/vvip-ai-command-center.js'], components: ['general_manager', 'technical_manager', 'financial_analytics_manager', 'user_assistant'] },
  { id: 'PR36-MEDIA-JOURNEY', title: 'PR36 Media Journey', truthState: 'PENDING_MANUAL_ACCEPTANCE', sourcePaths: ['tests/pr36/integration.test.mjs'], components: ['choose', 'read', 'process', 'preview', 'upload', 'storage', 'display'], note: 'Automated media contracts are present; the real-JPG end-to-end manual acceptance remains separate.' },
  { id: 'PERSISTENT-AUDIT-LOG-UI', title: 'Persistent Audit Log UI', truthState: 'DESIGNED', sourcePaths: [], components: ['timeline', 'correlation filter', 'decision filter', 'hash-chain verification view', 'approval linkage'] },
  { id: 'OWNER-BUDGET-KILL-SWITCH-DASHBOARD', title: 'Owner Budget and Kill-Switch Dashboard', truthState: 'DESIGNED', sourcePaths: [], components: ['agent status', 'kill switches', 'budget', 'rate', 'concurrency', 'provider health', 'pending approvals'] },
]);

const SECURITY_OPS_SPECS = deepFreeze([
  { id: 'QUALITY-GATE-CI', kind: 'REPOSITORY_CONTROL', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['.github/workflows/vvip-quality-gate.yml', 'scripts/quality-gate.sh'], requirement: 'Fail-closed automated test/security baseline.' },
  { id: 'AI-ADVERSARIAL-CONTRACTS', kind: 'REPOSITORY_CONTROL', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['tests/ai-sovereign-security-kernel.test.cjs', 'tests/ai-sovereign-security-ops.test.cjs'], requirement: 'Repository-level adversarial/prompt-injection/forged-authority/tool/secret/scope security contracts.' },
  { id: 'LIVE-STAGING-RED-TEAM', kind: 'REAL_EVIDENCE', truthState: 'PENDING_REAL_EVIDENCE', sourcePaths: [], requirement: 'Execute adversarial probes against an approved non-production runtime; repository tests alone are insufficient.' },
  { id: 'K6-LARGE-SCALE-SUITE', kind: 'LOAD_TEST_DESIGN', truthState: 'DESIGNED', sourcePaths: [], requirement: 'Implement bounded ramp/spike/soak/failure scenarios with an approved staging target and reproducible dataset.' },
  { id: 'P95-LATENCY-150MS', kind: 'TARGET', truthState: 'PENDING_MEASUREMENT', sourcePaths: [], requirement: 'Target p95 latency below 150 ms; cannot be labeled achieved until trusted measurement evidence identifies endpoint, load, region, percentile window and result.' },
]);

const OPERATIONS_SPECS = deepFreeze([
  { id: 'BACKUP-RESTORE-CONTRACT', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['tests/p08-steel-shield-backup-rollback.test.cjs'], requirement: 'Repository contains backup/restore/rollback coverage contracts; this does not prove a live drill.' },
  { id: 'BACKUP-RESTORE-DRILL', truthState: 'PENDING_REAL_EVIDENCE', sourcePaths: [], requirement: 'Run isolated backup restore, verify integrity, timestamps, RPO/RTO observations and post-restore probes.' },
  { id: 'ROLLBACK-DRILL', truthState: 'PENDING_REAL_EVIDENCE', sourcePaths: [], requirement: 'Exercise application/database rollback against a release candidate without production mutation.' },
  { id: 'OWNER-TRIPLE-APPROVAL', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['scripts/ai/sovereign-proof-attestation.js'], actions: ['MERGE_RELEASE', 'PROMOTE_DATABASE', 'ACTIVATE_PRODUCTION'], requirement: 'Three distinct protected owner decisions; documentation or AI cannot synthesize them.' },
  { id: 'INCIDENT-RECOVERY-RUNBOOK', truthState: 'VERIFIED_REPOSITORY_CONTRACT', sourcePaths: ['tests/ai-sovereign-security-ops.test.cjs'], requirement: 'Repository security-operations contract enforces contain -> rotate/revoke -> preserve -> investigate -> recover -> verify sequencing.' },
]);

const WORK_PLAN = deepFreeze([
  {
    id: 'DOSSIER-P1-TRUTH-CORE',
    title: 'Documentation Truth Core',
    status: 'IMPLEMENTED_REPOSITORY_SLICE',
    scope: 'Release-bound claim states, repository source facts, stale invalidation, gap derivation, deterministic renderer and field-complete Enterprise registry.',
    exitCriteria: ['All AI-16 contracts green', 'No design/target/manual claim can self-promote to VERIFIED'],
  },
  {
    id: 'DOSSIER-P2-RELEASE-PROVENANCE',
    title: 'Trusted Release Provenance Builder',
    status: 'NEXT',
    scope: 'Derive Release DNA inputs from actual Git/build/migration/policy/prompt/model/tool/RLS/security artifacts rather than accepting caller-supplied component hashes.',
    exitCriteria: ['Exact commit/worktree/artifact relationship proven', 'Build and migration manifests content-addressed', 'Untrusted browser cannot mint provenance'],
  },
  {
    id: 'DOSSIER-P3-TRUSTED-EVIDENCE-COLLECTORS',
    title: 'Trusted Evidence Collectors',
    status: 'PLANNED',
    scope: 'Source-specific collectors for CI, manual QA, staging runtime, measurements, legal review and protected owner decisions.',
    exitCriteria: ['Collector identity/purpose separated', 'Evidence signed/bound to Release DNA', 'Stale/duplicate/replay evidence rejected'],
  },
  {
    id: 'DOSSIER-P4-LOAD-SECURITY-EVIDENCE',
    title: 'Load and Security Evidence Campaign',
    status: 'PLANNED',
    scope: 'k6 ramp/spike/soak/failure suite, latency/error/cost measurements and live staging red-team campaign.',
    exitCriteria: ['Load scripts reviewed', 'Approved non-production target used', 'p50/p95/p99/error/cost evidence signed', 'Prompt-injection and authority red-team evidence recorded'],
  },
  {
    id: 'DOSSIER-P5-UI-MANUAL-ACCEPTANCE',
    title: 'UI and Manual Acceptance Campaign',
    status: 'PLANNED',
    scope: 'PR36 real image, owner AI panel, multi-browser RTL/LTR, mobile, keyboard/focus and accessibility acceptance.',
    exitCriteria: ['Real media E2E evidenced', 'Owner UI evidenced', 'Browser/device matrix evidenced', 'Accessibility findings resolved or explicitly blocked'],
  },
  {
    id: 'DOSSIER-P6-DOCX-PDF-EXPORT',
    title: 'Deterministic DOCX/PDF Export',
    status: 'PLANNED',
    scope: 'Render the same truth registry into professional Word/PDF deliverables without changing claim states or inventing evidence.',
    exitCriteria: ['DOCX and PDF generated from one claim model', 'Release/evidence hashes printed', 'Truth labels preserved', 'Export round-trip visually reviewed'],
  },
  {
    id: 'DOSSIER-P7-STAGING-PROOF-CAMPAIGN',
    title: 'Staging Proof Campaign',
    status: 'PLANNED',
    scope: 'Apply approved non-production migrations, RLS probes, runtime/concurrency, backup/restore, rollback, observability and live AI evidence.',
    exitCriteria: ['Staging gates have real evidence', 'No unresolved P0/P1', 'Rollback/recovery proven', 'BLACKBOX/security review complete'],
  },
  {
    id: 'DOSSIER-P8-PRODUCTION-PASSPORT-CAMPAIGN',
    title: 'Production Passport Campaign',
    status: 'PROTECTED_OWNER_GATE',
    scope: 'Use the exact release candidate evidence to obtain separate owner decisions, production apply/deploy, post-deploy smoke, monitoring and final attested passport.',
    exitCriteria: ['All canonical 45 gates real PASS for one Release DNA', 'Three protected owner decisions independently verified', 'Production sequence and post-deploy evidence complete'],
    requiresOwnerProductionActivation: true,
  },
]);

module.exports = Object.freeze({
  DATABASE_SPECS,
  API_SPECS,
  UI_SPECS,
  SECURITY_OPS_SPECS,
  OPERATIONS_SPECS,
  WORK_PLAN,
});

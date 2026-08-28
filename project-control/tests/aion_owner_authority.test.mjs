import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAuthorityGraph } from '../scripts/validate_authority_graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const readText = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(readText(relative));

const AION_AUTHORITY = 'docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md';
const AION_SPEC = 'docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md';
const AION_PLAN = 'docs/superpowers/plans/2026-08-25-tiger-aion-owner-authority-and-program-plan.md';
const OWNER_ENTRYPOINT = 'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md';
const REGISTRY = 'project-control/authority/authority-registry.v1.json';
const HANDOVER = 'project-control/production-handover/current-authority.v1.json';

const mandatoryAuthorityConcepts = [
  'Self-Futuring',
  'Prospective Memory',
  'TIGER DREAM CYCLE',
  'Twin Swarm',
  'Synthetic Society',
  'Jurisdiction Genome',
  'Digital Metabolism',
  'Digital Entropy Score',
  'Always-Recovering Twin',
  'Immune Memory',
  'Red Swarm vs Blue Swarm',
  'Capability Cells',
  'Agent Immune System',
  'Adaptive Autonomy Credit',
  'Dual Brain',
  'Proof-Carrying Action',
  'Software DNA / Release DNA',
  'Progressive Immune Delivery',
  'Crypto Genome',
  'TIGER Constitution',
  'PERCEIVE → IMAGINE → BRANCH → ATTACK → EXPERIENCE → PROVE → CHOOSE → ACT → VERIFY → REMEMBER',
];

const mandatoryContractCapabilities = [
  'SELF_FUTURING',
  'PROSPECTIVE_MEMORY',
  'DREAM_CYCLE',
  'TWIN_SWARM',
  'SYNTHETIC_SOCIETY',
  'JURISDICTION_GENOME',
  'DIGITAL_METABOLISM',
  'DIGITAL_ENTROPY_SCORE',
  'ALWAYS_RECOVERING_TWIN',
  'IMMUNE_MEMORY',
  'RED_BLUE_SWARM',
  'CAPABILITY_CELLS',
  'AGENT_IMMUNE_SYSTEM',
  'ADAPTIVE_AUTONOMY_CREDIT',
  'DUAL_BRAIN',
  'PROOF_CARRYING_ACTION',
  'SOFTWARE_RELEASE_DNA',
  'UNIFIED_SENSORY_PLANE',
  'PROGRESSIVE_IMMUNE_DELIVERY',
  'CRYPTO_GENOME',
  'TIGER_CONSTITUTION',
];

const verifiedStages = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
const A9_CHECKPOINT = 'ca76f5e1d8dcf60521b0d25545ed0c1c12d015ec';
const RETIRED_ALIAS_PATTERN = /TIGER AEGIS NEXUS|TIGER ORACLE IMMUNE CORE|LEGACY_POST_LAUNCH_CHECKLIST_MODEL/;

test('AION authority, spec, and plan exist without placeholders', () => {
  for (const file of [AION_AUTHORITY, AION_SPEC, AION_PLAN]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
    const text = readText(file);
    assert.doesNotMatch(text, /\b(TBD|TODO|FIXME)\b/i, `${file} contains a placeholder`);
  }
});

test('AION authority preserves every mandatory owner-approved concept without retired aliases', () => {
  const text = readText(AION_AUTHORITY);
  for (const concept of mandatoryAuthorityConcepts) {
    assert.ok(text.includes(concept), `AION authority missing concept: ${concept}`);
  }
  assert.doesNotMatch(text, RETIRED_ALIAS_PATTERN);
  assert.match(text, /ولا تدعي أمانًا بنسبة 100%/);
});

test('authority graph has exactly one CURRENT post-launch authority and resolves its canonical file', () => {
  const registry = readJson(REGISTRY);
  const result = validateAuthorityGraph({ records: registry.records, repositoryRoot: root });
  assert.equal(result.ok, true);
  assert.equal(result.currentByDomain['post-launch-autonomy'], 'authority.post-launch-autonomy.v1');
  const current = registry.records.filter((record) => record.domain === 'post-launch-autonomy' && record.status === 'CURRENT_ONLY');
  assert.equal(current.length, 1);
  assert.equal(current[0].canonical_path, AION_AUTHORITY);
  assert.deepEqual(current[0].protected_boundaries, ['main', 'production', 'owner-constitution', 'unrestricted-agent-mutation']);
});

test('machine handover contract binds all AION fail-closed invariants and the verified A0-A9 branch state', () => {
  const contract = readJson(HANDOVER);
  const aion = contract.post_launch_autonomy;
  assert.equal(aion.mode, 'CURRENT_ONLY');
  assert.equal(aion.authority_id, 'authority.post-launch-autonomy.v1');
  assert.equal(aion.canonical_authority, AION_AUTHORITY);
  assert.equal(aion.design_spec, AION_SPEC);
  assert.equal(aion.program_plan, AION_PLAN);
  assert.deepEqual(aion.core_loop, ['PERCEIVE', 'IMAGINE', 'BRANCH', 'ATTACK', 'EXPERIENCE', 'PROVE', 'CHOOSE', 'ACT', 'VERIFY', 'REMEMBER']);
  assert.deepEqual(aion.mandatory_capabilities, mandatoryContractCapabilities);
  assert.equal(Object.prototype.hasOwnProperty.call(aion, 'retired_non_authoritative_aliases'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(aion, 'fallback_to_retired_aliases'), false);
  assert.doesNotMatch(JSON.stringify(aion), RETIRED_ALIAS_PATTERN);
  assert.equal(aion.fail_closed_invariants.no_evidence_no_action, true);
  assert.equal(aion.fail_closed_invariants.no_policy_no_action, true);
  assert.equal(aion.fail_closed_invariants.no_provenance_no_production, true);
  assert.equal(aion.fail_closed_invariants.no_recovery_path_no_high_risk_autonomous_action, true);
  assert.equal(aion.fail_closed_invariants.no_attested_authorized_capability_no_privileged_action, true);
  assert.equal(aion.fail_closed_invariants.probabilistic_output_grants_authority, false);
  assert.equal(aion.fail_closed_invariants.unrestricted_production_agent_mutation, false);
  assert.equal(aion.fail_closed_invariants.legal_policy_requires_human_approval, true);
  assert.equal(aion.fail_closed_invariants.destructive_cleanup_requires_quarantine_and_evidence, true);
  assert.equal(aion.fail_closed_invariants.backup_green_requires_fresh_restore_proof, true);
  assert.equal(aion.autonomy_levels.L6, 'FORBIDDEN_UNRESTRICTED_PRODUCTION_MUTATION');
  assert.deepEqual(aion.implementation_stages, verifiedStages);
  assert.deepEqual(aion.verified_stages, verifiedStages);
  assert.equal(aion.current_stage, 'A9_CRYPTO_AND_ATTESTED_HIGH_SECURITY_CELLS');
  assert.equal(aion.runtime_implementation_claim, 'BRANCH_A0_TO_A9_VERIFIED_PRODUCTION_NOT_ACTIVATED');
  assert.equal(aion.branch_verification_scope, 'PR_BRANCH_ONLY');
  assert.equal(aion.production_activation_status, 'NOT_AUTHORIZED');
  assert.equal(aion.a9_verified_checkpoint_sha, A9_CHECKPOINT);
  assert.equal(aion.main_or_production_mutation_authorized_by_aion_program, false);
});

test('owner entrypoint exposes current AION branch state without retired aliases or Production activation', () => {
  const owner = readText(OWNER_ENTRYPOINT);
  assert.ok(owner.includes(AION_AUTHORITY), 'owner entrypoint must reference AION authority');
  assert.match(owner, /TIGER AION/);
  assert.match(owner, /post-launch-autonomy|ما بعد الإطلاق/i);
  assert.doesNotMatch(owner, RETIRED_ALIAS_PATTERN);
  assert.match(owner, /BRANCH_A0_TO_A9_VERIFIED/);
  assert.match(owner, /PRODUCTION_NOT_ACTIVATED/);
  assert.ok(owner.includes(A9_CHECKPOINT));
});

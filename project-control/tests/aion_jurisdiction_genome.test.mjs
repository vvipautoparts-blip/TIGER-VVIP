import test from 'node:test';
import assert from 'node:assert/strict';

import {
  JURISDICTION_POLICY_DOMAINS,
  approveJurisdictionPolicy,
  createJurisdictionActivationCandidate,
  createJurisdictionPolicyDraft,
  createJurisdictionTwinResult,
  verifyJurisdictionPolicy,
  verifyJurisdictionPolicyDraft,
  verifyJurisdictionTwinResult,
} from '../aion/jurisdiction-genome.mjs';

const sourceSha = 'b112b2a1b12347827809bcb1eb73920dce49d9a5';

const protectedBoundaries = Object.freeze({
  marketplace_intermediation: 'FORBIDDEN',
  product_service_payment_processing: 'FORBIDDEN',
  tiger_owned_advertising_only: true,
  payment_scope: 'TIGER_AD_CREDITS_ONLY',
});

const baseDraft = (overrides = {}) => ({
  policy_id: 'jurisdiction-jo-001',
  version: 1,
  jurisdiction: 'JO',
  source_ref: 'legal-source:jo:ads-privacy-2026-001',
  source_published_at: '2026-08-20T09:00:00.000+03:00',
  legal_interpretation_ref: 'legal-interpretation:jo:2026-001',
  effective_at: '2026-09-01T00:00:00.000+03:00',
  domains: ['ADVERTISING', 'PRIVACY', 'DATA', 'IDENTITY', 'PAYMENTS'],
  rules: [
    { rule_id: 'jo-ads-disclosure', domain: 'ADVERTISING', decision: 'REQUIRE', control_ref: 'control:ads-disclosure-v1' },
    { rule_id: 'jo-privacy-notice', domain: 'PRIVACY', decision: 'REQUIRE', control_ref: 'control:privacy-notice-v1' },
    { rule_id: 'jo-data-retention', domain: 'DATA', decision: 'HUMAN_REVIEW', control_ref: 'control:data-retention-v1' },
    { rule_id: 'jo-identity-minimum', domain: 'IDENTITY', decision: 'REQUIRE', control_ref: 'control:identity-minimum-v1' },
    { rule_id: 'jo-ad-credit-payment', domain: 'PAYMENTS', decision: 'REQUIRE', control_ref: 'control:ad-credit-payment-v1' },
  ],
  test_refs: ['test:jo-ads', 'test:jo-privacy', 'test:jo-data', 'test:jo-identity', 'test:jo-payments'],
  migration_ref: 'migration:jurisdiction-jo-001',
  rollback_ref: 'rollback:jurisdiction-jo-001',
  exact_source_sha: sourceSha,
  protected_boundaries: protectedBoundaries,
  ...overrides,
});

const baseApproval = (draft, overrides = {}) => ({
  approval_id: 'legal-approval-jo-001',
  approver_type: 'HUMAN_LEGAL',
  approver_ref: 'legal-counsel:jo:001',
  decision: 'APPROVED',
  approved_at: '2026-08-25T15:45:00.000+03:00',
  draft_digest: draft.content_digest,
  source_ref: draft.source_ref,
  evidence_refs: ['legal-evidence:jo:001', 'legal-review:jo:001'],
  ...overrides,
});

const passDomainResults = () => [
  { domain: 'ADVERTISING', decision: 'PASS', evidence_refs: ['twin:jo:ads:pass'] },
  { domain: 'PRIVACY', decision: 'PASS', evidence_refs: ['twin:jo:privacy:pass'] },
  { domain: 'DATA', decision: 'PASS', evidence_refs: ['twin:jo:data:pass'] },
  { domain: 'IDENTITY', decision: 'PASS', evidence_refs: ['twin:jo:identity:pass'] },
  { domain: 'PAYMENTS', decision: 'PASS', evidence_refs: ['twin:jo:payments:pass'] },
];

test('exports exactly the five mandatory Jurisdiction Genome domains', () => {
  assert.deepEqual(JURISDICTION_POLICY_DOMAINS, ['ADVERTISING', 'PRIVACY', 'DATA', 'IDENTITY', 'PAYMENTS']);
});

test('creates a sealed draft that has no legal or runtime authority', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  assert.equal(draft.schema_version, 'TIGER-AION-JURISDICTION-POLICY-DRAFT-1');
  assert.equal(draft.status, 'PENDING_LEGAL_APPROVAL');
  assert.equal(draft.human_legal_approval, false);
  assert.equal(draft.runtime_enforcement, false);
  assert.equal(draft.production_mutation_authorized, false);
  assert.equal(draft.protected_boundaries.payment_scope, 'TIGER_AD_CREDITS_ONLY');
  assert.match(draft.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(draft), true);
  assert.equal(verifyJurisdictionPolicyDraft(draft), true);
});

test('draft fails closed if any mandatory domain is missing or duplicated', () => {
  for (const domains of [
    ['ADVERTISING', 'PRIVACY', 'DATA', 'IDENTITY'],
    ['ADVERTISING', 'PRIVACY', 'DATA', 'IDENTITY', 'PAYMENTS', 'PAYMENTS'],
  ]) {
    assert.throws(
      () => createJurisdictionPolicyDraft(baseDraft({ domains })),
      (error) => error?.code === 'AION_JURISDICTION_DOMAIN_INVALID',
    );
  }
});

test('jurisdiction policy cannot override protected TIGER marketplace, advertising, or payment boundaries', () => {
  const mutations = [
    { ...protectedBoundaries, marketplace_intermediation: 'ALLOWED' },
    { ...protectedBoundaries, product_service_payment_processing: 'ALLOWED' },
    { ...protectedBoundaries, tiger_owned_advertising_only: false },
    { ...protectedBoundaries, payment_scope: 'MARKETPLACE_SETTLEMENT' },
  ];
  for (const protected_boundary_override of mutations) {
    assert.throws(
      () => createJurisdictionPolicyDraft(baseDraft({ protected_boundaries: protected_boundary_override })),
      (error) => error?.code === 'AION_JURISDICTION_PROTECTED_BOUNDARY',
    );
  }
});

test('only an explicit HUMAN_LEGAL approval can promote a draft to LEGAL_APPROVED', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  const policy = approveJurisdictionPolicy({ draft, approval: baseApproval(draft) });
  assert.equal(policy.schema_version, 'TIGER-AION-JURISDICTION-POLICY-1');
  assert.equal(policy.status, 'LEGAL_APPROVED');
  assert.equal(policy.human_legal_approval, true);
  assert.equal(policy.runtime_enforcement, false);
  assert.equal(policy.legal_approval.approver_type, 'HUMAN_LEGAL');
  assert.equal(policy.draft_digest, draft.content_digest);
  assert.equal(verifyJurisdictionPolicy(policy), true);

  for (const approver_type of ['LLM', 'AGENT', 'MODEL', 'AUTO']) {
    assert.throws(
      () => approveJurisdictionPolicy({ draft, approval: baseApproval(draft, { approver_type }) }),
      (error) => error?.code === 'AION_JURISDICTION_HUMAN_LEGAL_REQUIRED',
    );
  }
});

test('approval fails if legal evidence is not bound to the exact draft and legal source', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  assert.throws(
    () => approveJurisdictionPolicy({ draft, approval: baseApproval(draft, { draft_digest: '0'.repeat(64) }) }),
    (error) => error?.code === 'AION_JURISDICTION_APPROVAL_BINDING_INVALID',
  );
  assert.throws(
    () => approveJurisdictionPolicy({ draft, approval: baseApproval(draft, { source_ref: 'legal-source:other' }) }),
    (error) => error?.code === 'AION_JURISDICTION_APPROVAL_BINDING_INVALID',
  );
});

test('Jurisdiction Twin remains simulation-only and passes only when all five domains pass', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  const policy = approveJurisdictionPolicy({ draft, approval: baseApproval(draft) });
  const twin = createJurisdictionTwinResult({
    policy,
    twin_id: 'jurisdiction-twin-jo-001',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults(),
  });
  assert.equal(twin.schema_version, 'TIGER-AION-JURISDICTION-TWIN-RESULT-1');
  assert.equal(twin.fact_class, 'SIMULATION');
  assert.equal(twin.production_fact, false);
  assert.equal(twin.runtime_enforcement, false);
  assert.equal(twin.overall_decision, 'PASS');
  assert.equal(twin.policy_digest, policy.content_digest);
  assert.equal(verifyJurisdictionTwinResult(twin), true);
});

test('Jurisdiction Twin fails closed for missing dimensions and produces HOLD or REJECTED for uncertainty/failure', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  const policy = approveJurisdictionPolicy({ draft, approval: baseApproval(draft) });

  assert.throws(
    () => createJurisdictionTwinResult({
      policy,
      twin_id: 'twin-missing-domain',
      observed_at: '2026-08-25T16:00:00.000+03:00',
      domain_results: passDomainResults().slice(0, 4),
    }),
    (error) => error?.code === 'AION_JURISDICTION_DOMAIN_INVALID',
  );

  const hold = createJurisdictionTwinResult({
    policy,
    twin_id: 'twin-hold',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults().map((item) => item.domain === 'DATA' ? { ...item, decision: 'HOLD' } : item),
  });
  assert.equal(hold.overall_decision, 'HOLD');

  const rejected = createJurisdictionTwinResult({
    policy,
    twin_id: 'twin-rejected',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults().map((item) => item.domain === 'PAYMENTS' ? { ...item, decision: 'FAIL' } : item),
  });
  assert.equal(rejected.overall_decision, 'REJECTED');
});

test('controlled enforcement candidate requires legal approval, exact Twin binding, all-pass result, and reached effective time', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  const policy = approveJurisdictionPolicy({ draft, approval: baseApproval(draft) });
  const twin = createJurisdictionTwinResult({
    policy,
    twin_id: 'jurisdiction-twin-jo-001',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults(),
  });

  assert.throws(
    () => createJurisdictionActivationCandidate({ policy, twin_result: twin, now_ms: Date.parse('2026-08-31T23:59:59.000+03:00') }),
    (error) => error?.code === 'AION_JURISDICTION_NOT_EFFECTIVE',
  );

  const candidate = createJurisdictionActivationCandidate({
    policy,
    twin_result: twin,
    now_ms: Date.parse('2026-09-01T00:00:01.000+03:00'),
  });
  assert.equal(candidate.schema_version, 'TIGER-AION-JURISDICTION-ACTIVATION-CANDIDATE-1');
  assert.equal(candidate.decision, 'ELIGIBLE_FOR_CONTROLLED_ENFORCEMENT');
  assert.equal(candidate.execution_performed, false);
  assert.equal(candidate.runtime_enforcement, false);
  assert.equal(candidate.production_mutation_authorized, false);
  assert.equal(candidate.unrestricted_production_mutation, false);
  assert.equal(candidate.policy_digest, policy.content_digest);
  assert.match(candidate.content_digest, /^[a-f0-9]{64}$/);
});

test('HOLD/REJECTED or tampered Twin evidence cannot create an activation candidate', () => {
  const draft = createJurisdictionPolicyDraft(baseDraft());
  const policy = approveJurisdictionPolicy({ draft, approval: baseApproval(draft) });
  const hold = createJurisdictionTwinResult({
    policy,
    twin_id: 'twin-hold',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults().map((item) => item.domain === 'PRIVACY' ? { ...item, decision: 'HOLD' } : item),
  });
  assert.throws(
    () => createJurisdictionActivationCandidate({ policy, twin_result: hold, now_ms: Date.parse('2026-09-01T00:00:01.000+03:00') }),
    (error) => error?.code === 'AION_JURISDICTION_TWIN_NOT_PASSING',
  );

  const pass = createJurisdictionTwinResult({
    policy,
    twin_id: 'twin-pass',
    observed_at: '2026-08-25T16:00:00.000+03:00',
    domain_results: passDomainResults(),
  });
  const tampered = { ...pass, policy_digest: '0'.repeat(64) };
  assert.throws(
    () => createJurisdictionActivationCandidate({ policy, twin_result: tampered, now_ms: Date.parse('2026-09-01T00:00:01.000+03:00') }),
    (error) => ['AION_JURISDICTION_INTEGRITY_INVALID', 'AION_JURISDICTION_TWIN_BINDING_INVALID'].includes(error?.code),
  );
});

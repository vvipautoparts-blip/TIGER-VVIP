import { createHash } from 'node:crypto';

export const JURISDICTION_POLICY_DOMAINS = Object.freeze([
  'ADVERTISING',
  'PRIVACY',
  'DATA',
  'IDENTITY',
  'PAYMENTS',
]);

const DOMAIN_SET = new Set(JURISDICTION_POLICY_DOMAINS);
const RULE_DECISIONS = new Set(['REQUIRE', 'DENY', 'ALLOW', 'HUMAN_REVIEW']);
const TWIN_DECISIONS = new Set(['PASS', 'FAIL', 'HOLD']);
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const JURISDICTION_PATTERN = /^[A-Z]{2}$/;
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 128;
const MAX_VERSION = 1_000_000;

const PROTECTED_BOUNDARIES = Object.freeze({
  marketplace_intermediation: 'FORBIDDEN',
  product_service_payment_processing: 'FORBIDDEN',
  tiger_owned_advertising_only: true,
  payment_scope: 'TIGER_AD_CREDITS_ONLY',
});

export class AionJurisdictionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionJurisdictionError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionJurisdictionError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_JURISDICTION_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) fail('AION_JURISDICTION_INVALID', `${field} must be ISO-8601 with timezone`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail('AION_JURISDICTION_INVALID', `${field} is invalid`);
  return ms;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key]);
    return output;
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function seal(value) {
  return Object.freeze({ ...value, content_digest: digest(value) });
}

function verifyDigest(record, label) {
  if (typeof record?.content_digest !== 'string' || !SHA256_PATTERN.test(record.content_digest)) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== record.content_digest) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', `${label} content digest does not match its payload`);
  }
}

function requireExactSourceSha(value) {
  if (typeof value !== 'string' || !SHA1_PATTERN.test(value)) {
    fail('AION_JURISDICTION_INVALID', 'exact_source_sha must be an exact 40-character Git SHA');
  }
  return value;
}

function requireJurisdiction(value) {
  if (typeof value !== 'string' || !JURISDICTION_PATTERN.test(value)) {
    fail('AION_JURISDICTION_INVALID', 'jurisdiction must be a two-letter uppercase code');
  }
  return value;
}

function requireVersion(value) {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_VERSION) {
    fail('AION_JURISDICTION_INVALID', 'version must be a positive bounded integer');
  }
  return value;
}

function normalizeUniqueStrings(values, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS || (!allowEmpty && values.length === 0)) {
    fail('AION_JURISDICTION_INVALID', `${field} must be a bounded${allowEmpty ? '' : ' non-empty'} array`);
  }
  const seen = new Set();
  const output = values.map((value, index) => {
    const item = requireString(value, `${field}[${index}]`, MAX_TEXT_LENGTH);
    if (seen.has(item)) fail('AION_JURISDICTION_INVALID', `${field} contains duplicate value: ${item}`);
    seen.add(item);
    return item;
  });
  output.sort();
  return Object.freeze(output);
}

function normalizeDomains(domains) {
  if (!Array.isArray(domains) || domains.length !== JURISDICTION_POLICY_DOMAINS.length) {
    fail('AION_JURISDICTION_DOMAIN_INVALID', 'all five Jurisdiction Genome domains are mandatory');
  }
  const seen = new Set(domains);
  if (seen.size !== JURISDICTION_POLICY_DOMAINS.length) {
    fail('AION_JURISDICTION_DOMAIN_INVALID', 'Jurisdiction Genome domains must be unique');
  }
  for (const domain of JURISDICTION_POLICY_DOMAINS) {
    if (!seen.has(domain)) fail('AION_JURISDICTION_DOMAIN_INVALID', `missing mandatory domain: ${domain}`);
  }
  return Object.freeze([...JURISDICTION_POLICY_DOMAINS]);
}

function normalizeProtectedBoundaries(value) {
  if (!isPlainObject(value)) fail('AION_JURISDICTION_PROTECTED_BOUNDARY', 'protected_boundaries must be explicit');
  for (const [key, expected] of Object.entries(PROTECTED_BOUNDARIES)) {
    if (value[key] !== expected) {
      fail('AION_JURISDICTION_PROTECTED_BOUNDARY', `jurisdiction policy cannot override protected TIGER boundary: ${key}`);
    }
  }
  return Object.freeze({ ...PROTECTED_BOUNDARIES });
}

function normalizeRules(rules, domains) {
  if (!Array.isArray(rules) || rules.length === 0 || rules.length > MAX_LIST_ITEMS) {
    fail('AION_JURISDICTION_INVALID', 'rules must be a bounded non-empty array');
  }
  const declaredDomains = new Set(domains);
  const seenIds = new Set();
  const normalized = rules.map((rule, index) => {
    if (!isPlainObject(rule)) fail('AION_JURISDICTION_INVALID', `rules[${index}] must be a plain object`);
    const ruleId = requireString(rule.rule_id, `rules[${index}].rule_id`);
    if (seenIds.has(ruleId)) fail('AION_JURISDICTION_INVALID', `duplicate rule_id: ${ruleId}`);
    seenIds.add(ruleId);
    if (!declaredDomains.has(rule.domain) || !DOMAIN_SET.has(rule.domain)) {
      fail('AION_JURISDICTION_DOMAIN_INVALID', `rules[${index}].domain is not declared`);
    }
    if (!RULE_DECISIONS.has(rule.decision)) {
      fail('AION_JURISDICTION_INVALID', `rules[${index}].decision is invalid`);
    }
    return Object.freeze({
      rule_id: ruleId,
      domain: rule.domain,
      decision: rule.decision,
      control_ref: requireString(rule.control_ref, `rules[${index}].control_ref`, MAX_TEXT_LENGTH),
    });
  });
  normalized.sort((left, right) => left.rule_id.localeCompare(right.rule_id));
  return Object.freeze(normalized);
}

function ensureDraft(draft) {
  if (!isPlainObject(draft) || draft.schema_version !== 'TIGER-AION-JURISDICTION-POLICY-DRAFT-1') {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'invalid jurisdiction policy draft');
  }
  requireString(draft.policy_id, 'draft.policy_id');
  requireVersion(draft.version);
  requireJurisdiction(draft.jurisdiction);
  requireString(draft.source_ref, 'draft.source_ref', MAX_TEXT_LENGTH);
  parseTimestamp(draft.source_published_at, 'draft.source_published_at');
  requireString(draft.legal_interpretation_ref, 'draft.legal_interpretation_ref', MAX_TEXT_LENGTH);
  parseTimestamp(draft.effective_at, 'draft.effective_at');
  const domains = normalizeDomains(draft.domains);
  normalizeRules(draft.rules, domains);
  normalizeUniqueStrings(draft.test_refs, 'draft.test_refs');
  requireString(draft.migration_ref, 'draft.migration_ref', MAX_TEXT_LENGTH);
  requireString(draft.rollback_ref, 'draft.rollback_ref', MAX_TEXT_LENGTH);
  requireExactSourceSha(draft.exact_source_sha);
  normalizeProtectedBoundaries(draft.protected_boundaries);
  if (
    draft.status !== 'PENDING_LEGAL_APPROVAL'
    || draft.human_legal_approval !== false
    || draft.runtime_enforcement !== false
    || draft.production_mutation_authorized !== false
  ) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'draft cannot carry legal or runtime authority');
  }
  verifyDigest(draft, 'jurisdiction policy draft');
}

function normalizeApproval(approval, draft) {
  if (!isPlainObject(approval)) fail('AION_JURISDICTION_HUMAN_LEGAL_REQUIRED', 'legal approval must be a plain object');
  if (approval.approver_type !== 'HUMAN_LEGAL') {
    fail('AION_JURISDICTION_HUMAN_LEGAL_REQUIRED', 'only HUMAN_LEGAL may approve jurisdiction machine policy');
  }
  if (approval.decision !== 'APPROVED') {
    fail('AION_JURISDICTION_HUMAN_LEGAL_REQUIRED', 'legal approval decision must be APPROVED');
  }
  if (approval.draft_digest !== draft.content_digest || approval.source_ref !== draft.source_ref) {
    fail('AION_JURISDICTION_APPROVAL_BINDING_INVALID', 'legal approval must bind the exact draft and legal source');
  }
  const approvedAt = parseTimestamp(approval.approved_at, 'approval.approved_at');
  if (approvedAt < Date.parse(draft.source_published_at)) {
    fail('AION_JURISDICTION_APPROVAL_BINDING_INVALID', 'legal approval cannot predate the legal source');
  }
  return Object.freeze({
    approval_id: requireString(approval.approval_id, 'approval.approval_id'),
    approver_type: 'HUMAN_LEGAL',
    approver_ref: requireString(approval.approver_ref, 'approval.approver_ref', MAX_TEXT_LENGTH),
    decision: 'APPROVED',
    approved_at: approval.approved_at,
    draft_digest: draft.content_digest,
    source_ref: draft.source_ref,
    evidence_refs: normalizeUniqueStrings(approval.evidence_refs, 'approval.evidence_refs'),
  });
}

function ensurePolicy(policy) {
  if (!isPlainObject(policy) || policy.schema_version !== 'TIGER-AION-JURISDICTION-POLICY-1') {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'invalid legally approved jurisdiction policy');
  }
  requireString(policy.policy_id, 'policy.policy_id');
  requireVersion(policy.version);
  requireJurisdiction(policy.jurisdiction);
  requireString(policy.source_ref, 'policy.source_ref', MAX_TEXT_LENGTH);
  parseTimestamp(policy.source_published_at, 'policy.source_published_at');
  requireString(policy.legal_interpretation_ref, 'policy.legal_interpretation_ref', MAX_TEXT_LENGTH);
  parseTimestamp(policy.effective_at, 'policy.effective_at');
  const domains = normalizeDomains(policy.domains);
  normalizeRules(policy.rules, domains);
  normalizeUniqueStrings(policy.test_refs, 'policy.test_refs');
  requireString(policy.migration_ref, 'policy.migration_ref', MAX_TEXT_LENGTH);
  requireString(policy.rollback_ref, 'policy.rollback_ref', MAX_TEXT_LENGTH);
  requireExactSourceSha(policy.exact_source_sha);
  normalizeProtectedBoundaries(policy.protected_boundaries);
  if (
    policy.status !== 'LEGAL_APPROVED'
    || policy.human_legal_approval !== true
    || policy.runtime_enforcement !== false
    || policy.production_mutation_authorized !== false
  ) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'approved policy has invalid authority state');
  }
  if (!isPlainObject(policy.legal_approval) || policy.legal_approval.approver_type !== 'HUMAN_LEGAL' || policy.legal_approval.decision !== 'APPROVED') {
    fail('AION_JURISDICTION_HUMAN_LEGAL_REQUIRED', 'approved policy lacks HUMAN_LEGAL approval');
  }
  requireString(policy.legal_approval.approval_id, 'policy.legal_approval.approval_id');
  requireString(policy.legal_approval.approver_ref, 'policy.legal_approval.approver_ref', MAX_TEXT_LENGTH);
  parseTimestamp(policy.legal_approval.approved_at, 'policy.legal_approval.approved_at');
  normalizeUniqueStrings(policy.legal_approval.evidence_refs, 'policy.legal_approval.evidence_refs');
  if (policy.legal_approval.source_ref !== policy.source_ref || policy.legal_approval.draft_digest !== policy.draft_digest) {
    fail('AION_JURISDICTION_APPROVAL_BINDING_INVALID', 'approved policy legal approval binding is invalid');
  }
  if (typeof policy.draft_digest !== 'string' || !SHA256_PATTERN.test(policy.draft_digest)) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'approved policy draft digest is invalid');
  }
  verifyDigest(policy, 'approved jurisdiction policy');
}

export function createJurisdictionPolicyDraft(input) {
  if (!isPlainObject(input)) fail('AION_JURISDICTION_INVALID', 'jurisdiction draft input must be a plain object');
  const sourcePublishedAt = parseTimestamp(input.source_published_at, 'source_published_at');
  const effectiveAt = parseTimestamp(input.effective_at, 'effective_at');
  if (effectiveAt <= sourcePublishedAt) {
    fail('AION_JURISDICTION_INVALID', 'policy effective time must follow legal source publication');
  }
  const domains = normalizeDomains(input.domains);

  return seal({
    schema_version: 'TIGER-AION-JURISDICTION-POLICY-DRAFT-1',
    policy_id: requireString(input.policy_id, 'policy_id'),
    version: requireVersion(input.version),
    jurisdiction: requireJurisdiction(input.jurisdiction),
    source_ref: requireString(input.source_ref, 'source_ref', MAX_TEXT_LENGTH),
    source_published_at: input.source_published_at,
    legal_interpretation_ref: requireString(input.legal_interpretation_ref, 'legal_interpretation_ref', MAX_TEXT_LENGTH),
    effective_at: input.effective_at,
    domains,
    rules: normalizeRules(input.rules, domains),
    test_refs: normalizeUniqueStrings(input.test_refs, 'test_refs'),
    migration_ref: requireString(input.migration_ref, 'migration_ref', MAX_TEXT_LENGTH),
    rollback_ref: requireString(input.rollback_ref, 'rollback_ref', MAX_TEXT_LENGTH),
    exact_source_sha: requireExactSourceSha(input.exact_source_sha),
    protected_boundaries: normalizeProtectedBoundaries(input.protected_boundaries),
    status: 'PENDING_LEGAL_APPROVAL',
    human_legal_approval: false,
    runtime_enforcement: false,
    production_mutation_authorized: false,
  });
}

export function verifyJurisdictionPolicyDraft(draft) {
  ensureDraft(draft);
  return true;
}

export function approveJurisdictionPolicy({ draft, approval }) {
  ensureDraft(draft);
  const legalApproval = normalizeApproval(approval, draft);

  return seal({
    schema_version: 'TIGER-AION-JURISDICTION-POLICY-1',
    policy_id: draft.policy_id,
    version: draft.version,
    jurisdiction: draft.jurisdiction,
    source_ref: draft.source_ref,
    source_published_at: draft.source_published_at,
    legal_interpretation_ref: draft.legal_interpretation_ref,
    effective_at: draft.effective_at,
    domains: draft.domains,
    rules: draft.rules,
    test_refs: draft.test_refs,
    migration_ref: draft.migration_ref,
    rollback_ref: draft.rollback_ref,
    exact_source_sha: draft.exact_source_sha,
    protected_boundaries: draft.protected_boundaries,
    status: 'LEGAL_APPROVED',
    human_legal_approval: true,
    runtime_enforcement: false,
    production_mutation_authorized: false,
    draft_digest: draft.content_digest,
    legal_approval: legalApproval,
  });
}

export function verifyJurisdictionPolicy(policy) {
  ensurePolicy(policy);
  return true;
}

function normalizeDomainResults(results) {
  if (!Array.isArray(results) || results.length !== JURISDICTION_POLICY_DOMAINS.length) {
    fail('AION_JURISDICTION_DOMAIN_INVALID', 'Jurisdiction Twin must evaluate all five domains');
  }
  const seen = new Set();
  const byDomain = new Map();
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (!isPlainObject(result) || !DOMAIN_SET.has(result.domain) || seen.has(result.domain)) {
      fail('AION_JURISDICTION_DOMAIN_INVALID', 'Jurisdiction Twin domain results must be unique and complete');
    }
    if (!TWIN_DECISIONS.has(result.decision)) {
      fail('AION_JURISDICTION_INVALID', `domain_results[${index}].decision is invalid`);
    }
    seen.add(result.domain);
    byDomain.set(result.domain, Object.freeze({
      domain: result.domain,
      decision: result.decision,
      evidence_refs: normalizeUniqueStrings(result.evidence_refs, `domain_results[${index}].evidence_refs`),
    }));
  }
  for (const domain of JURISDICTION_POLICY_DOMAINS) {
    if (!seen.has(domain)) fail('AION_JURISDICTION_DOMAIN_INVALID', `missing Jurisdiction Twin domain: ${domain}`);
  }
  return Object.freeze(JURISDICTION_POLICY_DOMAINS.map((domain) => byDomain.get(domain)));
}

function overallTwinDecision(results) {
  if (results.some((result) => result.decision === 'FAIL')) return 'REJECTED';
  if (results.some((result) => result.decision === 'HOLD')) return 'HOLD';
  return 'PASS';
}

function ensureTwinResult(twin) {
  if (!isPlainObject(twin) || twin.schema_version !== 'TIGER-AION-JURISDICTION-TWIN-RESULT-1') {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'invalid Jurisdiction Twin result');
  }
  requireString(twin.twin_id, 'twin.twin_id');
  requireString(twin.policy_id, 'twin.policy_id');
  if (typeof twin.policy_digest !== 'string' || !SHA256_PATTERN.test(twin.policy_digest)) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'Jurisdiction Twin policy digest is invalid');
  }
  parseTimestamp(twin.observed_at, 'twin.observed_at');
  const results = normalizeDomainResults(twin.domain_results);
  if (twin.overall_decision !== overallTwinDecision(results)) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'Jurisdiction Twin overall decision does not match domain evidence');
  }
  if (twin.fact_class !== 'SIMULATION' || twin.production_fact !== false || twin.runtime_enforcement !== false) {
    fail('AION_JURISDICTION_INTEGRITY_INVALID', 'Jurisdiction Twin can never become Production authority');
  }
  verifyDigest(twin, 'Jurisdiction Twin result');
}

export function createJurisdictionTwinResult({ policy, twin_id: twinId, observed_at: observedAt, domain_results: domainResults }) {
  ensurePolicy(policy);
  const observedAtMs = parseTimestamp(observedAt, 'observed_at');
  if (observedAtMs < Date.parse(policy.legal_approval.approved_at)) {
    fail('AION_JURISDICTION_INVALID', 'Jurisdiction Twin cannot predate HUMAN_LEGAL approval');
  }
  const normalizedResults = normalizeDomainResults(domainResults);

  return seal({
    schema_version: 'TIGER-AION-JURISDICTION-TWIN-RESULT-1',
    twin_id: requireString(twinId, 'twin_id'),
    policy_id: policy.policy_id,
    policy_digest: policy.content_digest,
    jurisdiction: policy.jurisdiction,
    observed_at: observedAt,
    fact_class: 'SIMULATION',
    production_fact: false,
    runtime_enforcement: false,
    domain_results: normalizedResults,
    overall_decision: overallTwinDecision(normalizedResults),
  });
}

export function verifyJurisdictionTwinResult(twin) {
  ensureTwinResult(twin);
  return true;
}

export function createJurisdictionActivationCandidate({ policy, twin_result: twinResult, now_ms: nowMs }) {
  ensurePolicy(policy);
  ensureTwinResult(twinResult);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    fail('AION_JURISDICTION_INVALID', 'now_ms must be a finite injected clock value');
  }
  if (twinResult.policy_id !== policy.policy_id || twinResult.policy_digest !== policy.content_digest) {
    fail('AION_JURISDICTION_TWIN_BINDING_INVALID', 'Jurisdiction Twin is not bound to the exact approved policy');
  }
  if (twinResult.overall_decision !== 'PASS') {
    fail('AION_JURISDICTION_TWIN_NOT_PASSING', 'Jurisdiction Twin must PASS all five domains before controlled enforcement candidacy');
  }
  if (nowMs < Date.parse(policy.effective_at)) {
    fail('AION_JURISDICTION_NOT_EFFECTIVE', 'jurisdiction policy effective time has not been reached');
  }
  if (Date.parse(twinResult.observed_at) > nowMs) {
    fail('AION_JURISDICTION_INVALID', 'Jurisdiction Twin evidence cannot come from the future');
  }

  return seal({
    schema_version: 'TIGER-AION-JURISDICTION-ACTIVATION-CANDIDATE-1',
    decision: 'ELIGIBLE_FOR_CONTROLLED_ENFORCEMENT',
    policy_id: policy.policy_id,
    policy_version: policy.version,
    jurisdiction: policy.jurisdiction,
    policy_digest: policy.content_digest,
    twin_digest: twinResult.content_digest,
    exact_source_sha: policy.exact_source_sha,
    migration_ref: policy.migration_ref,
    rollback_ref: policy.rollback_ref,
    human_legal_approval: true,
    evaluated_at_ms: nowMs,
    execution_performed: false,
    runtime_enforcement: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

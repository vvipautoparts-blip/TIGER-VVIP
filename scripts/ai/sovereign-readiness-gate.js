'use strict';

function gate(id, category, evidenceClasses, environments) {
  return Object.freeze({
    id,
    category,
    allowedEvidenceClasses: Object.freeze([...evidenceClasses]),
    allowedEnvironments: Object.freeze([...environments]),
  });
}

const REQUIRED_GATES = Object.freeze([
  gate('AUTOMATED_QUALITY_GATE', 'REPOSITORY', ['AUTOMATED'], ['REPOSITORY']),
  gate('CODEQL', 'REPOSITORY', ['AUTOMATED'], ['REPOSITORY']),
  gate('DEPENDENCY_REVIEW', 'REPOSITORY', ['AUTOMATED'], ['REPOSITORY']),
  gate('PROJECT_CONTROL_INTEGRITY', 'REPOSITORY', ['AUTOMATED'], ['REPOSITORY']),
  gate('SECRET_SCAN', 'REPOSITORY', ['AUTOMATED', 'SECURITY_REVIEW'], ['REPOSITORY']),
  gate('DANGEROUS_SQL', 'REPOSITORY', ['AUTOMATED', 'SECURITY_REVIEW'], ['REPOSITORY']),
  gate('AI_EVALS_CONTRACT', 'REPOSITORY', ['AUTOMATED'], ['REPOSITORY']),

  gate('CORE_PR36_REAL_IMAGE_UPLOAD_MANUAL', 'CORE_MANUAL', ['MANUAL'], ['MANUAL']),
  gate('CORE_STAGING_ACCEPTANCE', 'CORE_STAGING', ['MANUAL', 'OPERATIONAL'], ['STAGING']),
  gate('CORE_PRODUCTION_CONFIG_SECRETS', 'CORE_STAGING', ['SECURITY_REVIEW'], ['STAGING']),
  gate('CORE_DATABASE_MIGRATIONS_RLS_BACKUP', 'CORE_STAGING', ['SECURITY_REVIEW', 'OPERATIONAL'], ['STAGING']),
  gate('CORE_LAUNCH_OPERATIONS', 'CORE_STAGING', ['OPERATIONAL', 'MANUAL'], ['STAGING']),

  gate('MANUAL_OWNER_AI_BROWSER', 'AI_MANUAL', ['MANUAL'], ['MANUAL', 'STAGING']),
  gate('AI_BLACKBOX_REVIEW', 'SECURITY', ['SECURITY_REVIEW'], ['REVIEW']),
  gate('SUPABASE_PREVIEW_APPLY', 'STAGING', ['OPERATIONAL'], ['STAGING']),
  gate('RLS_RUNTIME_PROBES', 'STAGING_SECURITY', ['SECURITY_REVIEW', 'AUTOMATED'], ['STAGING']),
  gate('MODEL_GATEWAY_STAGING_SMOKE', 'STAGING', ['AUTOMATED', 'MANUAL'], ['STAGING']),
  gate('IDENTITY_VERIFIER_STAGING', 'STAGING_SECURITY', ['SECURITY_REVIEW', 'AUTOMATED'], ['STAGING']),
  gate('PROVIDER_CREDENTIALS_STAGING', 'STAGING_SECURITY', ['SECURITY_REVIEW'], ['STAGING']),
  gate('LIVE_EVIDENCE_ADAPTERS_STAGING', 'STAGING', ['AUTOMATED', 'MANUAL'], ['STAGING']),
  gate('SAFE_TOOL_EXECUTORS_STAGING', 'STAGING_SECURITY', ['SECURITY_REVIEW', 'AUTOMATED'], ['STAGING']),
  gate('RATE_BUDGET_KILL_SWITCH_STAGING', 'STAGING_OPERATIONS', ['OPERATIONAL', 'AUTOMATED'], ['STAGING']),
  gate('OBSERVABILITY_ALERTS_STAGING', 'STAGING_OPERATIONS', ['OPERATIONAL'], ['STAGING']),
  gate('LIVE_ADVERSARIAL_EVALS_STAGING', 'STAGING_SECURITY', ['SECURITY_REVIEW', 'AUTOMATED'], ['STAGING']),
  gate('BACKUP_RESTORE_REHEARSAL', 'RECOVERY', ['OPERATIONAL'], ['STAGING']),
  gate('INCIDENT_RUNBOOK_DRILL', 'RECOVERY', ['OPERATIONAL', 'MANUAL'], ['STAGING']),
  gate('ROLLBACK_DRILL', 'RECOVERY', ['OPERATIONAL'], ['STAGING']),

  gate('SECRET_HISTORY_INVENTORY_ROTATION', 'SECURITY_REVIEW', ['SECURITY_REVIEW'], ['REVIEW']),
  gate('PRIVACY_LEGAL_REVIEW', 'LEGAL', ['LEGAL_REVIEW'], ['REVIEW']),
  gate('DATA_RETENTION_REVIEW', 'LEGAL', ['LEGAL_REVIEW'], ['REVIEW']),
  gate('PROVIDER_DATA_PROCESSING_REVIEW', 'LEGAL', ['LEGAL_REVIEW'], ['REVIEW']),
  gate('COUNTRY_ACTIVATION_REVIEW', 'LEGAL', ['LEGAL_REVIEW', 'OWNER_APPROVAL'], ['REVIEW', 'OWNER']),

  gate('MANUAL_MULTI_BROWSER_RTL_LTR', 'MANUAL_ACCEPTANCE', ['MANUAL'], ['STAGING']),
  gate('ACCESSIBILITY_ACCEPTANCE', 'MANUAL_ACCEPTANCE', ['MANUAL', 'AUTOMATED'], ['STAGING']),
  gate('LOAD_LATENCY_ACCEPTANCE', 'PERFORMANCE', ['AUTOMATED', 'MANUAL'], ['STAGING']),

  gate('OWNER_MERGE_APPROVAL', 'OWNER', ['OWNER_APPROVAL'], ['OWNER']),
  gate('OWNER_DB_PROMOTION_APPROVAL', 'OWNER', ['OWNER_APPROVAL'], ['OWNER']),
  gate('OWNER_PRODUCTION_ACTIVATION', 'OWNER', ['OWNER_APPROVAL'], ['OWNER']),

  gate('SUPABASE_PRODUCTION_APPLY', 'PRODUCTION', ['OPERATIONAL'], ['PRODUCTION']),
  gate('AI_GATEWAY_PRODUCTION_DEPLOY', 'PRODUCTION', ['OPERATIONAL'], ['PRODUCTION']),
  gate('LIVE_EVIDENCE_PRODUCTION_SMOKE', 'PRODUCTION', ['OPERATIONAL', 'MANUAL'], ['PRODUCTION']),
  gate('PRODUCTION_POST_DEPLOY_SMOKE', 'PRODUCTION', ['MANUAL', 'OPERATIONAL'], ['PRODUCTION']),
  gate('MONITORING_ALERTS_PRODUCTION_VERIFIED', 'PRODUCTION', ['OPERATIONAL'], ['PRODUCTION']),
  gate('PRODUCTION_BACKUP_VERIFIED', 'PRODUCTION', ['OPERATIONAL'], ['PRODUCTION']),
  gate('COUNTRY_CONFIG_PRODUCTION_VERIFIED', 'PRODUCTION', ['OPERATIONAL', 'LEGAL_REVIEW'], ['PRODUCTION']),
]);

const GATE_MAP = Object.freeze(Object.fromEntries(REQUIRED_GATES.map((item) => [item.id, item])));
const NON_PASS_STATUSES = Object.freeze(new Set(['PENDING', 'DEFERRED', 'ASSUMED', 'SIMULATED', 'FAIL', 'BLOCKED', 'UNKNOWN']));

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function blocker(gateId, reasonCode, details) {
  return freezeDeep({ gate: gateId, reasonCode, ...(details ? { details } : {}) });
}

function parseEvidenceTime(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeEvidence(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const gateId = String(record.gate || '').trim();
  if (!gateId || !GATE_MAP[gateId]) return null;
  return {
    gate: gateId,
    status: String(record.status || '').trim().toUpperCase(),
    evidenceClass: String(record.evidenceClass || '').trim().toUpperCase(),
    environment: String(record.environment || '').trim().toUpperCase(),
    reference: String(record.reference || '').trim(),
    verifiedAt: String(record.verifiedAt || '').trim(),
    fixture: record.fixture === true,
  };
}

function newestEvidenceByGate(records) {
  const latest = new Map();
  for (const raw of Array.isArray(records) ? records : []) {
    const record = normalizeEvidence(raw);
    if (!record) continue;
    const current = latest.get(record.gate);
    const timestamp = parseEvidenceTime(record.verifiedAt);
    const currentTimestamp = current ? parseEvidenceTime(current.verifiedAt) : null;
    if (!current || (timestamp !== null && (currentTimestamp === null || timestamp >= currentTimestamp))) latest.set(record.gate, record);
  }
  return latest;
}

function evidenceAccepted(gateDefinition, evidence) {
  if (!evidence) return blocker(gateDefinition.id, 'EVIDENCE_MISSING');
  if (evidence.fixture || evidence.evidenceClass === 'TEST_FIXTURE' || evidence.environment === 'TEST') {
    return blocker(gateDefinition.id, 'NON_REAL_EVIDENCE');
  }
  if (evidence.status !== 'PASS') {
    const code = NON_PASS_STATUSES.has(evidence.status) ? `STATUS_${evidence.status}` : 'STATUS_NOT_PASS';
    return blocker(gateDefinition.id, code);
  }
  if (!gateDefinition.allowedEvidenceClasses.includes(evidence.evidenceClass)) {
    return blocker(gateDefinition.id, 'EVIDENCE_CLASS_NOT_ACCEPTED');
  }
  if (!gateDefinition.allowedEnvironments.includes(evidence.environment)) {
    return blocker(gateDefinition.id, 'ENVIRONMENT_NOT_ACCEPTED');
  }
  if (!evidence.reference) return blocker(gateDefinition.id, 'REFERENCE_REQUIRED');
  if (parseEvidenceTime(evidence.verifiedAt) === null) return blocker(gateDefinition.id, 'VERIFIED_TIME_INVALID');
  return null;
}

function validateProductionSequence(latest) {
  const orderPairs = [
    ['OWNER_DB_PROMOTION_APPROVAL', 'SUPABASE_PRODUCTION_APPLY'],
    ['OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY'],
    ['OWNER_PRODUCTION_ACTIVATION', 'SUPABASE_PRODUCTION_APPLY'],
    ['OWNER_PRODUCTION_ACTIVATION', 'AI_GATEWAY_PRODUCTION_DEPLOY'],
    ['SUPABASE_PRODUCTION_APPLY', 'PRODUCTION_POST_DEPLOY_SMOKE'],
    ['AI_GATEWAY_PRODUCTION_DEPLOY', 'PRODUCTION_POST_DEPLOY_SMOKE'],
    ['PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED'],
  ];
  const blockers = [];
  for (const [beforeId, afterId] of orderPairs) {
    const before = latest.get(beforeId);
    const after = latest.get(afterId);
    if (!before || !after || before.status !== 'PASS' || after.status !== 'PASS') continue;
    const beforeTime = parseEvidenceTime(before.verifiedAt);
    const afterTime = parseEvidenceTime(after.verifiedAt);
    if (beforeTime !== null && afterTime !== null && afterTime < beforeTime) {
      blockers.push(blocker(afterId, 'PRODUCTION_SEQUENCE_INVALID', `${afterId} must be verified after ${beforeId}`));
    }
  }
  return blockers;
}

function buildPendingEvidenceTemplate(verifiedAt = new Date().toISOString()) {
  const normalizedTime = Number.isFinite(Date.parse(verifiedAt)) ? new Date(verifiedAt).toISOString() : new Date(0).toISOString();
  return REQUIRED_GATES.map((item) => freezeDeep({
    gate: item.id,
    status: 'PENDING',
    evidenceClass: item.allowedEvidenceClasses[0],
    environment: item.allowedEnvironments[0],
    reference: '',
    verifiedAt: normalizedTime,
    fixture: false,
  }));
}

function evaluateReadiness(records, { allowFixtureCompleteness = false } = {}) {
  const latest = newestEvidenceByGate(records);
  const blockers = [];
  let passed = 0;
  let candidatePassed = 0;

  for (const definition of REQUIRED_GATES) {
    const evidence = latest.get(definition.id);
    if (evidence?.status === 'PASS') candidatePassed += 1;
    const failure = evidenceAccepted(definition, evidence);
    if (failure) blockers.push(failure);
    else passed += 1;
  }

  blockers.push(...validateProductionSequence(latest));

  const uniqueBlockers = [];
  const seen = new Set();
  for (const item of blockers) {
    const key = `${item.gate}:${item.reasonCode}:${item.details || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueBlockers.push(item);
  }

  const total = REQUIRED_GATES.length;
  const readinessPercent = Number(((passed / total) * 100).toFixed(2));
  const candidateCompletenessPercent = Number(((candidatePassed / total) * 100).toFixed(2));
  const productionReady = passed === total && uniqueBlockers.length === 0;

  return freezeDeep({
    status: productionReady ? 'TIGER_SOVEREIGN_READINESS_100' : 'TIGER_SOVEREIGN_READINESS_BLOCKED',
    productionReady,
    totalGates: total,
    passedCount: passed,
    blockedCount: total - passed,
    readinessPercent,
    candidateCompletenessPercent: allowFixtureCompleteness ? candidateCompletenessPercent : readinessPercent,
    blockers: uniqueBlockers,
  });
}

module.exports = Object.freeze({
  REQUIRED_GATES,
  evaluateReadiness,
  buildPendingEvidenceTemplate,
});

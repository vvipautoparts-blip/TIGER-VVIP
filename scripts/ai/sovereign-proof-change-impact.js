'use strict';

const COMPONENT_ORDER = Object.freeze([
  'commitSha',
  'frontendBuildHash',
  'backendBuildHash',
  'migrationDigests',
  'aiPolicyHash',
  'promptHash',
  'modelConfigHash',
  'toolRegistryHash',
  'rlsPolicyHash',
  'securityConfigHash',
  'environmentClass',
]);

const REVALIDATION_FIELDS = Object.freeze(['previousReleaseDNA', 'nextReleaseDNA']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value)) fail(code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function migrationMap(releaseDNA) {
  return new Map(releaseDNA.components.migrationDigests.map((entry) => [entry.path, entry.sha256]));
}

function compareMigrations(previousReleaseDNA, nextReleaseDNA) {
  const previous = migrationMap(previousReleaseDNA);
  const next = migrationMap(nextReleaseDNA);
  const added = [];
  const removed = [];
  const changed = [];

  for (const [path, hash] of next.entries()) {
    if (!previous.has(path)) added.push(path);
    else if (previous.get(path) !== hash) changed.push(path);
  }
  for (const path of previous.keys()) {
    if (!next.has(path)) removed.push(path);
  }

  added.sort();
  removed.sort();
  changed.sort();
  return { added, removed, changed };
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].path !== right[index].path || left[index].sha256 !== right[index].sha256) return false;
  }
  return true;
}

function createImpactApi({ REQUIRED_GATES, verifyReleaseDNAIntegrity, deepFreeze }) {
  if (!Array.isArray(REQUIRED_GATES) || REQUIRED_GATES.length !== 45) fail('IMPACT_GATE_CATALOG_INVALID');
  if (typeof verifyReleaseDNAIntegrity !== 'function' || typeof deepFreeze !== 'function') fail('IMPACT_DEPENDENCY_INVALID');

  const gateIds = Object.freeze(REQUIRED_GATES.map((gate) => gate.id));
  const gateIdSet = new Set(gateIds);

  const rules = Object.freeze({
    frontendBuildHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'CODEQL', 'SECRET_SCAN',
      'CORE_PR36_REAL_IMAGE_UPLOAD_MANUAL', 'CORE_STAGING_ACCEPTANCE', 'CORE_LAUNCH_OPERATIONS',
      'MANUAL_OWNER_AI_BROWSER', 'MANUAL_MULTI_BROWSER_RTL_LTR', 'ACCESSIBILITY_ACCEPTANCE',
      'LOAD_LATENCY_ACCEPTANCE', 'OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY',
      'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    backendBuildHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'CODEQL', 'DEPENDENCY_REVIEW', 'SECRET_SCAN', 'AI_EVALS_CONTRACT',
      'CORE_STAGING_ACCEPTANCE', 'CORE_LAUNCH_OPERATIONS', 'AI_BLACKBOX_REVIEW',
      'MODEL_GATEWAY_STAGING_SMOKE', 'IDENTITY_VERIFIER_STAGING', 'LIVE_EVIDENCE_ADAPTERS_STAGING',
      'SAFE_TOOL_EXECUTORS_STAGING', 'RATE_BUDGET_KILL_SWITCH_STAGING', 'OBSERVABILITY_ALERTS_STAGING',
      'LIVE_ADVERSARIAL_EVALS_STAGING', 'INCIDENT_RUNBOOK_DRILL', 'ROLLBACK_DRILL', 'LOAD_LATENCY_ACCEPTANCE',
      'OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY', 'LIVE_EVIDENCE_PRODUCTION_SMOKE',
      'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    migrationDigests: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'DANGEROUS_SQL', 'CORE_STAGING_ACCEPTANCE',
      'CORE_DATABASE_MIGRATIONS_RLS_BACKUP', 'SUPABASE_PREVIEW_APPLY', 'RLS_RUNTIME_PROBES',
      'BACKUP_RESTORE_REHEARSAL', 'ROLLBACK_DRILL', 'AI_BLACKBOX_REVIEW',
      'OWNER_DB_PROMOTION_APPROVAL', 'SUPABASE_PRODUCTION_APPLY', 'PRODUCTION_POST_DEPLOY_SMOKE',
      'PRODUCTION_BACKUP_VERIFIED',
    ]),
    aiPolicyHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'AI_EVALS_CONTRACT', 'MANUAL_OWNER_AI_BROWSER', 'AI_BLACKBOX_REVIEW',
      'MODEL_GATEWAY_STAGING_SMOKE', 'SAFE_TOOL_EXECUTORS_STAGING', 'RATE_BUDGET_KILL_SWITCH_STAGING',
      'LIVE_ADVERSARIAL_EVALS_STAGING', 'INCIDENT_RUNBOOK_DRILL', 'OWNER_MERGE_APPROVAL',
      'AI_GATEWAY_PRODUCTION_DEPLOY', 'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    promptHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'AI_EVALS_CONTRACT', 'MANUAL_OWNER_AI_BROWSER', 'AI_BLACKBOX_REVIEW',
      'MODEL_GATEWAY_STAGING_SMOKE', 'LIVE_ADVERSARIAL_EVALS_STAGING', 'LOAD_LATENCY_ACCEPTANCE',
      'OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY', 'LIVE_EVIDENCE_PRODUCTION_SMOKE',
      'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    modelConfigHash: Object.freeze([
      'AI_EVALS_CONTRACT', 'AI_BLACKBOX_REVIEW', 'MODEL_GATEWAY_STAGING_SMOKE',
      'PROVIDER_CREDENTIALS_STAGING', 'LIVE_ADVERSARIAL_EVALS_STAGING', 'LOAD_LATENCY_ACCEPTANCE',
      'PROVIDER_DATA_PROCESSING_REVIEW', 'OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY',
      'LIVE_EVIDENCE_PRODUCTION_SMOKE', 'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    toolRegistryHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'AI_EVALS_CONTRACT', 'AI_BLACKBOX_REVIEW', 'SAFE_TOOL_EXECUTORS_STAGING',
      'RATE_BUDGET_KILL_SWITCH_STAGING', 'LIVE_ADVERSARIAL_EVALS_STAGING', 'INCIDENT_RUNBOOK_DRILL',
      'OWNER_MERGE_APPROVAL', 'AI_GATEWAY_PRODUCTION_DEPLOY', 'LIVE_EVIDENCE_PRODUCTION_SMOKE',
      'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
    rlsPolicyHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'DANGEROUS_SQL', 'CORE_STAGING_ACCEPTANCE',
      'CORE_DATABASE_MIGRATIONS_RLS_BACKUP', 'AI_BLACKBOX_REVIEW', 'SUPABASE_PREVIEW_APPLY',
      'RLS_RUNTIME_PROBES', 'BACKUP_RESTORE_REHEARSAL', 'ROLLBACK_DRILL',
      'OWNER_DB_PROMOTION_APPROVAL', 'SUPABASE_PRODUCTION_APPLY', 'PRODUCTION_POST_DEPLOY_SMOKE',
      'PRODUCTION_BACKUP_VERIFIED',
    ]),
    securityConfigHash: Object.freeze([
      'AUTOMATED_QUALITY_GATE', 'CODEQL', 'SECRET_SCAN', 'CORE_PRODUCTION_CONFIG_SECRETS',
      'CORE_STAGING_ACCEPTANCE', 'AI_BLACKBOX_REVIEW', 'IDENTITY_VERIFIER_STAGING',
      'PROVIDER_CREDENTIALS_STAGING', 'RATE_BUDGET_KILL_SWITCH_STAGING', 'OBSERVABILITY_ALERTS_STAGING',
      'LIVE_ADVERSARIAL_EVALS_STAGING', 'INCIDENT_RUNBOOK_DRILL', 'SECRET_HISTORY_INVENTORY_ROTATION',
      'OWNER_MERGE_APPROVAL', 'OWNER_PRODUCTION_ACTIVATION', 'AI_GATEWAY_PRODUCTION_DEPLOY',
      'PRODUCTION_POST_DEPLOY_SMOKE', 'MONITORING_ALERTS_PRODUCTION_VERIFIED',
    ]),
  });

  for (const [component, impacted] of Object.entries(rules)) {
    for (const gateId of impacted) {
      if (!gateIdSet.has(gateId)) fail(`IMPACT_RULE_UNKNOWN_GATE:${component}:${gateId}`);
    }
  }

  function assertReleaseDNA(value) {
    if (!verifyReleaseDNAIntegrity(value)) fail('RELEASE_DNA_INTEGRITY_INVALID');
  }

  function compareReleaseDNA(previousReleaseDNA, nextReleaseDNA) {
    assertReleaseDNA(previousReleaseDNA);
    assertReleaseDNA(nextReleaseDNA);

    const changedComponents = [];
    for (const component of COMPONENT_ORDER) {
      if (component === 'migrationDigests') {
        if (!arraysEqual(previousReleaseDNA.components.migrationDigests, nextReleaseDNA.components.migrationDigests)) {
          changedComponents.push(component);
        }
      } else if (previousReleaseDNA.components[component] !== nextReleaseDNA.components[component]) {
        changedComponents.push(component);
      }
    }

    return deepFreeze({
      sameRelease: previousReleaseDNA.digest === nextReleaseDNA.digest,
      previousReleaseDigest: previousReleaseDNA.digest,
      nextReleaseDigest: nextReleaseDNA.digest,
      changedComponents,
      migrationChanges: compareMigrations(previousReleaseDNA, nextReleaseDNA),
    });
  }

  function createRevalidationPlan(input) {
    assertExactKeys(input, REVALIDATION_FIELDS, 'REVALIDATION_INPUT_UNKNOWN_FIELD');
    if (!Object.prototype.hasOwnProperty.call(input, 'previousReleaseDNA') || !Object.prototype.hasOwnProperty.call(input, 'nextReleaseDNA')) {
      fail('REVALIDATION_INPUT_REQUIRED_FIELD');
    }

    const comparison = compareReleaseDNA(input.previousReleaseDNA, input.nextReleaseDNA);
    const affected = new Set();
    const reasonCodes = [];
    let fullRevalidationRequired = false;

    if (comparison.changedComponents.includes('commitSha')) {
      fullRevalidationRequired = true;
      reasonCodes.push('UNCLASSIFIED_COMMIT_DELTA_REQUIRES_FULL_REVALIDATION');
    }
    if (comparison.changedComponents.includes('environmentClass')) {
      fullRevalidationRequired = true;
      reasonCodes.push('ENVIRONMENT_CLASS_CHANGED_REQUIRES_FULL_REVALIDATION');
    }

    if (fullRevalidationRequired) {
      for (const gateId of gateIds) affected.add(gateId);
    } else {
      for (const component of comparison.changedComponents) {
        const impacted = rules[component];
        if (!impacted) {
          for (const gateId of gateIds) affected.add(gateId);
          fullRevalidationRequired = true;
          reasonCodes.push(`UNMAPPED_COMPONENT_${component.toUpperCase()}_REQUIRES_FULL_REVALIDATION`);
          break;
        }
        reasonCodes.push(`COMPONENT_${component.toUpperCase()}_CHANGED`);
        for (const gateId of impacted) affected.add(gateId);
      }
    }

    const affectedGateIds = gateIds.filter((gateId) => affected.has(gateId));
    const unaffectedGateIds = gateIds.filter((gateId) => !affected.has(gateId));

    return deepFreeze({
      schemaVersion: 'TIGER_REVALIDATION_PLAN_V1',
      previousReleaseDigest: comparison.previousReleaseDigest,
      nextReleaseDigest: comparison.nextReleaseDigest,
      changedComponents: comparison.changedComponents,
      migrationChanges: comparison.migrationChanges,
      affectedGateIds,
      unaffectedGateIds,
      reasonCodes,
      fullRevalidationRequired,
      carryForwardAuthorized: false,
      requiresFreshEvidenceCapsules: affectedGateIds.length > 0,
    });
  }

  return Object.freeze({
    compareReleaseDNA,
    createRevalidationPlan,
  });
}

module.exports = createImpactApi;

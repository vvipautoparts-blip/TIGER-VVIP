'use strict';

const DEFAULT_REQUIRED_WORKFLOWS = Object.freeze([
  'VVIP Quality Gate',
  'TIGER CleanGuard',
  'Project Control Integrity',
  'Zero-Residue Full History',
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function freezeVerdict({ ready, reasonCodes, organicMode, sponsoredMode }) {
  return Object.freeze({
    ready,
    state: ready ? 'ROLLOUT_ELIGIBLE' : 'ROLLOUT_BLOCKED',
    reason_codes: Object.freeze([...reasonCodes]),
    organic_mode: organicMode,
    sponsored_mode: sponsoredMode,
  });
}

function invalidEvidence() {
  return freezeVerdict({
    ready: false,
    reasonCodes: ['READINESS_EVIDENCE_INVALID'],
    organicMode: 'BLOCKED',
    sponsoredMode: 'BLOCKED',
  });
}

function hasRequiredEvidence(snapshot, requiredWorkflows) {
  if (!isPlainObject(snapshot)) return false;
  if (!isNonEmptyString(snapshot.expected_head_sha) || !isNonEmptyString(snapshot.observed_head_sha)) return false;
  if (!Array.isArray(snapshot.workflows) || !isPlainObject(snapshot.authority) || !isPlainObject(snapshot.compatibility)) return false;
  if (!Array.isArray(requiredWorkflows) || requiredWorkflows.length === 0 || !requiredWorkflows.every(isNonEmptyString)) return false;

  const authority = snapshot.authority;
  for (const field of [
    'market_genesis_active',
    'living_classified_fabric_active',
    'transaction_capabilities_enabled',
    'pulse_ad_billing_authority_preserved',
    'contact_handoff_enabled',
    'contact_replay_protection_durable',
  ]) {
    if (typeof authority[field] !== 'boolean') return false;
  }

  const compatibility = snapshot.compatibility;
  for (const field of [
    'policy_version',
    'active_policy_version',
    'sector_physics_version',
    'active_sector_physics_version',
    'compiler_projection_version',
    'index_projection_version',
    'cache_projection_version',
  ]) {
    if (!isNonEmptyString(compatibility[field])) return false;
  }
  if (typeof compatibility.organic_path_verified !== 'boolean') return false;
  if (typeof compatibility.pulse_proof_available !== 'boolean') return false;

  for (const workflow of snapshot.workflows) {
    if (!isPlainObject(workflow) || !isNonEmptyString(workflow.name)) return false;
    if (!isNonEmptyString(workflow.status) || !isNonEmptyString(workflow.conclusion)) return false;
  }

  return true;
}

function pushUnique(reasonCodes, code) {
  if (!reasonCodes.includes(code)) reasonCodes.push(code);
}

function workflowsAreGreen(workflows, requiredWorkflows) {
  const byName = new Map(workflows.map((workflow) => [workflow.name, workflow]));
  return requiredWorkflows.every((name) => {
    const workflow = byName.get(name);
    return workflow && workflow.status === 'completed' && workflow.conclusion === 'success';
  });
}

function evaluateMarketGenesisReadiness(snapshot, options = {}) {
  const requiredWorkflows = options.requiredWorkflows || DEFAULT_REQUIRED_WORKFLOWS;
  if (!hasRequiredEvidence(snapshot, requiredWorkflows)) return invalidEvidence();

  const reasonCodes = [];
  const { authority, compatibility } = snapshot;

  if (snapshot.expected_head_sha !== snapshot.observed_head_sha) {
    pushUnique(reasonCodes, 'EXACT_HEAD_MISMATCH');
  }

  if (!workflowsAreGreen(snapshot.workflows, requiredWorkflows)) {
    pushUnique(reasonCodes, 'REQUIRED_WORKFLOW_NOT_GREEN');
  }

  if (compatibility.policy_version !== compatibility.active_policy_version) {
    pushUnique(reasonCodes, 'POLICY_VERSION_MISMATCH');
  }

  if (compatibility.sector_physics_version !== compatibility.active_sector_physics_version) {
    pushUnique(reasonCodes, 'SECTOR_PHYSICS_VERSION_MISMATCH');
  }

  if (
    compatibility.compiler_projection_version !== compatibility.index_projection_version
    || compatibility.compiler_projection_version !== compatibility.cache_projection_version
  ) {
    pushUnique(reasonCodes, 'PROJECTION_VERSION_MISMATCH');
  }

  if (authority.market_genesis_active !== true) {
    pushUnique(reasonCodes, 'MARKET_GENESIS_AUTHORITY_INACTIVE');
  }

  if (authority.living_classified_fabric_active === true) {
    pushUnique(reasonCodes, 'RETIRED_FALLBACK_ACTIVE');
  }

  if (authority.transaction_capabilities_enabled === true) {
    pushUnique(reasonCodes, 'TRANSACTION_BOUNDARY_VIOLATION');
  }

  if (authority.pulse_ad_billing_authority_preserved !== true) {
    pushUnique(reasonCodes, 'PULSE_AUTHORITY_NOT_PRESERVED');
  }

  if (authority.contact_handoff_enabled === true && authority.contact_replay_protection_durable !== true) {
    pushUnique(reasonCodes, 'CONTACT_REPLAY_PROTECTION_NOT_DURABLE');
  }

  let organicMode = compatibility.organic_path_verified ? 'ELIGIBLE' : 'BLOCKED';
  let sponsoredMode = compatibility.pulse_proof_available ? 'ELIGIBLE' : 'SUPPRESSED';

  if (!compatibility.pulse_proof_available && !compatibility.organic_path_verified) {
    pushUnique(reasonCodes, 'NO_SAFE_DISCOVERY_PATH');
  }

  const ready = reasonCodes.length === 0;
  if (!ready && !reasonCodes.includes('NO_SAFE_DISCOVERY_PATH')) {
    organicMode = 'BLOCKED';
    sponsoredMode = compatibility.pulse_proof_available ? 'BLOCKED' : 'SUPPRESSED';
  }

  return freezeVerdict({ ready, reasonCodes, organicMode, sponsoredMode });
}

module.exports = {
  DEFAULT_REQUIRED_WORKFLOWS,
  evaluateMarketGenesisReadiness,
};

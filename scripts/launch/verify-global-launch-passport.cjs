'use strict';

const REQUIRED_GATES = Object.freeze([
  'supplyChainProvenance',
  'securityVerification',
  'redTeamCampaigns',
  'uniqueActors4m',
  'simultaneousActive4m',
  'android20of20',
  'ios20of20',
  'arabic',
  'english',
  'search',
  'hybridMediaHeic',
  'accessibility',
  'restore',
  'failover',
  'shadowLedgerZero',
  'countryGates',
  'pricingProfitability',
  'showcase25k',
  'runtimeVacuum',
  'zeroCriticalHigh',
  'humanReview'
]);

const ALLOWED_GATE_STATUS = new Set([
  'PASS',
  'BLOCKED',
  'IN_PROGRESS',
  'FOUNDATION_EXISTS',
  'NOT_EVIDENCED'
]);

function isHex(value, size) {
  return typeof value === 'string' && new RegExp(`^[0-9a-f]{${size}}$`, 'i').test(value);
}

function evidenceOk(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.trim());
}

function verifyGlobalLaunchPassport(passport, context = {}) {
  const errors = [];
  const blockingGates = [];

  if (!passport || typeof passport !== 'object' || Array.isArray(passport)) {
    return Object.freeze({
      ok: false,
      globalLaunchEligible: false,
      blockingGates: Object.freeze([...REQUIRED_GATES]),
      errors: Object.freeze(['PASSPORT_OBJECT_REQUIRED'])
    });
  }

  if (passport.schemaVersion !== 'TIGER_GLOBAL_LAUNCH_PASSPORT_V1') {
    errors.push('PASSPORT_SCHEMA_INVALID');
  }

  const gates = passport.gates && typeof passport.gates === 'object' && !Array.isArray(passport.gates)
    ? passport.gates
    : {};

  for (const name of REQUIRED_GATES) {
    const gate = gates[name];
    if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
      errors.push(`MISSING_GATE:${name}`);
      blockingGates.push(name);
      continue;
    }
    if (!ALLOWED_GATE_STATUS.has(gate.status)) {
      errors.push(`INVALID_GATE_STATUS:${name}`);
      blockingGates.push(name);
      continue;
    }
    if (gate.status === 'PASS') {
      if (!evidenceOk(gate.evidence)) errors.push(`PASS_GATE_REQUIRES_EVIDENCE:${name}`);
    } else {
      blockingGates.push(name);
    }
  }

  const finance = context.finance || {};
  if (gates.hybridMediaHeic && gates.hybridMediaHeic.status === 'PASS' && context.f05LaunchGatePass !== true) {
    errors.push('HYBRID_MEDIA_PASS_REQUIRES_F05_EVIDENCE_PASS');
  }
  if (gates.showcase25k && gates.showcase25k.status === 'PASS' && context.f08LaunchGatePass !== true) {
    errors.push('SHOWCASE_25K_PASS_REQUIRES_F08_EVIDENCE_PASS');
  }
  if (gates.runtimeVacuum && gates.runtimeVacuum.status === 'PASS' && context.f15LaunchGatePass !== true) {
    errors.push('RUNTIME_VACUUM_PASS_REQUIRES_F15_EVIDENCE_PASS');
  }
  if (gates.shadowLedgerZero && gates.shadowLedgerZero.status === 'PASS') {
    if (finance.distributionExecutionAuthorized !== true || finance.pendingOwnerDecisionPercent !== 0) {
      errors.push('SHADOW_LEDGER_PASS_REQUIRES_EXECUTABLE_FINANCIAL_DISTRIBUTION');
    }
  }

  const release = passport.release && typeof passport.release === 'object' ? passport.release : {};
  const owner = passport.ownerAuthorization && typeof passport.ownerAuthorization === 'object'
    ? passport.ownerAuthorization
    : {};

  const allGatesPass = REQUIRED_GATES.every(name =>
    gates[name] && gates[name].status === 'PASS' && evidenceOk(gates[name].evidence)
  );
  const releaseReady = release.frozen === true &&
    isHex(release.sha, 40) &&
    isHex(release.artifactSha256, 64);
  const ownerReady = owner.status === 'PASS' &&
    owner.exactReleaseSha === release.sha &&
    owner.artifactSha256 === release.artifactSha256 &&
    evidenceOk(owner.evidence);

  if (release.frozen === true && context.currentHeadSha && release.sha !== context.currentHeadSha) {
    errors.push('PASSPORT_RELEASE_SHA_MUST_MATCH_CURRENT_HEAD');
  }

  const computedEligible = allGatesPass &&
    releaseReady &&
    ownerReady &&
    finance.distributionExecutionAuthorized === true &&
    finance.pendingOwnerDecisionPercent === 0;

  if (passport.globalLaunchEligible === true && !computedEligible) {
    errors.push('GLOBAL_LAUNCH_ELIGIBLE_REQUIRES_ALL_GATES_PASS');
  }
  if (computedEligible && passport.globalLaunchEligible !== true) {
    errors.push('GLOBAL_LAUNCH_FLAG_MUST_MATCH_EVIDENCE');
  }

  return Object.freeze({
    ok: errors.length === 0,
    globalLaunchEligible: passport.globalLaunchEligible === true && computedEligible && errors.length === 0,
    blockingGates: Object.freeze([...new Set(blockingGates)]),
    errors: Object.freeze(errors)
  });
}

module.exports = Object.freeze({
  REQUIRED_GATES,
  verifyGlobalLaunchPassport
});

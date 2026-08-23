'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../tsrf/evidence/contracts.cjs');

const SOURCE_READINESS_SCHEMA = 'TIGER_MARKET_GENESIS_SOURCE_READINESS_V1';
const SOURCE_READINESS_STATE = 'SOURCE_VERIFIED';
const SOURCE_CONTRACT_VERSION = 'market-genesis-source-contract-v1';
const REVIEWED_REPLAY_MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

const TOP_LEVEL_KEYS = Object.freeze([
  'authority',
  'deployed_durable_verified',
  'reviewed_replay_migration_sha256',
  'schema',
  'source_contract',
  'source_sha',
  'source_tree',
  'state',
]);
const AUTHORITY_KEYS = Object.freeze([
  'contact_replay_protection_durable',
  'living_classified_fabric_active',
  'market_genesis_active',
  'pulse_ad_billing_authority_preserved',
  'transaction_capabilities_enabled',
]);
const SOURCE_CONTRACT_KEYS = Object.freeze([
  'contract_version',
  'no_transaction',
  'release_evidence_required_for_contact',
  'retired_fallback_forbidden',
  'whole_vehicle_ads_forbidden',
]);

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expectedKeys.length
    && actual.every((key, index) => key === expectedKeys[index]);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function verdict(ok, reasonCode) {
  return Object.freeze({ ok, reason_code: reasonCode });
}

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isByteSequence(value) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function migrationDigest(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

function structurallyValid(evidence) {
  if (!hasExactKeys(evidence, TOP_LEVEL_KEYS)) return false;
  if (!hasExactKeys(evidence.authority, AUTHORITY_KEYS)) return false;
  if (!hasExactKeys(evidence.source_contract, SOURCE_CONTRACT_KEYS)) return false;
  if (typeof evidence.schema !== 'string') return false;
  if (!SHA40_RE.test(evidence.source_sha)) return false;
  if (!SHA40_RE.test(evidence.source_tree)) return false;
  if (typeof evidence.state !== 'string') return false;
  if (typeof evidence.deployed_durable_verified !== 'boolean') return false;
  if (!SHA256_RE.test(evidence.reviewed_replay_migration_sha256)) return false;

  for (const key of AUTHORITY_KEYS) {
    if (typeof evidence.authority[key] !== 'boolean') return false;
  }
  if (typeof evidence.source_contract.contract_version !== 'string') return false;
  for (const key of SOURCE_CONTRACT_KEYS) {
    if (key !== 'contract_version' && typeof evidence.source_contract[key] !== 'boolean') return false;
  }
  return true;
}

function sourceContractMatches(evidence) {
  return evidence.schema === SOURCE_READINESS_SCHEMA
    && evidence.state === SOURCE_READINESS_STATE
    && evidence.authority.market_genesis_active === true
    && evidence.authority.living_classified_fabric_active === false
    && evidence.authority.transaction_capabilities_enabled === false
    && evidence.authority.pulse_ad_billing_authority_preserved === true
    && evidence.authority.contact_replay_protection_durable === true
    && evidence.source_contract.contract_version === SOURCE_CONTRACT_VERSION
    && evidence.source_contract.whole_vehicle_ads_forbidden === true
    && evidence.source_contract.no_transaction === true
    && evidence.source_contract.release_evidence_required_for_contact === true
    && evidence.source_contract.retired_fallback_forbidden === true;
}

function validateMarketSourceReadinessEvidence(
  evidence,
  { expectedSourceSha, expectedSourceTree } = {},
) {
  if (evidence === undefined || evidence === null) {
    return verdict(false, 'MARKET_SOURCE_READINESS_MISSING');
  }
  if (!structurallyValid(evidence)) {
    return verdict(false, 'MARKET_SOURCE_READINESS_INVALID');
  }
  if (evidence.deployed_durable_verified === true) {
    return verdict(false, 'MARKET_DEPLOYED_DURABLE_SOURCE_CLAIM_FORBIDDEN');
  }
  if (evidence.reviewed_replay_migration_sha256 !== REVIEWED_REPLAY_MIGRATION_SHA256) {
    return verdict(false, 'MARKET_REPLAY_MIGRATION_DIGEST_MISMATCH');
  }
  if (expectedSourceSha !== undefined) {
    if (!SHA40_RE.test(expectedSourceSha)) {
      return verdict(false, 'MARKET_SOURCE_READINESS_INVALID');
    }
    if (evidence.source_sha !== expectedSourceSha) {
      return verdict(false, 'MARKET_SOURCE_SHA_MISMATCH');
    }
  }
  if (expectedSourceTree !== undefined) {
    if (!SHA40_RE.test(expectedSourceTree)) {
      return verdict(false, 'MARKET_SOURCE_READINESS_INVALID');
    }
    if (evidence.source_tree !== expectedSourceTree) {
      return verdict(false, 'MARKET_SOURCE_TREE_MISMATCH');
    }
  }
  if (!sourceContractMatches(evidence)) {
    return verdict(false, 'MARKET_SOURCE_CONTRACT_MISMATCH');
  }
  return verdict(true, 'MARKET_SOURCE_READINESS_VERIFIED');
}

function createMarketSourceReadinessEvidence({ sourceSha, sourceTree, replayMigrationBytes } = {}) {
  if (!SHA40_RE.test(sourceSha || '') || !SHA40_RE.test(sourceTree || '') || !isByteSequence(replayMigrationBytes)) {
    throw codedError('MARKET_SOURCE_READINESS_INVALID');
  }
  if (migrationDigest(replayMigrationBytes) !== REVIEWED_REPLAY_MIGRATION_SHA256) {
    throw codedError('MARKET_REPLAY_MIGRATION_DIGEST_MISMATCH');
  }

  return deepFreeze({
    schema: SOURCE_READINESS_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    state: SOURCE_READINESS_STATE,
    deployed_durable_verified: false,
    reviewed_replay_migration_sha256: REVIEWED_REPLAY_MIGRATION_SHA256,
    authority: {
      market_genesis_active: true,
      living_classified_fabric_active: false,
      transaction_capabilities_enabled: false,
      pulse_ad_billing_authority_preserved: true,
      contact_replay_protection_durable: true,
    },
    source_contract: {
      contract_version: SOURCE_CONTRACT_VERSION,
      whole_vehicle_ads_forbidden: true,
      no_transaction: true,
      release_evidence_required_for_contact: true,
      retired_fallback_forbidden: true,
    },
  });
}

function serializeMarketSourceReadinessEvidence(evidence) {
  const validation = validateMarketSourceReadinessEvidence(evidence, {
    expectedSourceSha: evidence && evidence.source_sha,
    expectedSourceTree: evidence && evidence.source_tree,
  });
  if (validation.ok !== true) throw codedError(validation.reason_code);
  return canonicalJson(evidence);
}

module.exports = {
  createMarketSourceReadinessEvidence,
  serializeMarketSourceReadinessEvidence,
  validateMarketSourceReadinessEvidence,
};

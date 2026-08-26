'use strict';

const { createHash } = require('node:crypto');
const { validateManifest } = require('./constitution.cjs');

const MANIFEST_FIELDS = Object.freeze([
  'id',
  'schemaVersion',
  'status',
  'effectiveFrom',
  'reference',
  'currencyBase',
  'microUnitsPerJod',
  'canonicalPackagesJod',
  'directPurchaseDiscountBps',
  'directPurchaseDiscountTiming',
  'externalPayoutEpochDays',
  'payoutProfileDeadlineHours',
  'allocationsBps',
  'operationsBps',
  'salesSlotsBps',
]);

const ALLOCATION_KEYS = Object.freeze([
  'owner',
  'partner1',
  'partner2',
  'partner3',
  'operations',
  'fiscalRegulatoryReserve',
  'salesPool',
]);

const OPERATIONS_KEYS = Object.freeze([
  'risk',
  'maintenance',
  'development',
  'technicalSupport',
  'advertising',
  'csr',
]);

const SALES_SLOT_KEYS = Object.freeze([
  'GENERAL_MANAGER',
  'SECTOR_MANAGER',
  'MARKETER',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function assertExactKeys(value, expectedKeys, label) {
  assertPlainObject(value, label);
  const expected = new Set(expectedKeys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new Error(`unknown ${label} key: ${key}`);
  }
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) throw new Error(`missing ${label} key: ${key}`);
  }
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('financial constitution canonicalization supports safe integers only');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  assertPlainObject(value, 'canonical value');
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function assertManifestShape(manifest) {
  assertExactKeys(manifest, MANIFEST_FIELDS, 'manifest field');
  assertExactKeys(manifest.allocationsBps, ALLOCATION_KEYS, 'allocationsBps');
  assertExactKeys(manifest.operationsBps, OPERATIONS_KEYS, 'operationsBps');
  assertExactKeys(manifest.salesSlotsBps, SALES_SLOT_KEYS, 'salesSlotsBps');
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function compileFinancialConstitution(manifest) {
  assertPlainObject(manifest, 'financial constitution manifest');

  const allowedFields = new Set(MANIFEST_FIELDS);
  for (const key of Object.keys(manifest)) {
    if (!allowedFields.has(key)) throw new Error(`unknown manifest field: ${key}`);
  }

  assertManifestShape(manifest);
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid financial constitution: ${validation.errors.join('; ')}`);
  }

  const canonicalManifest = canonicalize(manifest);
  const totalBps = sum(Object.values(manifest.allocationsBps));
  const operationsBps = sum(Object.values(manifest.operationsBps));
  const salesPoolBps = sum(Object.values(manifest.salesSlotsBps));

  const compiled = {
    compiler_version: 'TIGER_FINANCIAL_CONSTITUTION_COMPILER_V1',
    constitution_id: manifest.id,
    reference: manifest.reference,
    effective_from: manifest.effectiveFrom,
    constitution_digest: sha256(canonicalJson(canonicalManifest)),
    total_bps: totalBps,
    operations_bps: operationsBps,
    sales_pool_bps: salesPoolBps,
    exactly_balanced: totalBps === 10_000 && operationsBps === 4_300 && salesPoolBps === 2_100,
    canonical_manifest: canonicalManifest,
  };

  if (!compiled.exactly_balanced) throw new Error('Invalid financial constitution: compiler balance invariant failed');
  return deepFreeze(compiled);
}

function createConstitutionSigningRequest(manifest) {
  const compiled = compileFinancialConstitution(manifest);
  return deepFreeze({
    request_version: 'TIGER_FINANCIAL_CONSTITUTION_SIGNING_REQUEST_V1',
    constitution_id: compiled.constitution_id,
    constitution_digest: compiled.constitution_digest,
    effective_from: compiled.effective_from,
    signature_authority: 'TRUSTED_HSM_OR_KMS',
    required_quorum: Object.freeze(['OWNER', 'SECURITY_COSIGNER']),
    repository_private_key_allowed: false,
    production_activation_without_verified_signature: false,
  });
}

module.exports = Object.freeze({
  MANIFEST_FIELDS,
  ALLOCATION_KEYS,
  OPERATIONS_KEYS,
  SALES_SLOT_KEYS,
  canonicalJson,
  compileFinancialConstitution,
  createConstitutionSigningRequest,
});

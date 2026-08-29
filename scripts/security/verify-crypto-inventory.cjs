'use strict';

const REQUIRED_SURFACES = Object.freeze([
  'TLS_TRANSPORT',
  'OIDC_JWT',
  'OWNER_AUTHORITY_SIGNING',
  'POLICY_BUNDLE_SIGNING',
  'ARTIFACT_PROVENANCE_SIGNING',
  'WORKLOAD_IDENTITY',
  'DATABASE_ENCRYPTION',
  'OBJECT_STORAGE_ENCRYPTION',
  'BACKUP_ENCRYPTION',
  'KMS_HSM',
  'EXECUTION_SEALS'
]);
const PQC_REFERENCES = Object.freeze(['FIPS_203_ML_KEM', 'FIPS_204_ML_DSA', 'FIPS_205_SLH_DSA']);
const MIGRATION = new Set(['NOT_ASSESSED', 'MIGRATION_PLANNED', 'HYBRID_READY', 'PQC_READY', 'NOT_APPLICABLE']);

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function verifyCryptoInventory(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest must be object'], inventoryComplete: false, pendingSurfaces: [...REQUIRED_SURFACES] };
  }
  if (manifest.schemaVersion !== 'TIGER_CRYPTO_INVENTORY_V1') errors.push('schemaVersion invalid');
  const policy = manifest.policy || {};
  if (policy.noCustomCryptography !== true) errors.push('custom cryptography must be forbidden');
  if (policy.cryptoAgilityRequired !== true) errors.push('crypto agility must be required');
  if (policy.pqcPolicy !== 'NIST_STANDARDS_ONLY_NO_CUSTOM_PQC') errors.push('PQC policy invalid');
  if (!exactArray(manifest.pqcReferenceStandards, PQC_REFERENCES)) errors.push('PQC reference standards invalid');
  if (manifest.globalLaunchCryptoGate !== 'BLOCK_UNTIL_INVENTORY_EVIDENCED') errors.push('global launch crypto gate invalid');

  const items = Array.isArray(manifest.items) ? manifest.items : [];
  if (items.length !== REQUIRED_SURFACES.length || items.some((item, index) => !item || item.surface !== REQUIRED_SURFACES[index])) {
    errors.push('required cryptographic surfaces must exist exactly once and in canonical order');
  }

  const pending = [];
  for (let index = 0; index < Math.min(items.length, REQUIRED_SURFACES.length); index += 1) {
    const item = items[index] || {};
    if (!['DISCOVERY_REQUIRED', 'EVIDENCED'].includes(item.status) || !MIGRATION.has(item.migrationStatus)) {
      errors.push(`${REQUIRED_SURFACES[index]} status invalid`);
      continue;
    }
    if (item.status === 'DISCOVERY_REQUIRED') {
      pending.push(REQUIRED_SURFACES[index]);
      if (item.algorithm !== null || item.provider !== null || item.keyLocation !== null || item.migrationStatus !== 'NOT_ASSESSED') {
        errors.push(`${REQUIRED_SURFACES[index]} cannot claim crypto details before evidence`);
      }
    } else {
      if (typeof item.algorithm !== 'string' || !item.algorithm.trim() ||
          typeof item.provider !== 'string' || !item.provider.trim() ||
          typeof item.keyLocation !== 'string' || !item.keyLocation.trim()) {
        errors.push(`${REQUIRED_SURFACES[index]} evidenced item requires algorithm provider and key location`);
      }
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    inventoryComplete: errors.length === 0 && pending.length === 0,
    pendingSurfaces: Object.freeze(pending)
  });
}

module.exports = Object.freeze({ REQUIRED_SURFACES, PQC_REFERENCES, verifyCryptoInventory });

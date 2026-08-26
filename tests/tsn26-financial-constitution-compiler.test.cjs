'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../config/tsn26/financial-constitution.v1.json');
const {
  compileFinancialConstitution,
  createConstitutionSigningRequest,
} = require('../scripts/tsn26/financial/constitution-compiler.cjs');

function reorder(value) {
  if (Array.isArray(value)) return value.map(reorder);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reorder(value[key])]));
}

test('financial constitution compiler emits one deterministic content-addressed law', () => {
  const compiled = compileFinancialConstitution(manifest);
  assert.equal(compiled.constitution_id, 'TFC-2026.08.001');
  assert.equal(compiled.reference, 'TSN-26');
  assert.match(compiled.constitution_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(compiled.total_bps, 10_000);
  assert.equal(compiled.operations_bps, 4_300);
  assert.equal(compiled.sales_pool_bps, 2_100);
  assert.equal(compiled.exactly_balanced, true);
});

test('compiler digest is canonical and independent of JSON key ordering', () => {
  const first = compileFinancialConstitution(manifest);
  const second = compileFinancialConstitution(reorder(manifest));
  assert.equal(first.constitution_digest, second.constitution_digest);
  assert.deepEqual(first.canonical_manifest, second.canonical_manifest);
});

test('compiler rejects hidden policy fields and malformed economic maps fail closed', () => {
  assert.throws(
    () => compileFinancialConstitution({ ...manifest, hiddenFallback: true }),
    /unknown manifest field/i,
  );
  assert.throws(
    () => compileFinancialConstitution({
      ...manifest,
      allocationsBps: { ...manifest.allocationsBps, owner: 499 },
    }),
    /invalid financial constitution/i,
  );
  assert.throws(
    () => compileFinancialConstitution({
      ...manifest,
      salesSlotsBps: { ...manifest.salesSlotsBps, EXTRA_ROLE: 0 },
    }),
    /unknown salesSlotsBps key/i,
  );
});

test('signing request binds the canonical digest but never embeds a repository signing key', () => {
  const request = createConstitutionSigningRequest(manifest);
  assert.equal(request.constitution_id, 'TFC-2026.08.001');
  assert.match(request.constitution_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(request.signature_authority, 'TRUSTED_HSM_OR_KMS');
  assert.deepEqual(request.required_quorum, ['OWNER', 'SECURITY_COSIGNER']);
  assert.equal(request.repository_private_key_allowed, false);
  assert.equal(request.production_activation_without_verified_signature, false);
  assert.equal(Object.hasOwn(request, 'private_key'), false);
  assert.equal(Object.hasOwn(request, 'signature'), false);
});

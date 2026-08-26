'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const manifest = require('../config/tsn26/financial-constitution.v1.json');
const policy = require('../project-control/tsn26/crypto-policy.v1.json');
const {
  createConstitutionSigningEnvelope,
  verifyConstitutionActivation,
  signingPayload,
} = require('../scripts/tsn26/security/constitution-signing.cjs');

function keyPair() {
  return crypto.generateKeyPairSync('ed25519');
}

function signedRecord({ role, subject, keyRef, privateKey, digest, signedAt = '2026-08-26T05:10:00.000Z' }) {
  const record = {
    signer_role: role,
    signer_subject: subject,
    key_ref: keyRef,
    signature_profile: 'ED25519',
    signed_at: signedAt,
  };
  const payload = signingPayload({
    constitutionId: manifest.id,
    constitutionDigest: digest,
    cryptoPolicyId: policy.policy_id,
    signature: record,
  });
  return { ...record, signature_base64: crypto.sign(null, Buffer.from(payload), privateKey).toString('base64') };
}

test('crypto policy is versioned, contains no private material, and keeps PQC transition explicit', () => {
  assert.equal(policy.reference, 'TSN-26');
  assert.equal(policy.fail_closed, true);
  assert.equal(policy.repository_private_key_allowed, false);
  assert.ok(policy.signature_profiles.ED25519);
  assert.equal(policy.signature_profiles.ED25519.status, 'CURRENT');
  assert.equal(policy.signature_profiles.ML_DSA_65.status, 'TRANSITION_TEST_ONLY');
  const serialized = JSON.stringify(policy);
  assert.doesNotMatch(serialized, /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
  assert.doesNotMatch(serialized, /"private_key"\s*:/i);
});

test('constitution activation requires independent OWNER and SECURITY_COSIGNER signatures over exact digest', () => {
  const owner = keyPair();
  const security = keyPair();
  const envelope = createConstitutionSigningEnvelope(manifest, { cryptoPolicy: policy });
  const signatures = [
    signedRecord({ role: 'OWNER', subject: 'owner-primary', keyRef: 'hsm://owner/constitution-1', privateKey: owner.privateKey, digest: envelope.constitution_digest }),
    signedRecord({ role: 'SECURITY_COSIGNER', subject: 'security-control-1', keyRef: 'hsm://security/constitution-1', privateKey: security.privateKey, digest: envelope.constitution_digest }),
  ];
  const keyRegistry = new Map([
    ['hsm://owner/constitution-1', { publicKey: owner.publicKey, status: 'ACTIVE', signatureProfile: 'ED25519' }],
    ['hsm://security/constitution-1', { publicKey: security.publicKey, status: 'ACTIVE', signatureProfile: 'ED25519' }],
  ]);
  const result = verifyConstitutionActivation(manifest, { ...envelope, signatures }, {
    cryptoPolicy: policy,
    now: new Date('2026-08-26T05:11:00.000Z'),
    resolveKey: (keyRef) => keyRegistry.get(keyRef),
  });
  assert.equal(result.allowed, true);
  assert.equal(result.constitution_id, manifest.id);
  assert.equal(result.verified_signatures, 2);
});

test('activation fails closed on digest mismatch, same-subject quorum, revoked key, or missing cosigner', () => {
  const owner = keyPair();
  const security = keyPair();
  const envelope = createConstitutionSigningEnvelope(manifest, { cryptoPolicy: policy });
  const ownerSig = signedRecord({ role: 'OWNER', subject: 'same-human', keyRef: 'hsm://owner/1', privateKey: owner.privateKey, digest: envelope.constitution_digest });
  const securitySig = signedRecord({ role: 'SECURITY_COSIGNER', subject: 'same-human', keyRef: 'hsm://security/1', privateKey: security.privateKey, digest: envelope.constitution_digest });
  const activeKeys = new Map([
    ['hsm://owner/1', { publicKey: owner.publicKey, status: 'ACTIVE', signatureProfile: 'ED25519' }],
    ['hsm://security/1', { publicKey: security.publicKey, status: 'ACTIVE', signatureProfile: 'ED25519' }],
  ]);

  assert.throws(() => verifyConstitutionActivation(manifest, { ...envelope, constitution_digest: `sha256:${'0'.repeat(64)}`, signatures: [ownerSig, securitySig] }, {
    cryptoPolicy: policy, now: new Date('2026-08-26T05:11:00.000Z'), resolveKey: (ref) => activeKeys.get(ref),
  }), /digest/i);

  assert.throws(() => verifyConstitutionActivation(manifest, { ...envelope, signatures: [ownerSig, securitySig] }, {
    cryptoPolicy: policy, now: new Date('2026-08-26T05:11:00.000Z'), resolveKey: (ref) => activeKeys.get(ref),
  }), /independent/i);

  const revokedKeys = new Map(activeKeys);
  revokedKeys.set('hsm://owner/1', { publicKey: owner.publicKey, status: 'REVOKED', signatureProfile: 'ED25519' });
  assert.throws(() => verifyConstitutionActivation(manifest, { ...envelope, signatures: [
    { ...ownerSig, signer_subject: 'owner-primary' },
    { ...securitySig, signer_subject: 'security-control-1' },
  ] }, {
    cryptoPolicy: policy, now: new Date('2026-08-26T05:11:00.000Z'), resolveKey: (ref) => revokedKeys.get(ref),
  }), /key.*active/i);

  assert.throws(() => verifyConstitutionActivation(manifest, { ...envelope, signatures: [ownerSig] }, {
    cryptoPolicy: policy, now: new Date('2026-08-26T05:11:00.000Z'), resolveKey: (ref) => activeKeys.get(ref),
  }), /SECURITY_COSIGNER/i);
});

test('unknown or transition-only signature profile cannot activate production constitution', () => {
  const envelope = createConstitutionSigningEnvelope(manifest, { cryptoPolicy: policy });
  assert.throws(() => verifyConstitutionActivation(manifest, {
    ...envelope,
    signatures: [{ signer_role: 'OWNER', signer_subject: 'o', key_ref: 'hsm://o', signature_profile: 'ML_DSA_65', signed_at: '2026-08-26T05:10:00.000Z', signature_base64: 'AA==' }],
  }, {
    cryptoPolicy: policy, now: new Date('2026-08-26T05:11:00.000Z'), resolveKey: () => ({ status: 'ACTIVE', signatureProfile: 'ML_DSA_65' }),
  }), /CURRENT/i);
});

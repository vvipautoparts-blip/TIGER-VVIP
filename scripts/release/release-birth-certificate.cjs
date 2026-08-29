'use strict';
const crypto = require('node:crypto');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) { return JSON.stringify(stable(value)); }
function sha256(value) { return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex'); }
function isDigest(value) { return /^sha256:[0-9a-f]{64}$/.test(String(value || '')); }
function isSourceSha(value) { return /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(String(value || '')); }

function exactDigest(value, code = 'RELEASE_DIGEST_INVALID') {
  if (!isDigest(value)) throw new Error(code);
  return String(value);
}

function exactDigestList(value, code) {
  if (!Array.isArray(value) || value.length < 1 || new Set(value).size !== value.length || value.some((item) => !isDigest(item))) {
    throw new Error(code);
  }
  return Object.freeze(value.slice().sort());
}

function payloadForDigest(certificate) {
  const copy = { ...certificate };
  delete copy.certificateDigest;
  delete copy.signature;
  delete copy.revokedAt;
  return copy;
}

function createReleaseBirthCertificate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('RELEASE_INPUT_INVALID');
  const sourceSha = String(input.sourceSha || '').trim().toLowerCase();
  if (!isSourceSha(sourceSha)) throw new Error('RELEASE_SOURCE_SHA_INVALID');
  const builderIdentity = String(input.builderIdentity || '').trim();
  if (!builderIdentity || builderIdentity.length > 512) throw new Error('RELEASE_BUILDER_IDENTITY_INVALID');
  const issuedAt = Number(input.issuedAt);
  if (!Number.isFinite(issuedAt)) throw new Error('RELEASE_ISSUED_AT_INVALID');

  const certificate = {
    schemaVersion: 'TIGER_RELEASE_BIRTH_CERTIFICATE_V1',
    sourceSha,
    artifactDigest: exactDigest(input.artifactDigest, 'RELEASE_ARTIFACT_DIGEST_INVALID'),
    sourceProvenanceDigest: exactDigest(input.sourceProvenanceDigest, 'RELEASE_SOURCE_PROVENANCE_INVALID'),
    buildProvenanceDigest: exactDigest(input.buildProvenanceDigest, 'RELEASE_BUILD_PROVENANCE_INVALID'),
    sbomDigest: exactDigest(input.sbomDigest, 'RELEASE_SBOM_INVALID'),
    cbomDigest: exactDigest(input.cbomDigest, 'RELEASE_CBOM_INVALID'),
    testEvidenceDigests: exactDigestList(input.testEvidenceDigests, 'RELEASE_TEST_EVIDENCE_INVALID'),
    securityEvidenceDigests: exactDigestList(input.securityEvidenceDigests, 'RELEASE_SECURITY_EVIDENCE_INVALID'),
    policyDigest: exactDigest(input.policyDigest, 'RELEASE_POLICY_DIGEST_INVALID'),
    cryptoTwinDigest: exactDigest(input.cryptoTwinDigest, 'RELEASE_CRYPTO_TWIN_DIGEST_INVALID'),
    builderIdentity,
    issuedAt
  };
  if (input.signature != null) certificate.signature = structuredClone(input.signature);
  certificate.certificateDigest = sha256(canonicalJson(payloadForDigest(certificate)));
  return Object.freeze(certificate);
}

function verifyReleaseBirthCertificate(certificate, context = {}, verifiers = {}) {
  if (!certificate || typeof certificate !== 'object' || Array.isArray(certificate)) return { ok:false, code:'RELEASE_CERTIFICATE_INVALID' };
  let expected;
  try { expected = sha256(canonicalJson(payloadForDigest(certificate))); }
  catch (_) { return { ok:false, code:'RELEASE_CERTIFICATE_INVALID' }; }
  if (certificate.certificateDigest !== expected) return { ok:false, code:'RELEASE_CERTIFICATE_DIGEST_MISMATCH' };
  if (!isSourceSha(certificate.sourceSha)) return { ok:false, code:'RELEASE_SOURCE_SHA_INVALID' };
  if (context.sourceSha && certificate.sourceSha !== String(context.sourceSha).toLowerCase()) return { ok:false, code:'RELEASE_SOURCE_MISMATCH' };
  if (context.artifactDigest && certificate.artifactDigest !== context.artifactDigest) return { ok:false, code:'RELEASE_ARTIFACT_MISMATCH' };
  if (Number.isFinite(Number(certificate.revokedAt)) && (!Number.isFinite(Number(context.now)) || Number(certificate.revokedAt) <= Number(context.now))) {
    return { ok:false, code:'RELEASE_CERTIFICATE_REVOKED' };
  }
  if (context.requireSignature === true) {
    if (!certificate.signature) return { ok:false, code:'RELEASE_SIGNATURE_REQUIRED' };
    if (typeof verifiers.verifySignature !== 'function') return { ok:false, code:'RELEASE_SIGNATURE_VERIFIER_REQUIRED' };
    return Promise.resolve(verifiers.verifySignature(certificate.certificateDigest, certificate.signature, certificate)).then((valid) =>
      valid ? {ok:true, code:'RELEASE_CERTIFICATE_VALID'} : {ok:false, code:'RELEASE_SIGNATURE_INVALID'}
    );
  }
  return {ok:true, code:'RELEASE_CERTIFICATE_VALID'};
}

module.exports = Object.freeze({ createReleaseBirthCertificate, verifyReleaseBirthCertificate, canonicalJson });

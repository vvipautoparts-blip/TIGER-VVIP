'use strict';
const crypto = require('node:crypto');

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

function sha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex');
}

function validSourceSha(value) {
  return /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(String(value || ''));
}

function detectOidcJwt(content) {
  const algorithm = content.match(/\bALGORITHM\s*=\s*['\"]([A-Z0-9_-]+)['\"]/);
  if (!algorithm) return null;
  const alg = algorithm[1];
  let primitive = null;
  if (/\bRSA-SHA256\b/.test(content) || /^RS\d+$/.test(alg)) primitive = 'RSA';
  else if (/^ES\d+$/.test(alg)) primitive = 'EC';
  else if (/^EdDSA$/.test(alg)) primitive = 'EdDSA';
  return { algorithm: alg, primitive };
}

function harvestSourceCryptoEvidence(descriptors, options = {}) {
  const list = Array.isArray(descriptors) ? descriptors : [];
  const observedAt = Number(options.observedAt);
  if (!Number.isFinite(observedAt)) throw new Error('CRYPTO_EVIDENCE_OBSERVED_AT_REQUIRED');
  const evidence = [];

  for (const descriptor of list) {
    if (!descriptor || !REQUIRED_SURFACES.includes(descriptor.surface)) continue;
    const content = String(descriptor.content || '');
    const path = String(descriptor.path || '').trim();
    const sourceSha = String(descriptor.sourceSha || '').toLowerCase();
    if (!path || !validSourceSha(sourceSha)) continue;

    let detected = null;
    if (descriptor.surface === 'OIDC_JWT') detected = detectOidcJwt(content);
    if (!detected) continue;

    const evidenceBody = {
      surface: descriptor.surface,
      evidenceType: 'SOURCE_CRYPTO_OBSERVATION',
      sourcePath: path,
      sourceSha,
      algorithm: detected.algorithm,
      primitive: detected.primitive,
      provider: null,
      keyLocation: null,
      observedAt
    };
    evidence.push(Object.freeze({
      ...evidenceBody,
      evidenceDigest: sha256(JSON.stringify(evidenceBody))
    }));
  }

  return Object.freeze(evidence);
}

module.exports = Object.freeze({ REQUIRED_SURFACES, harvestSourceCryptoEvidence });

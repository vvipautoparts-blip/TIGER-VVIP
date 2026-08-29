'use strict';
const crypto = require('node:crypto');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function sha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex');
}

function boundedText(value, max = 512) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) throw new Error('EVIDENCE_FIELD_INVALID');
  return text;
}

function exactDigest(value) {
  const text = boundedText(value, 128);
  if (!/^sha256:[0-9a-f]{64}$/.test(text)) throw new Error('EVIDENCE_DIGEST_INVALID');
  return text;
}

function payloadForDigest(node) {
  const copy = { ...node };
  delete copy.contentDigest;
  delete copy.signature;
  delete copy.revokedAt;
  return copy;
}

function createEvidenceNode(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('EVIDENCE_INPUT_INVALID');
  const observedAt = Number(input.observedAt);
  const expiresAt = Number(input.expiresAt);
  if (!Number.isFinite(observedAt) || !Number.isFinite(expiresAt) || expiresAt <= observedAt) throw new Error('EVIDENCE_TIME_INVALID');

  const node = {
    evidenceId: boundedText(input.evidenceId, 128),
    type: boundedText(input.type, 128),
    subject: boundedText(input.subject, 512),
    property: boundedText(input.property, 256),
    observedValue: structuredClone(input.observedValue),
    sourceSha: boundedText(input.sourceSha, 128),
    releaseDigest: exactDigest(input.releaseDigest),
    policyDigest: exactDigest(input.policyDigest),
    genomeDigest: exactDigest(input.genomeDigest),
    observerIdentity: boundedText(input.observerIdentity, 512),
    evidenceMethod: boundedText(input.evidenceMethod, 128),
    observedAt,
    expiresAt,
    artifactDigest: exactDigest(input.artifactDigest)
  };

  if (input.signature != null) node.signature = structuredClone(input.signature);
  node.contentDigest = sha256(canonicalJson(payloadForDigest(node)));
  return Object.freeze(node);
}

function verifyEvidenceNode(node, context = {}, verifiers = {}) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return { ok: false, code: 'EVIDENCE_INVALID' };

  let expected;
  try {
    expected = sha256(canonicalJson(payloadForDigest(node)));
  } catch (_) {
    return { ok: false, code: 'EVIDENCE_INVALID' };
  }

  if (node.contentDigest !== expected) return { ok: false, code: 'EVIDENCE_DIGEST_MISMATCH' };

  const now = Number(context.now);
  if (!Number.isFinite(now)) return { ok: false, code: 'EVIDENCE_TIME_REQUIRED' };
  if (Number.isFinite(Number(node.revokedAt)) && Number(node.revokedAt) <= now) return { ok: false, code: 'EVIDENCE_REVOKED' };
  if (!Number.isFinite(Number(node.expiresAt)) || now > Number(node.expiresAt)) return { ok: false, code: 'EVIDENCE_EXPIRED' };
  if (context.releaseDigest && node.releaseDigest !== context.releaseDigest) return { ok: false, code: 'EVIDENCE_RELEASE_MISMATCH' };
  if (context.policyDigest && node.policyDigest !== context.policyDigest) return { ok: false, code: 'EVIDENCE_POLICY_MISMATCH' };
  if (context.genomeDigest && node.genomeDigest !== context.genomeDigest) return { ok: false, code: 'EVIDENCE_GENOME_MISMATCH' };

  if (context.requireSignature === true) {
    if (!node.signature) return { ok: false, code: 'EVIDENCE_SIGNATURE_REQUIRED' };
    if (typeof verifiers.verifySignature !== 'function') return { ok: false, code: 'EVIDENCE_SIGNATURE_VERIFIER_REQUIRED' };
    return Promise.resolve(verifiers.verifySignature(node.contentDigest, node.signature, node)).then((valid) =>
      valid ? { ok: true, code: 'EVIDENCE_VALID' } : { ok: false, code: 'EVIDENCE_SIGNATURE_INVALID' }
    );
  }

  return { ok: true, code: 'EVIDENCE_VALID' };
}

module.exports = Object.freeze({ createEvidenceNode, verifyEvidenceNode, canonicalJson });

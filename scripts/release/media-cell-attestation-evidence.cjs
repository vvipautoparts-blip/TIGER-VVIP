'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { canonicalJson } = require('./media-cell-sbom.cjs');

const SHA40_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function fail(code) {
  throw new Error(code);
}

function exactKeys(value, allowed, unknownCode, invalidCode) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(invalidCode);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  for (const key of actual) if (!expected.includes(key)) fail(unknownCode);
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) fail(invalidCode);
}

function validateExpectation(expected) {
  exactKeys(
    expected,
    ['repository', 'signerWorkflow', 'sourceDigest', 'sourceRef', 'subjectName', 'subjectDigest', 'predicateType'],
    'ATTESTATION_EXPECTATION_UNKNOWN',
    'ATTESTATION_EXPECTATION_INVALID',
  );
  if (!REPOSITORY_PATTERN.test(expected.repository || '')) fail('ATTESTATION_REPOSITORY_INVALID');
  if (typeof expected.signerWorkflow !== 'string' || !expected.signerWorkflow.startsWith(`github.com/${expected.repository}/.github/workflows/`)) {
    fail('ATTESTATION_SIGNER_WORKFLOW_INVALID');
  }
  if (!SHA40_PATTERN.test(expected.sourceDigest || '')) fail('ATTESTATION_SOURCE_DIGEST_INVALID');
  if (typeof expected.sourceRef !== 'string' || !expected.sourceRef.startsWith('refs/heads/')) fail('ATTESTATION_SOURCE_REF_INVALID');
  if (typeof expected.subjectName !== 'string' || !expected.subjectName) fail('ATTESTATION_SUBJECT_NAME_INVALID');
  if (!SHA256_DIGEST_PATTERN.test(expected.subjectDigest || '')) fail('ATTESTATION_SUBJECT_DIGEST_INVALID');
  if (typeof expected.predicateType !== 'string' || !expected.predicateType.startsWith('https://')) fail('ATTESTATION_PREDICATE_TYPE_INVALID');
}

function statementFor(entry) {
  const statement = entry && entry.verificationResult && entry.verificationResult.statement;
  if (!statement || typeof statement !== 'object' || Array.isArray(statement)) fail('ATTESTATION_VERIFICATION_STATEMENT_INVALID');
  return statement;
}

function assertVerifiedEntry(entry, expected) {
  const statement = statementFor(entry);
  if (statement.predicateType !== expected.predicateType) fail('ATTESTATION_PREDICATE_TYPE_MISMATCH');
  const expectedHex = expected.subjectDigest.slice('sha256:'.length);
  const subjects = Array.isArray(statement.subject) ? statement.subject : [];
  const subjectMatched = subjects.some((subject) => (
    subject
    && subject.name === expected.subjectName
    && subject.digest
    && subject.digest.sha256 === expectedHex
  ));
  if (!subjectMatched) fail('ATTESTATION_SUBJECT_MISMATCH');
}

function createVerifiedAttestationEvidence(document, expected) {
  validateExpectation(expected);
  if (!Array.isArray(document) || document.length < 1) fail('ATTESTATION_VERIFICATION_EMPTY');
  for (const entry of document) assertVerifiedEntry(entry, expected);

  // `gh attestation verify` has already enforced repository, signer workflow,
  // source digest/ref, predicate and OCI subject through its fail-closed CLI
  // filters. Persist only those stable verified identities here. Certificate
  // validity, transparency-log integration times, verifiedTimestamps, and the
  // number of duplicate matching attestations are deliberately excluded:
  // they are operational retry/signing metadata and must never participate in
  // the deterministic release Genome identity.
  const stable = Object.freeze({
    verified: true,
    subject: Object.freeze({
      name: expected.subjectName,
      digest: expected.subjectDigest,
    }),
    predicateType: expected.predicateType,
    source: Object.freeze({
      repository: expected.repository,
      digest: expected.sourceDigest,
      ref: expected.sourceRef,
    }),
    signer: Object.freeze({ workflow: expected.signerWorkflow }),
  });

  return Object.freeze({
    ...stable,
    evidenceSha256: crypto.createHash('sha256').update(canonicalJson(stable)).digest('hex'),
  });
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile, repository, signerWorkflow, sourceDigest, sourceRef, subjectName, subjectDigest, predicateType] = process.argv.slice(2);
  if (!inputFile || !outputFile || !repository || !signerWorkflow || !sourceDigest || !sourceRef || !subjectName || !subjectDigest || !predicateType) {
    fail('USAGE:media-cell-attestation-evidence.cjs <verification.json> <output.json> <repository> <signer-workflow> <source-digest> <source-ref> <subject-name> <subject-digest> <predicate-type>');
  }
  const document = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeCanonicalJson(outputFile, createVerifiedAttestationEvidence(document, {
    repository,
    signerWorkflow,
    sourceDigest,
    sourceRef,
    subjectName,
    subjectDigest,
    predicateType,
  }));
}

module.exports = Object.freeze({ createVerifiedAttestationEvidence });

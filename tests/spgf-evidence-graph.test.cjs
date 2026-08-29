'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEvidenceNode, verifyEvidenceNode } = require('../scripts/sovereignty/sovereign-evidence-graph.cjs');
const base = () => ({
  evidenceId: 'ev-1', type: 'CI_EXECUTION', subject: 'release:abc', property: 'qualityGate',
  observedValue: { state: 'EXECUTED_GREEN', count: 40 }, sourceSha: 'a'.repeat(40), releaseDigest: 'sha256:'+'b'.repeat(64),
  policyDigest: 'sha256:'+'c'.repeat(64), genomeDigest: 'sha256:'+'d'.repeat(64), observerIdentity: 'witness:github',
  evidenceMethod: 'API_OBSERVATION', observedAt: 1000, expiresAt: 2000, artifactDigest: 'sha256:'+'e'.repeat(64)
});
test('evidence digest is deterministic and tamper evident', () => {
  const a = createEvidenceNode(base());
  const b = createEvidenceNode({...base(), observedValue: { count: 40, state: 'EXECUTED_GREEN' }});
  assert.equal(a.contentDigest, b.contentDigest);
  const tampered = structuredClone(a); tampered.observedValue.count = 41;
  assert.equal(verifyEvidenceNode(tampered, { now: 1500 }).ok, false);
});
test('evidence fails closed when expired or revoked', () => {
  const node = createEvidenceNode(base());
  assert.equal(verifyEvidenceNode(node, { now: 2001 }).code, 'EVIDENCE_EXPIRED');
  const revoked = {...node, revokedAt: 1400};
  assert.equal(verifyEvidenceNode(revoked, { now: 1500 }).code, 'EVIDENCE_REVOKED');
});
test('evidence binds exact release policy and genome when context requires them', () => {
  const node = createEvidenceNode(base());
  assert.equal(verifyEvidenceNode(node, { now:1500, releaseDigest:node.releaseDigest, policyDigest:node.policyDigest, genomeDigest:node.genomeDigest }).ok, true);
  assert.equal(verifyEvidenceNode(node, { now:1500, releaseDigest:'sha256:'+'f'.repeat(64) }).code, 'EVIDENCE_RELEASE_MISMATCH');
});
test('critical signed evidence requires an external verifier', async () => {
  const node = createEvidenceNode({...base(), signature: { keyId:'kms:key/1', value:'opaque' }});
  assert.equal((await verifyEvidenceNode(node, { now:1500, requireSignature:true })).code, 'EVIDENCE_SIGNATURE_VERIFIER_REQUIRED');
  const result = await verifyEvidenceNode(node, { now:1500, requireSignature:true }, { verifySignature: async () => true });
  assert.equal(result.ok, true);
});

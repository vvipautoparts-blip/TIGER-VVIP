'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createReleaseBirthCertificate, verifyReleaseBirthCertificate } = require('../scripts/release/release-birth-certificate.cjs');
const d = c => 'sha256:' + c.repeat(64);
const base = () => ({sourceSha:'a'.repeat(40), artifactDigest:d('b'), sourceProvenanceDigest:d('c'), buildProvenanceDigest:d('d'), sbomDigest:d('e'), cbomDigest:d('f'), testEvidenceDigests:[d('1')], securityEvidenceDigests:[d('2')], policyDigest:d('3'), cryptoTwinDigest:d('4'), builderIdentity:'builder:trusted', issuedAt:1000});
test('release birth certificate is deterministic and exact-source bound', () => {
  const a = createReleaseBirthCertificate(base());
  const b = createReleaseBirthCertificate({...base(), securityEvidenceDigests:[d('2')], testEvidenceDigests:[d('1')]});
  assert.equal(a.certificateDigest,b.certificateDigest);
  assert.equal(verifyReleaseBirthCertificate(a,{sourceSha:'a'.repeat(40),artifactDigest:d('b')}).ok,true);
});
test('latest/mutable identity is rejected', () => {
  assert.throws(() => createReleaseBirthCertificate({...base(),sourceSha:'latest'}), /RELEASE_SOURCE_SHA_INVALID/);
});
test('tamper or exact-release mismatch fails closed', () => {
  const cert = createReleaseBirthCertificate(base());
  const tampered = {...cert,builderIdentity:'builder:other'};
  assert.equal(verifyReleaseBirthCertificate(tampered,{sourceSha:cert.sourceSha}).code,'RELEASE_CERTIFICATE_DIGEST_MISMATCH');
  assert.equal(verifyReleaseBirthCertificate(cert,{sourceSha:'b'.repeat(40)}).code,'RELEASE_SOURCE_MISMATCH');
});

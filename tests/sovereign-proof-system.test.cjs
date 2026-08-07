'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const readiness = require('../scripts/ai/sovereign-readiness-gate');
const proof = require('../scripts/ai/sovereign-proof-system');

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);
const HEX_D = 'd'.repeat(64);
const HEX_E = 'e'.repeat(64);
const HEX_F = 'f'.repeat(64);
const HEX_1 = '1'.repeat(64);
const HEX_2 = '2'.repeat(64);
const HEX_3 = '3'.repeat(64);

function releaseInput(overrides = {}) {
  return {
    commitSha: 'e0a26c080782cb946323b2859e3193233cc61b11',
    frontendBuildHash: HEX_A,
    backendBuildHash: HEX_B,
    migrationDigests: [
      { path: 'supabase/migrations/002.sql', sha256: HEX_D },
      { path: 'supabase/migrations/001.sql', sha256: HEX_C },
    ],
    aiPolicyHash: HEX_E,
    promptHash: HEX_F,
    modelConfigHash: HEX_1,
    toolRegistryHash: HEX_2,
    rlsPolicyHash: HEX_3,
    securityConfigHash: '0'.repeat(64),
    environmentClass: 'RELEASE_CANDIDATE',
    ...overrides,
  };
}

function makeRelease(overrides = {}) {
  return proof.createReleaseDNA(releaseInput(overrides));
}

function evidenceForGate(releaseDNA, definition, index, overrides = {}) {
  const verifiedAt = new Date(Date.UTC(2026, 7, 7, 12, 0, index)).toISOString();
  return proof.createEvidenceCapsule({
    releaseDNA,
    gate: definition.id,
    requirementId: `REQ-${String(index + 1).padStart(3, '0')}`,
    status: 'PASS',
    evidenceClass: definition.allowedEvidenceClasses[0],
    environment: definition.allowedEnvironments[0],
    reference: `evidence://gate/${definition.id}/${index + 1}`,
    verifiedAt,
    evidenceSha256: (index % 10).toString().repeat(64),
    fixture: false,
    simulated: false,
    ...overrides,
  });
}

function allEvidence(releaseDNA) {
  return readiness.REQUIRED_GATES.map((definition, index) => evidenceForGate(releaseDNA, definition, index));
}

test('Proof System reuses the existing 45 readiness gates instead of defining a parallel gate catalog', () => {
  assert.equal(readiness.REQUIRED_GATES.length, 45);
  assert.equal(proof.REQUIRED_GATES, readiness.REQUIRED_GATES);
});

test('Release DNA is deterministic across migration ordering and deeply immutable', () => {
  const left = makeRelease();
  const right = makeRelease({
    migrationDigests: [
      { path: 'supabase/migrations/001.sql', sha256: HEX_C },
      { path: 'supabase/migrations/002.sql', sha256: HEX_D },
    ],
  });

  assert.equal(left.schemaVersion, 'TIGER_RELEASE_DNA_V1');
  assert.match(left.digest, /^[0-9a-f]{64}$/);
  assert.equal(left.digest, right.digest);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.components), true);
  assert.equal(Object.isFrozen(left.components.migrationDigests), true);
});

test('any material release component change produces a different Release DNA', () => {
  const original = makeRelease();
  const changedPrompt = makeRelease({ promptHash: '9'.repeat(64) });
  const changedMigration = makeRelease({
    migrationDigests: [
      { path: 'supabase/migrations/001.sql', sha256: HEX_C },
      { path: 'supabase/migrations/002.sql', sha256: '8'.repeat(64) },
    ],
  });

  assert.notEqual(original.digest, changedPrompt.digest);
  assert.notEqual(original.digest, changedMigration.digest);
});

test('Release DNA rejects unknown authority fields, prototype keys, malformed hashes and duplicate migration paths', () => {
  assert.throws(() => makeRelease({ ownerApproved: true }), /RELEASE_DNA_UNKNOWN_FIELD/);
  assert.throws(() => makeRelease({ frontendBuildHash: 'not-a-hash' }), /RELEASE_DNA_INVALID_HASH/);
  assert.throws(
    () => makeRelease({
      migrationDigests: [
        { path: 'supabase/migrations/001.sql', sha256: HEX_C },
        { path: 'supabase/migrations/001.sql', sha256: HEX_D },
      ],
    }),
    /RELEASE_DNA_DUPLICATE_MIGRATION/,
  );

  const polluted = JSON.parse('{"commitSha":"e0a26c080782cb946323b2859e3193233cc61b11","frontendBuildHash":"' + HEX_A + '","backendBuildHash":"' + HEX_B + '","migrationDigests":[],"aiPolicyHash":"' + HEX_E + '","promptHash":"' + HEX_F + '","modelConfigHash":"' + HEX_1 + '","toolRegistryHash":"' + HEX_2 + '","rlsPolicyHash":"' + HEX_3 + '","securityConfigHash":"' + '0'.repeat(64) + '","environmentClass":"RELEASE_CANDIDATE","__proto__":{"isOwner":true}}');
  assert.throws(() => proof.createReleaseDNA(polluted), /RELEASE_DNA_UNKNOWN_FIELD|UNSAFE_KEY/);
});

test('Evidence Capsule binds one canonical gate to one exact release and accepted evidence scope', () => {
  const releaseDNA = makeRelease();
  const definition = readiness.REQUIRED_GATES[0];
  const capsule = evidenceForGate(releaseDNA, definition, 0);

  assert.equal(capsule.schemaVersion, 'TIGER_EVIDENCE_CAPSULE_V1');
  assert.equal(capsule.releaseDigest, releaseDNA.digest);
  assert.equal(capsule.gate, definition.id);
  assert.match(capsule.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(capsule), true);
  assert.equal(proof.verifyEvidenceCapsuleIntegrity(capsule), true);
});

test('Evidence Capsule rejects unknown gates, wrong evidence scope, malformed hashes and authority-shaped extras', () => {
  const releaseDNA = makeRelease();
  const definition = readiness.REQUIRED_GATES[0];

  assert.throws(
    () => evidenceForGate(releaseDNA, { ...definition, id: 'NOT_A_REAL_GATE' }, 0),
    /EVIDENCE_UNKNOWN_GATE/,
  );
  assert.throws(
    () => evidenceForGate(releaseDNA, definition, 0, { evidenceClass: 'OWNER_APPROVAL' }),
    /EVIDENCE_CLASS_NOT_ACCEPTED/,
  );
  assert.throws(
    () => evidenceForGate(releaseDNA, definition, 0, { evidenceSha256: 'bad' }),
    /EVIDENCE_INVALID_HASH/,
  );
  assert.throws(
    () => proof.createEvidenceCapsule({
      releaseDNA,
      gate: definition.id,
      requirementId: 'REQ-001',
      status: 'PASS',
      evidenceClass: definition.allowedEvidenceClasses[0],
      environment: definition.allowedEnvironments[0],
      reference: 'evidence://gate/example',
      verifiedAt: '2026-08-07T12:00:00.000Z',
      evidenceSha256: HEX_A,
      fixture: false,
      simulated: false,
      ownerApproved: true,
    }),
    /EVIDENCE_UNKNOWN_FIELD/,
  );
});

test('old evidence becomes stale for a changed Release DNA and cannot satisfy readiness', () => {
  const oldRelease = makeRelease();
  const newRelease = makeRelease({ promptHash: '9'.repeat(64) });
  const capsules = allEvidence(oldRelease);
  const result = proof.evaluateProofReadiness({ releaseDNA: newRelease, capsules });

  assert.equal(result.productionReady, false);
  assert.equal(result.staleCapsuleCount, 45);
  assert.equal(result.readiness.passedCount, 0);
  assert.equal(result.readiness.blockedCount, 45);
  assert.equal(result.status, 'TIGER_SOVEREIGN_PROOF_BLOCKED');
});

test('simulated or fixture evidence never becomes production proof even when marked PASS', () => {
  const releaseDNA = makeRelease();
  const capsules = allEvidence(releaseDNA);
  const definition = readiness.REQUIRED_GATES[7];
  capsules[7] = evidenceForGate(releaseDNA, definition, 7, { simulated: true });

  const simulated = proof.evaluateProofReadiness({ releaseDNA, capsules });
  assert.equal(simulated.productionReady, false);
  assert.equal(simulated.readiness.passedCount, 44);

  capsules[7] = evidenceForGate(releaseDNA, definition, 7, { fixture: true });
  const fixture = proof.evaluateProofReadiness({ releaseDNA, capsules });
  assert.equal(fixture.productionReady, false);
  assert.equal(fixture.readiness.passedCount, 44);
});

test('44 of 45 PASS can never create a Golden Release Passport and no average score bypass is accepted', () => {
  const releaseDNA = makeRelease();
  const capsules = allEvidence(releaseDNA).slice(0, 44);

  const result = proof.evaluateProofReadiness({ releaseDNA, capsules });
  assert.equal(result.productionReady, false);
  assert.equal(result.readiness.passedCount, 44);
  assert.throws(
    () => proof.createGoldenReleasePassport({ releaseDNA, capsules }),
    /GOLDEN_PASSPORT_BLOCKED/,
  );
  assert.throws(
    () => proof.evaluateProofReadiness({ releaseDNA, capsules, averageScore: 100 }),
    /PROOF_INPUT_UNKNOWN_FIELD/,
  );
});

test('all 45 exact real correctly-scoped capsules can create an immutable Golden Release Passport', () => {
  const releaseDNA = makeRelease();
  const capsules = allEvidence(releaseDNA);
  const result = proof.evaluateProofReadiness({ releaseDNA, capsules });

  assert.equal(result.productionReady, true);
  assert.equal(result.readiness.passedCount, 45);
  assert.equal(result.readiness.blockedCount, 0);
  assert.equal(result.status, 'TIGER_SOVEREIGN_PROOF_100');
  assert.match(result.evidenceRootHash, /^[0-9a-f]{64}$/);

  const passport = proof.createGoldenReleasePassport({
    releaseDNA,
    capsules,
    issuedAt: '2026-08-07T13:00:00.000Z',
  });

  assert.equal(passport.schemaVersion, 'TIGER_GOLDEN_RELEASE_PASSPORT_V1');
  assert.equal(passport.releaseDigest, releaseDNA.digest);
  assert.equal(passport.evidenceRootHash, result.evidenceRootHash);
  assert.equal(passport.totalGates, 45);
  assert.equal(passport.productionReady, true);
  assert.match(passport.digest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(passport), true);
});

test('evidence tampering invalidates integrity and changes the evidence root', () => {
  const releaseDNA = makeRelease();
  const capsules = allEvidence(releaseDNA);
  const original = proof.evaluateProofReadiness({ releaseDNA, capsules });

  const tampered = { ...capsules[0], reference: 'evidence://tampered' };
  assert.equal(proof.verifyEvidenceCapsuleIntegrity(tampered), false);

  const replacement = evidenceForGate(releaseDNA, readiness.REQUIRED_GATES[0], 0, {
    reference: 'evidence://gate/AUTOMATED_QUALITY_GATE/reverified',
    evidenceSha256: '7'.repeat(64),
  });
  const changedCapsules = [replacement, ...capsules.slice(1)];
  const changed = proof.evaluateProofReadiness({ releaseDNA, capsules: changedCapsules });
  assert.notEqual(changed.evidenceRootHash, original.evidenceRootHash);
});

test('Golden Passport refuses evidence integrity failure or a passport request for a different release', () => {
  const releaseDNA = makeRelease();
  const capsules = allEvidence(releaseDNA);
  const tamperedCapsules = [...capsules];
  tamperedCapsules[0] = { ...tamperedCapsules[0], evidenceSha256: '6'.repeat(64) };

  assert.throws(
    () => proof.createGoldenReleasePassport({ releaseDNA, capsules: tamperedCapsules }),
    /EVIDENCE_INTEGRITY_INVALID|GOLDEN_PASSPORT_BLOCKED/,
  );

  const changedRelease = makeRelease({ securityConfigHash: '5'.repeat(64) });
  assert.throws(
    () => proof.createGoldenReleasePassport({ releaseDNA: changedRelease, capsules }),
    /GOLDEN_PASSPORT_BLOCKED/,
  );
});

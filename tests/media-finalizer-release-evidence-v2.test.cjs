'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');
const MIGRATION_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-migration-set.cjs');

const H40_A = 'a'.repeat(40);
const H40_B = 'b'.repeat(40);
const H64 = (char) => char.repeat(64);
const MANIFEST = `sha256:${H64('c')}`;
const SOURCE_REPOSITORY = 'vvipautoparts-blip/TIGER-VVIP';
const REPOSITORY = '211579682376.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer';
const SCAN_COMPLETED_AT = '2026-08-28T07:00:00.000Z';

const REQUIRED_MATERIALS = [
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
];

const REQUIRED_MIGRATIONS = [
  'supabase/migrations/20260816090001_sovereign_media_finalization.sql',
  'supabase/migrations/20260827120000_sealed_media_identity_binding.sql',
];

function materials() {
  const hexFixtureChars = ['a', 'b', 'c', 'd', 'e', 'f', '1', '2'];
  return Object.fromEntries(REQUIRED_MATERIALS.map((name, index) => [name, H64(hexFixtureChars[index])]));
}

function genomeEvidence() {
  return {
    source: {
      repository: SOURCE_REPOSITORY,
      commitSha: H40_A,
      treeSha: H40_B,
      mainSha: H40_A,
      immutable: true,
      eligibility: {
        state: 'VERIFIED_CURRENT_PROTECTED_MAIN',
        dbConvergenceState: 'VERIFIED_LIVE',
        dbConvergenceEvidenceSha256: H64('4'),
      },
    },
    materials: materials(),
    image: {
      repository: REPOSITORY,
      manifestDigest: MANIFEST,
      baseDigest: `sha256:${H64('d')}`,
    },
    database: { migrationSetSha256: H64('e') },
    sbom: {
      specVersion: '1.7',
      sha256: H64('f'),
      subjectDigest: MANIFEST,
      path: 'artifacts/media-cell/oci-sbom.cdx.json',
      componentCount: 12,
    },
    attestations: {
      provenance: { verified: true, evidenceSha256: H64('2') },
      sbom: { verified: true, evidenceSha256: H64('3') },
    },
  };
}

function passportEvidence() {
  return {
    ...genomeEvidence(),
    scan: {
      status: 'COMPLETE',
      scanMode: 'ENHANCED',
      scanCompletedAt: SCAN_COMPLETED_AT,
      critical: 0,
      high: 0,
      medium: 0,
      low: 1,
      unknown: 0,
      findingsSha256: H64('1'),
    },
    supplyGate: {
      decision: 'PASS',
      evidenceSha256: H64('5'),
    },
  };
}

function writeMigrationFixture(root, first = 'create table a(id bigint);', second = 'alter table a add column b text;') {
  for (const relative of REQUIRED_MIGRATIONS) fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, REQUIRED_MIGRATIONS[0]), `${first}\n`, 'utf8');
  fs.writeFileSync(path.join(root, REQUIRED_MIGRATIONS[1]), `${second}\n`, 'utf8');
}

test('Media migration set is deterministic, ordered, and changes when authoritative SQL changes', () => {
  assert.equal(fs.existsSync(MIGRATION_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-migration-set.cjs');
  const { createMediaMigrationSet } = require(MIGRATION_HELPER);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tiger-media-migrations-'));
  try {
    writeMigrationFixture(temp);
    const first = createMediaMigrationSet(temp);
    const second = createMediaMigrationSet(temp);
    assert.deepEqual(first, second);
    assert.equal(first.schemaVersion, 'tiger-media-migration-set-v1');
    assert.deepEqual(first.migrations.map((entry) => entry.path), REQUIRED_MIGRATIONS);
    for (const entry of first.migrations) assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    assert.match(first.sha256, /^[0-9a-f]{64}$/);

    writeMigrationFixture(temp, 'create table a(id bigint primary key);');
    assert.notEqual(createMediaMigrationSet(temp).sha256, first.sha256);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('Cryptographic Genome is deterministic and changes with authoritative material', () => {
  assert.equal(fs.existsSync(GENOME_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-genome.cjs');
  const { createMediaCellGenome } = require(GENOME_HELPER);
  const first = createMediaCellGenome(genomeEvidence());
  const reordered = JSON.parse(JSON.stringify(genomeEvidence()));
  reordered.materials = Object.fromEntries(Object.entries(reordered.materials).reverse());
  const second = createMediaCellGenome(reordered);
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-cryptographic-genome-v1');
  assert.equal(first.algorithm, 'sha256');
  assert.equal(first.source.repository, SOURCE_REPOSITORY);
  assert.equal(first.source.mainSha, first.source.commitSha);
  assert.equal(first.source.eligibility.state, 'VERIFIED_CURRENT_PROTECTED_MAIN');
  assert.equal(first.source.eligibility.dbConvergenceState, 'VERIFIED_LIVE');
  assert.match(first.id, /^[0-9a-f]{64}$/);

  const changed = genomeEvidence();
  changed.materials['services/media-finalizer/Dockerfile'] = H64('9');
  assert.notEqual(createMediaCellGenome(changed).id, first.id);

  const changedPrerequisite = genomeEvidence();
  changedPrerequisite.source.eligibility.dbConvergenceEvidenceSha256 = H64('6');
  assert.notEqual(createMediaCellGenome(changedPrerequisite).id, first.id);
});

test('Genome rejects unknown, secret-shaped, mismatched, unverified, or ineligible authoritative evidence', () => {
  const { createMediaCellGenome } = require(GENOME_HELPER);

  const unknown = genomeEvidence();
  unknown.extra = true;
  assert.throws(() => createMediaCellGenome(unknown), /GENOME_EVIDENCE_UNKNOWN/);

  const secret = genomeEvidence();
  secret.authorizationHeader = 'not-a-token';
  assert.throws(() => createMediaCellGenome(secret), /GENOME_SECRET_MATERIAL_REJECTED|GENOME_EVIDENCE_UNKNOWN/);

  const mismatch = genomeEvidence();
  mismatch.sbom.subjectDigest = `sha256:${H64('9')}`;
  assert.throws(() => createMediaCellGenome(mismatch), /GENOME_SBOM_SUBJECT_MISMATCH/);

  const unverified = genomeEvidence();
  unverified.attestations.provenance.verified = false;
  assert.throws(() => createMediaCellGenome(unverified), /GENOME_ATTESTATION_UNVERIFIED/);

  const wrongMain = genomeEvidence();
  wrongMain.source.mainSha = '9'.repeat(40);
  assert.throws(() => createMediaCellGenome(wrongMain), /GENOME_SOURCE_ELIGIBILITY_INVALID/);
});

test('Release Passport 2.0 binds Genome, release eligibility, supply gate, and explicit non-deployment states', () => {
  assert.equal(fs.existsSync(PASSPORT_HELPER), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-passport.cjs');
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const passport = createMediaCellPassport(passportEvidence());
  assert.equal(passport.schemaVersion, 'tiger-release-passport-v2');
  assert.match(passport.genome.id, /^[0-9a-f]{64}$/);
  assert.equal(passport.source.repository, SOURCE_REPOSITORY);
  assert.equal(passport.source.mainSha, passport.source.commitSha);
  assert.equal(passport.source.eligibility.state, 'VERIFIED_CURRENT_PROTECTED_MAIN');
  assert.equal(passport.source.eligibility.dbConvergenceState, 'VERIFIED_LIVE');
  assert.equal(passport.image.repository, REPOSITORY);
  assert.equal(passport.sbom.specVersion, '1.7');
  assert.equal(passport.sbom.subjectDigest, passport.image.manifestDigest);
  assert.deepEqual(passport.database, {
    migrationSetSha256: H64('e'),
    liveConvergence: 'NOT_EXECUTED_IN_SEALED_BUILD',
  });
  assert.equal(passport.scan.status, 'COMPLETE');
  assert.equal(passport.scan.scanMode, 'ENHANCED');
  assert.equal(passport.scan.scanCompletedAt, SCAN_COMPLETED_AT);
  assert.equal(passport.scan.critical, 0);
  assert.equal(passport.scan.high, 0);
  assert.equal(passport.scan.medium, 0);
  assert.deepEqual(passport.supplyGate, { decision: 'PASS', evidenceSha256: H64('5') });
  assert.equal(passport.attestations.provenance.verified, true);
  assert.equal(passport.attestations.sbom.verified, true);
  assert.deepEqual(passport.deployment, {
    mode: 'SEALED_BUILD_ONLY',
    regionalDeployment: 'NOT_EXECUTED',
    edgeDeployment: 'NOT_EXECUTED',
    lambdaVersion: 'NOT_AVAILABLE',
    cloudFrontDistribution: 'NOT_AVAILABLE',
    wafWebAcl: 'NOT_AVAILABLE',
    runtimeProbes: 'NOT_EXECUTED',
    rollbackEvidence: 'NOT_APPLICABLE_NO_DEPLOYMENT',
  });
  assert.doesNotMatch(JSON.stringify(passport), /\bslsa\s*level\b/i);
});

test('Release Passport 2.0 preserves ACTIVE continuous-scan state with completed-scan evidence', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const evidence = passportEvidence();
  evidence.scan.status = 'ACTIVE';
  const passport = createMediaCellPassport(evidence);
  assert.equal(passport.scan.status, 'ACTIVE');
  assert.equal(passport.scan.scanCompletedAt, SCAN_COMPLETED_AT);
});

test('Passport 2.0 fails closed on scan, supply gate, subject, secret, and unknown evidence', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);

  const mismatch = passportEvidence();
  mismatch.sbom.subjectDigest = `sha256:${H64('9')}`;
  assert.throws(() => createMediaCellPassport(mismatch), /PASSPORT_|GENOME_/);

  const critical = passportEvidence();
  critical.scan.critical = 1;
  assert.throws(() => createMediaCellPassport(critical), /PASSPORT_SCAN_BLOCKED/);

  const medium = passportEvidence();
  medium.scan.medium = 1;
  assert.throws(() => createMediaCellPassport(medium), /PASSPORT_SCAN_BLOCKED/);

  const scanMode = passportEvidence();
  scanMode.scan.scanMode = 'BASIC';
  assert.throws(() => createMediaCellPassport(scanMode), /PASSPORT_SCAN_INVALID/);

  const noCompletionEvidence = passportEvidence();
  noCompletionEvidence.scan.status = 'ACTIVE';
  noCompletionEvidence.scan.scanCompletedAt = '';
  assert.throws(() => createMediaCellPassport(noCompletionEvidence), /PASSPORT_SCAN_INVALID/);

  const failedSupplyGate = passportEvidence();
  failedSupplyGate.supplyGate.decision = 'FAIL';
  assert.throws(() => createMediaCellPassport(failedSupplyGate), /PASSPORT_SUPPLY_GATE_INVALID/);

  const secret = passportEvidence();
  secret.authorizationHeader = 'not-a-token';
  assert.throws(() => createMediaCellPassport(secret), /PASSPORT_SECRET_MATERIAL_REJECTED|PASSPORT_EVIDENCE_UNKNOWN/);

  const unknown = passportEvidence();
  unknown.extra = true;
  assert.throws(() => createMediaCellPassport(unknown), /PASSPORT_EVIDENCE_UNKNOWN/);
});

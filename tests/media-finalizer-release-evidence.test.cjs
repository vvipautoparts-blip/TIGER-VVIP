'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SBOM_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const SBOM_VERIFY_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom-verify.cjs');
const GENOME_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-genome.cjs');
const PASSPORT_HELPER = path.join(ROOT, 'scripts', 'release', 'media-cell-passport.cjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'media-finalizer-build.yml');
const CONTAINER_SBOM_FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'media-finalizer', 'container-sbom-1.7.json');
const MASTER_SPEC = 'docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md';

function read(file) {
  assert.equal(fs.existsSync(file), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

const H40_A = 'a'.repeat(40);
const H40_B = 'b'.repeat(40);
const H64_A = 'a'.repeat(64);
const H64_B = 'b'.repeat(64);
const H64_C = 'c'.repeat(64);
const H64_D = 'd'.repeat(64);
const H64_E = 'e'.repeat(64);
const H64_F = 'f'.repeat(64);

const REQUIRED_MATERIAL_PATHS = [
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
];
const REQUIRED_DB_MIGRATIONS = [
  'supabase/migrations/20260816090001_sovereign_media_finalization.sql',
  'supabase/migrations/20260826120000_synapse_proof_of_now.sql',
  'supabase/migrations/20260827120000_sealed_media_identity_binding.sql',
];

function digestMap(paths) {
  const hex = 'abcdef0123456789';
  return Object.fromEntries(paths.map((name, index) => [name, hex[index % hex.length].repeat(64)]));
}

function validGenomeEvidence() {
  return {
    source: { commitSha: H40_A, treeSha: H40_B, immutable: true },
    image: {
      repository: '123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer',
      manifestDigest: `sha256:${H64_E}`,
      baseDigest: `sha256:${H64_F}`,
    },
    materials: digestMap(REQUIRED_MATERIAL_PATHS),
    dbMigrations: digestMap(REQUIRED_DB_MIGRATIONS),
    containerSbom: {
      specVersion: '1.7',
      sha256: H64_A,
      componentCount: 2,
      npmPackages: 1,
      osPackages: 1,
    },
    attestations: {
      provenance: { attestationId: 'attestation-provenance-001', verified: true, evidenceSha256: H64_B },
      sbom: { attestationId: 'attestation-sbom-001', verified: true, evidenceSha256: H64_C },
    },
  };
}

function validMaterialsEvidence() {
  const genome = validGenomeEvidence();
  return {
    source: genome.source,
    materials: genome.materials,
    image: genome.image,
  };
}

function validPassportEvidence() {
  const { createMediaCellGenome } = require(GENOME_HELPER);
  return {
    genome: createMediaCellGenome(validGenomeEvidence()),
    vulnerabilityGate: {
      scanType: 'ENHANCED',
      frequency: 'CONTINUOUS_SCAN',
      critical: 0,
      high: 0,
    },
  };
}

test('release-evidence authorities include real SBOM verifier and cryptographic Genome', () => {
  for (const file of [SBOM_HELPER, SBOM_VERIFY_HELPER, GENOME_HELPER, PASSPORT_HELPER, WORKFLOW, CONTAINER_SBOM_FIXTURE]) read(file);
});

test('real container SBOM is CycloneDX 1.7 with both npm and OS package inventory', () => {
  const { validateContainerSbom } = require(SBOM_VERIFY_HELPER);
  const sbom = JSON.parse(read(CONTAINER_SBOM_FIXTURE));
  const summary = validateContainerSbom(sbom, { expectedSpecVersion: '1.7' });
  assert.deepEqual(summary, { componentCount: 2, npmPackages: 1, osPackages: 1 });
});

test('cryptographic Genome is deterministic and changes when authoritative evidence changes', () => {
  const { createMediaCellGenome } = require(GENOME_HELPER);
  const evidence = validGenomeEvidence();
  const first = createMediaCellGenome(evidence);
  const second = createMediaCellGenome(JSON.parse(JSON.stringify(evidence)));
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-cryptographic-genome-v1');
  assert.match(first.genomeId, /^sha256:[0-9a-f]{64}$/);

  const changed = validGenomeEvidence();
  changed.materials['services/media-finalizer/Dockerfile'] = '9'.repeat(64);
  assert.notEqual(createMediaCellGenome(changed).genomeId, first.genomeId);
});

test('cryptographic Genome rejects unknown, secret, incomplete, wrong-region, and unverified evidence', () => {
  const { createMediaCellGenome } = require(GENOME_HELPER);
  const unknown = validGenomeEvidence(); unknown.extra = true;
  assert.throws(() => createMediaCellGenome(unknown), /GENOME_EVIDENCE_UNKNOWN/);
  const secret = validGenomeEvidence(); secret.secretValue = 'sb_secret_forbidden';
  assert.throws(() => createMediaCellGenome(secret), /GENOME_SECRET_MATERIAL_REJECTED/);
  const incomplete = validGenomeEvidence(); delete incomplete.materials['infra/media-finalizer/edge/guard.guard'];
  assert.throws(() => createMediaCellGenome(incomplete), /GENOME_MATERIALS_INVALID/);
  const wrongRegion = validGenomeEvidence(); wrongRegion.image.repository = '123456789012.dkr.ecr.us-east-1.amazonaws.com/tiger-media-finalizer';
  assert.throws(() => createMediaCellGenome(wrongRegion), /GENOME_IMAGE_REPOSITORY_INVALID/);
  const unverified = validGenomeEvidence(); unverified.attestations.sbom.verified = false;
  assert.throws(() => createMediaCellGenome(unverified), /GENOME_ATTESTATION_UNVERIFIED/);
});

test('materials evidence is deterministic CycloneDX 1.7 and cannot masquerade as container inventory', () => {
  const { createMediaCellSbom } = require(SBOM_HELPER);
  const input = validMaterialsEvidence();
  const first = createMediaCellSbom(input);
  const second = createMediaCellSbom(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(first, second);
  assert.equal(first.bomFormat, 'CycloneDX');
  assert.equal(first.specVersion, '1.7');
  assert.deepEqual(first.components.map((component) => component.name), [...REQUIRED_MATERIAL_PATHS].sort());
  const generator = first.metadata.properties.find((property) => property.name === 'tiger:generator');
  assert.equal(generator?.value, 'TIGER_MEDIA_CELL_MATERIALS_V1');
  assert.doesNotMatch(JSON.stringify(first), /TIGER_MEDIA_CELL_SBOM_V1/);
});

test('release passport v2 is deterministic and bound to the cryptographic Genome', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const evidence = validPassportEvidence();
  const first = createMediaCellPassport(evidence);
  const second = createMediaCellPassport(JSON.parse(JSON.stringify(evidence)));
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tiger-release-passport-v2');
  assert.equal(first.genomeId, evidence.genome.genomeId);
  assert.equal(first.containerSbom.specVersion, '1.7');
  assert.deepEqual(first.vulnerabilityGate, { scanType: 'ENHANCED', frequency: 'CONTINUOUS_SCAN', critical: 0, high: 0 });
  assert.equal(first.attestations.provenance.verified, true);
  assert.equal(first.attestations.sbom.verified, true);
  assert.doesNotMatch(JSON.stringify(first), /\bslsa\b/i);
});

test('release passport v2 fails closed on scan, Genome, secret, unknown, or attestation drift', () => {
  const { createMediaCellPassport } = require(PASSPORT_HELPER);
  const high = validPassportEvidence(); high.vulnerabilityGate.high = 1;
  assert.throws(() => createMediaCellPassport(high), /PASSPORT_VULNERABILITY_GATE_REJECTED/);
  const basic = validPassportEvidence(); basic.vulnerabilityGate.scanType = 'BASIC';
  assert.throws(() => createMediaCellPassport(basic), /PASSPORT_VULNERABILITY_GATE_REJECTED/);
  const scanOnPush = validPassportEvidence(); scanOnPush.vulnerabilityGate.frequency = 'SCAN_ON_PUSH';
  assert.throws(() => createMediaCellPassport(scanOnPush), /PASSPORT_VULNERABILITY_GATE_REJECTED/);
  const mismatch = validPassportEvidence(); mismatch.genome.genomeId = `sha256:${'9'.repeat(64)}`;
  assert.throws(() => createMediaCellPassport(mismatch), /PASSPORT_GENOME_MISMATCH/);
  const unverified = validPassportEvidence(); unverified.genome.attestations.sbom.verified = false;
  assert.throws(() => createMediaCellPassport(unverified), /PASSPORT_ATTESTATION_UNVERIFIED/);
  const unknown = validPassportEvidence(); unknown.extra = true;
  assert.throws(() => createMediaCellPassport(unknown), /PASSPORT_EVIDENCE_UNKNOWN/);
  const secret = validPassportEvidence(); secret.secretValue = 'sb_secret_forbidden';
  assert.throws(() => createMediaCellPassport(secret), /PASSPORT_SECRET_MATERIAL_REJECTED/);
});

test('legacy sealed-build workflow remains quarantined until replacement implementation is written', () => {
  const source = read(WORKFLOW).replace(/\r/g, '');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.match(source, new RegExp(MASTER_SPEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source, /exit\s+1/);
  assert.doesNotMatch(source, /configure-aws-credentials|docker\s+(?:build|push)|aws\s+ecr/i);
});

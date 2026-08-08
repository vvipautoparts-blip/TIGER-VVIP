'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { canonicalJson, sha256Hex } = require('../scripts/tsrf/evidence/contracts.cjs');
const { deriveReleaseDna, computeReleaseDigest } = require('../scripts/tsrf/evidence/release-dna.cjs');
const { buildStagingEvidence } = require('../scripts/tsrf/evidence/staging-bridge.cjs');

const SOURCE_SHA = 'a'.repeat(40);
const SOURCE_TREE = 'b'.repeat(40);
const NOW = Date.parse('2026-08-08T12:02:00.000Z');

function write(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function candidateFixture(sourceSha = SOURCE_SHA) {
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrf-bridge-candidate-'));
  const files = {
    'app.js': Buffer.from('console.log("bridge");\n'),
    'index.html': Buffer.from('<!doctype html><title>Bridge</title>\n'),
  };
  for (const [relative, bytes] of Object.entries(files)) write(candidateDir, relative, bytes);
  const digests = Object.fromEntries(
    Object.entries(files).map(([relative, bytes]) => [relative, sha256Hex(bytes)]),
  );
  write(candidateDir, 'manifest.json', `${JSON.stringify({
    sourceSha,
    builtAt: '2026-08-08T12:00:00.000Z',
    releaseEligible: true,
    fileCount: Object.keys(digests).length,
    files: digests,
  }, null, 2)}\n`);
  return candidateDir;
}

function trustedStagingConfig() {
  return Object.freeze({
    provenance: 'GITHUB_ENVIRONMENT_STAGING',
    environment_name: 'staging',
    snapshot: Object.freeze({
      model: 'staging-model-fixture',
      prompt_version: 'staging-prompt-v1',
      max_output_tokens: 1400,
      provider_endpoint: 'https://api.openai.com/v1/responses',
      identity_verifier_class: 'HTTPS',
    }),
  });
}

function gitFixture(statuses = ['', '', '']) {
  let index = 0;
  return {
    headSha: () => SOURCE_SHA,
    treeSha: () => SOURCE_TREE,
    statusPorcelain: () => statuses[Math.min(index++, statuses.length - 1)],
  };
}

function setup() {
  const repositoryRoot = path.resolve(__dirname, '..');
  const candidateDir = candidateFixture();
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrf-bridge-output-'));
  const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrf-bridge-artifact-'));
  const artifactPath = write(artifactDir, 'source-proof.json', '{"proof":"real-bytes"}\n');
  const trustedConfig = trustedStagingConfig();
  const git = gitFixture();
  const dna = deriveReleaseDna({
    repositoryRoot,
    candidateDir,
    environmentClass: 'STAGING_CANDIDATE',
    trustedStagingConfig: trustedConfig,
    git,
    fsApi: fs,
  });
  const proofInput = {
    capsule_version: 'TSRF_PROOF_CAPSULE_V1',
    capsule_class: 'OTP_PROOF_CAPSULE',
    release_digest: computeReleaseDigest(dna),
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    environment: 'STAGING',
    test_version: 'otp-rehearsal-v1',
    artifact_name: 'source-proof.json',
    artifact_sha256: sha256Hex(fs.readFileSync(artifactPath)),
    started_at: '2026-08-08T12:00:00.000Z',
    completed_at: '2026-08-08T12:01:00.000Z',
    generated_at: '2026-08-08T12:01:05.000Z',
    kill_switch_state: 'TRUE',
    validation_results: { contract: 'PASS', behavior: 'PASS' },
    result: 'PASS',
  };
  const trustedContext = {
    workflow_run_id: '31260000001',
    runner_identity: 'github-actions:Linux:X64',
  };
  const cleanup = () => {
    for (const target of [candidateDir, outputDir, artifactDir]) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  };
  return {
    repositoryRoot,
    candidateDir,
    outputDir,
    artifactDir,
    artifactPath,
    trustedConfig,
    git,
    dna,
    proofInput,
    trustedContext,
    cleanup,
  };
}

function run(fixture, overrides = {}) {
  return buildStagingEvidence({
    repositoryRoot: fixture.repositoryRoot,
    candidateDir: fixture.candidateDir,
    outputDir: fixture.outputDir,
    artifactPath: fixture.artifactPath,
    proofInput: fixture.proofInput,
    trustedContext: fixture.trustedContext,
    trustedStagingConfig: fixture.trustedConfig,
    git: fixture.git,
    fsApi: fs,
    nowMs: NOW,
    maxAgeMs: 15 * 60 * 1000,
    futureSkewMs: 30 * 1000,
    ...overrides,
  });
}

test('bridge creates exact STAGING evidence outside repository from trusted bindings', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  const result = run(fixture);

  assert.equal(result.capsule.source_sha, SOURCE_SHA);
  assert.equal(result.capsule.source_tree, SOURCE_TREE);
  assert.equal(result.capsule.environment, 'STAGING');
  assert.equal(result.capsule.kill_switch_state, 'TRUE');
  assert.equal(result.capsule.artifact_sha256, sha256Hex(fs.readFileSync(fixture.artifactPath)));
  assert.equal(result.capsule.release_digest, computeReleaseDigest(result.releaseDna));

  const expectedConfigHash = sha256Hex(canonicalJson(fixture.trustedConfig.snapshot));
  assert.equal(result.releaseDna.model_config_sha256, expectedConfigHash);

  assert.deepEqual(fs.readdirSync(fixture.outputDir).sort(), [
    'manifest.json',
    'proof-capsule.json',
    'release-dna.json',
  ]);
  assert.equal(result.manifest.manifest_version, 'TSRF_EVIDENCE_MANIFEST_V1');
  assert.match(result.manifest.proof_capsule_sha256, /^[0-9a-f]{64}$/);
  assert.match(result.manifest.release_dna_sha256, /^[0-9a-f]{64}$/);
});

test('bridge fails closed without positively trusted Staging identity', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  assert.throws(
    () => run(fixture, { trustedStagingConfig: null }),
    (error) => error.code === 'BLOCKED_STAGING_IDENTITY_UNPROVEN',
  );
});

test('bridge independently rejects artifact tampering and source binding mismatch', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  fs.appendFileSync(fixture.artifactPath, 'tamper\n');
  assert.throws(
    () => run(fixture),
    (error) => error.code === 'EVIDENCE_ARTIFACT_HASH_MISMATCH',
  );

  const fixture2 = setup();
  t.after(fixture2.cleanup);
  assert.throws(
    () => run(fixture2, { proofInput: { ...fixture2.proofInput, source_sha: 'c'.repeat(40) } }),
    (error) => error.code === 'EVIDENCE_SOURCE_SHA_MISMATCH',
  );
});

test('bridge rejects dirty source before generation and source drift during generation', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  assert.throws(
    () => run(fixture, { git: gitFixture([' M source.js']) }),
    (error) => error.code === 'EVIDENCE_SOURCE_DIRTY',
  );

  const fixture2 = setup();
  t.after(fixture2.cleanup);
  assert.throws(
    () => run(fixture2, { git: gitFixture(['', ' M changed-during-generation.js']) }),
    (error) => error.code === 'EVIDENCE_SOURCE_CHANGED',
  );
});

test('bridge output cannot live inside repository or through a symlink', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  const inside = fs.mkdtempSync(path.join(fixture.repositoryRoot, '.tsrf-bridge-inside-'));
  t.after(() => fs.rmSync(inside, { recursive: true, force: true }));
  assert.throws(
    () => run(fixture, { outputDir: inside }),
    (error) => error.code === 'EVIDENCE_OUTPUT_INSIDE_REPOSITORY',
  );

  const fixture2 = setup();
  t.after(fixture2.cleanup);
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrf-bridge-link-target-'));
  const link = path.join(os.tmpdir(), `tsrf-bridge-link-${process.pid}-${Date.now()}`);
  fs.symlinkSync(target, link, 'dir');
  t.after(() => {
    fs.rmSync(link, { force: true });
    fs.rmSync(target, { recursive: true, force: true });
  });
  assert.throws(
    () => run(fixture2, { outputDir: link }),
    (error) => error.code === 'EVIDENCE_OUTPUT_SYMLINK',
  );
});

test('bridge rejects symlink or missing proof artifacts', (t) => {
  const fixture = setup();
  t.after(fixture.cleanup);
  const target = write(fixture.artifactDir, 'target.json', '{}\n');
  const link = path.join(fixture.artifactDir, 'linked-proof.json');
  fs.symlinkSync(target, link);
  assert.throws(
    () => run(fixture, { artifactPath: link }),
    (error) => error.code === 'EVIDENCE_ARTIFACT_SYMLINK',
  );
  assert.throws(
    () => run(fixture, { artifactPath: path.join(fixture.artifactDir, 'missing.json') }),
    (error) => error.code === 'EVIDENCE_ARTIFACT_MISSING',
  );
});

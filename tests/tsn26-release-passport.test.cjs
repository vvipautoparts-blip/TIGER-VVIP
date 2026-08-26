'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../project-control/tsn26/release-passport-policy.v1.json');
const { generateReleasePassport } = require('../scripts/tsn26/release/release-passport.cjs');

const NOW = new Date('2026-08-26T06:10:00.000Z');
const SOURCE_SHA = '1'.repeat(40);
const BASE_SHA = '3'.repeat(40);

function proof(name, ageSeconds = 30) {
  return {
    status: 'PASS',
    ref: `proof://${name}/1`,
    as_of: new Date(NOW.getTime() - ageSeconds * 1000).toISOString(),
    digest: `sha256:${'a'.repeat(64)}`,
    source_sha: SOURCE_SHA,
  };
}

function validInput() {
  return {
    generated_at: NOW.toISOString(),
    source: {
      repository: 'vvipautoparts-blip/TIGER-VVIP',
      branch: 'feat/tsn26-sovereign-nexus-20260826',
      commit_sha: SOURCE_SHA,
      tree_sha: '2'.repeat(40),
      base_branch: 'main',
      base_sha: BASE_SHA,
      merge_base_sha: BASE_SHA,
      compare_status: 'ahead',
      ahead_by: 12,
      behind_by: 0,
    },
    constitution: {
      id: 'TFC-2026.08.001',
      digest: `sha256:${'4'.repeat(64)}`,
      signing_policy_id: 'TCP-2026.08.001',
    },
    supply_chain: {
      slsa_version: '1.2',
      provenance_ref: 'attestation://slsa/provenance-1',
      provenance_digest: `sha256:${'5'.repeat(64)}`,
      sbom_ref: 'artifact://sbom/cyclonedx-1',
      sbom_digest: `sha256:${'6'.repeat(64)}`,
      signature_transparency_ref: 'transparency://signature/entry-1',
      signature_transparency_digest: `sha256:${'7'.repeat(64)}`,
      artifact_ref: 'artifact://release/bundle-1',
      artifact_digest: `sha256:${'8'.repeat(64)}`,
    },
    proofs: Object.fromEntries(Object.keys(policy.required_proofs).map((name) => [name, proof(name)])),
  };
}

test('release passport is content addressed and can recommend promotion only with exact fresh evidence', () => {
  const passport = generateReleasePassport(validInput(), { policy, now: NOW });
  assert.equal(passport.status, 'READY_FOR_CONTROLLED_PROMOTION');
  assert.equal(passport.promotion_allowed, true);
  assert.equal(passport.production_activation_allowed, false);
  assert.equal(passport.target_branch, 'main');
  assert.equal(passport.source_identity_exact, true);
  assert.equal(passport.source.behind_by, 0);
  assert.equal(passport.source.merge_base_sha, passport.source.base_sha);
  assert.equal(passport.supply_chain.slsa_version, '1.2');
  assert.match(passport.passport_id, /^TRP-[0-9a-f]{16}$/);
  assert.match(passport.passport_digest, /^sha256:[0-9a-f]{64}$/);
});

test('missing, stale, invalid-source, or cross-head evidence blocks promotion fail closed', () => {
  const missing = validInput();
  delete missing.proofs.financial_db;
  const missingResult = generateReleasePassport(missing, { policy, now: NOW });
  assert.equal(missingResult.promotion_allowed, false);
  assert.ok(missingResult.failures.includes('PROOF_MISSING:financial_db'));

  const stale = validInput();
  stale.proofs.recovery.as_of = new Date(NOW.getTime() - (policy.required_proofs.recovery.max_age_seconds + 1) * 1000).toISOString();
  const staleResult = generateReleasePassport(stale, { policy, now: NOW });
  assert.equal(staleResult.promotion_allowed, false);
  assert.ok(staleResult.failures.includes('PROOF_STALE:recovery'));

  const missingSource = validInput();
  delete missingSource.proofs.codeql.source_sha;
  const missingSourceResult = generateReleasePassport(missingSource, { policy, now: NOW });
  assert.equal(missingSourceResult.promotion_allowed, false);
  assert.ok(missingSourceResult.failures.includes('PROOF_SOURCE_SHA_INVALID:codeql'));

  const invalidSource = validInput();
  invalidSource.proofs.project_control.source_sha = 'not-a-sha';
  const invalidSourceResult = generateReleasePassport(invalidSource, { policy, now: NOW });
  assert.equal(invalidSourceResult.promotion_allowed, false);
  assert.ok(invalidSourceResult.failures.includes('PROOF_SOURCE_SHA_INVALID:project_control'));

  const crossHead = validInput();
  crossHead.proofs.quality_gate.source_sha = '9'.repeat(40);
  const crossHeadResult = generateReleasePassport(crossHead, { policy, now: NOW });
  assert.equal(crossHeadResult.promotion_allowed, false);
  assert.ok(crossHeadResult.failures.includes('PROOF_SOURCE_SHA_MISMATCH:quality_gate'));
});

test('stale, diverged, or malformed target ancestry blocks controlled promotion', () => {
  const behind = validInput();
  behind.source.behind_by = 1;
  const behindResult = generateReleasePassport(behind, { policy, now: NOW });
  assert.equal(behindResult.promotion_allowed, false);
  assert.ok(behindResult.failures.includes('SOURCE_BEHIND_TARGET'));

  const diverged = validInput();
  diverged.source.compare_status = 'diverged';
  diverged.source.behind_by = 4;
  diverged.source.merge_base_sha = '9'.repeat(40);
  const divergedResult = generateReleasePassport(diverged, { policy, now: NOW });
  assert.equal(divergedResult.promotion_allowed, false);
  assert.ok(divergedResult.failures.includes('SOURCE_COMPARE_STATUS_BLOCKED:diverged'));
  assert.ok(divergedResult.failures.includes('SOURCE_BASE_ANCESTRY_MISMATCH'));

  const malformed = validInput();
  malformed.source.behind_by = -1;
  malformed.source.ahead_by = 1.5;
  malformed.source.merge_base_sha = 'bad';
  const malformedResult = generateReleasePassport(malformed, { policy, now: NOW });
  assert.equal(malformedResult.promotion_allowed, false);
  assert.ok(malformedResult.failures.includes('SOURCE_BEHIND_BY_INVALID'));
  assert.ok(malformedResult.failures.includes('SOURCE_AHEAD_BY_INVALID'));
  assert.ok(malformedResult.failures.includes('SOURCE_MERGE_BASE_SHA_INVALID'));
});

test('source, constitution and supply-chain identities must be exact and immutable-looking', () => {
  for (const mutate of [
    (input) => { input.source.commit_sha = 'short'; },
    (input) => { input.source.tree_sha = 'not-a-sha'; },
    (input) => { input.constitution.id = 'OTHER'; },
    (input) => { input.constitution.digest = 'sha256:bad'; },
    (input) => { input.supply_chain.slsa_version = 'draft'; },
    (input) => { input.supply_chain.provenance_digest = 'sha256:bad'; },
    (input) => { input.supply_chain.signature_transparency_ref = ''; },
  ]) {
    const input = validInput();
    mutate(input);
    const result = generateReleasePassport(input, { policy, now: NOW });
    assert.equal(result.promotion_allowed, false);
    assert.equal(result.status, 'BLOCKED');
  }
});

test('failed proof, branch drift, or production activation request cannot be hidden by a green passport', () => {
  const failed = validInput();
  failed.proofs.codeql.status = 'FAIL';
  assert.equal(generateReleasePassport(failed, { policy, now: NOW }).promotion_allowed, false);

  const drift = validInput();
  drift.source.base_branch = 'release';
  assert.equal(generateReleasePassport(drift, { policy, now: NOW }).promotion_allowed, false);

  const passport = generateReleasePassport(validInput(), { policy, now: NOW });
  assert.equal(passport.production_activation_allowed, false);
  assert.equal(passport.merge_performed, false);
});

test('passport digest is deterministic regardless of proof object key order', () => {
  const a = validInput();
  const b = validInput();
  b.proofs = Object.fromEntries(Object.entries(b.proofs).reverse());
  const one = generateReleasePassport(a, { policy, now: NOW });
  const two = generateReleasePassport(b, { policy, now: NOW });
  assert.equal(one.passport_digest, two.passport_digest);
  assert.equal(one.passport_id, two.passport_id);
});

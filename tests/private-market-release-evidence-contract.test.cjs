'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../scripts/marketplace/market-release-evidence-contract.js');
const moduleExists = fs.existsSync(modulePath);

const SHA = '36e15ea84a9cd3abec75d3da338f46dd9ee2ddae';
const MIGRATION_SHA256 = '484fc1ee834ecce2ac8184ed0756e17f39b5424bbf58c6fff84e61acee6a70ad';

test('market release evidence contract module exists before deployed replay proof can be trusted', () => {
  assert.equal(moduleExists, true, 'market-release-evidence-contract.js must exist before M10 release evidence can pass');
});

if (moduleExists) {
  const {
    RELEASE_EVIDENCE_SCHEMA_VERSION,
    REVIEWED_REPLAY_MIGRATION_SHA256,
    SUPPORTED_RELEASE_ENVIRONMENTS,
    validateContactReplayReleaseEvidence,
  } = require(modulePath);

  function validRelease() {
    return {
      target_environment: 'production',
      contact_replay_release_evidence: {
        schema_version: 'market-contact-replay-release-evidence-v1',
        environment: 'production',
        release_sha: SHA,
        migration_sha256: MIGRATION_SHA256,
        migration_applied: true,
        migration_applied_at: '2026-08-23T15:00:00.000Z',
        probe_completed_at: '2026-08-23T15:05:00.000Z',
        probe_run_id: 'probe-32650000000',
        runtime_instance_count: 2,
        duplicate_nonce_probe: {
          attempts: 2,
          successes: 1,
          replay_rejections: 1,
        },
        duplicate_consume_probe: {
          attempts: 2,
          successes: 1,
          replay_rejections: 1,
        },
      },
    };
  }

  function validate(release, expectedHeadSha = SHA, observedHeadSha = SHA) {
    return validateContactReplayReleaseEvidence({
      release,
      expectedHeadSha,
      observedHeadSha,
    });
  }

  test('exports exact release evidence authority constants', () => {
    assert.equal(RELEASE_EVIDENCE_SCHEMA_VERSION, 'market-contact-replay-release-evidence-v1');
    assert.equal(REVIEWED_REPLAY_MIGRATION_SHA256, MIGRATION_SHA256);
    assert.deepEqual([...SUPPORTED_RELEASE_ENVIRONMENTS], ['staging', 'production']);
    assert.equal(Object.isFrozen(SUPPORTED_RELEASE_ENVIRONMENTS), true);
  });

  test('accepts exact bounded deployed replay evidence and returns a frozen verdict', () => {
    const verdict = validate(validRelease());
    assert.deepEqual(verdict, {
      ok: true,
      reason_code: 'CONTACT_REPLAY_RELEASE_EVIDENCE_VERIFIED',
    });
    assert.equal(Object.isFrozen(verdict), true);
  });

  test('missing release evidence fails closed with bounded reason', () => {
    assert.deepEqual(validate(undefined), {
      ok: false,
      reason_code: 'CONTACT_REPLAY_RELEASE_EVIDENCE_MISSING',
    });
  });

  test('unsupported environment or unknown keys fail as invalid evidence', () => {
    const unsupported = validRelease();
    unsupported.target_environment = 'preview';
    unsupported.contact_replay_release_evidence.environment = 'preview';
    assert.equal(validate(unsupported).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const extraReleaseKey = validRelease();
    extraReleaseKey.database_url = 'forbidden';
    assert.equal(validate(extraReleaseKey).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const extraEvidenceKey = validRelease();
    extraEvidenceKey.contact_replay_release_evidence.runtime_host = 'forbidden';
    assert.equal(validate(extraEvidenceKey).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const extraProbeKey = validRelease();
    extraProbeKey.contact_replay_release_evidence.duplicate_nonce_probe.instance_id = 'forbidden';
    assert.equal(validate(extraProbeKey).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  });

  test('environment mismatch is distinguished from malformed evidence', () => {
    const release = validRelease();
    release.contact_replay_release_evidence.environment = 'staging';
    assert.equal(validate(release).reason_code, 'CONTACT_REPLAY_RELEASE_ENVIRONMENT_MISMATCH');
  });

  test('release SHA must be lowercase hex and match both exact heads', () => {
    const malformed = validRelease();
    malformed.contact_replay_release_evidence.release_sha = SHA.toUpperCase();
    assert.equal(validate(malformed).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const mismatch = validRelease();
    mismatch.contact_replay_release_evidence.release_sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    assert.equal(validate(mismatch).reason_code, 'CONTACT_REPLAY_RELEASE_SHA_MISMATCH');

    assert.equal(validate(validRelease(), SHA, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb').reason_code, 'CONTACT_REPLAY_RELEASE_SHA_MISMATCH');
  });

  test('migration digest must be exact reviewed bytes and applied', () => {
    const digestMismatch = validRelease();
    digestMismatch.contact_replay_release_evidence.migration_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    assert.equal(validate(digestMismatch).reason_code, 'CONTACT_REPLAY_MIGRATION_DIGEST_MISMATCH');

    const notApplied = validRelease();
    notApplied.contact_replay_release_evidence.migration_applied = false;
    assert.equal(validate(notApplied).reason_code, 'CONTACT_REPLAY_MIGRATION_NOT_APPLIED');
  });

  test('timestamps must be canonical ISO chronology and probe reference bounded', () => {
    const malformedTimestamp = validRelease();
    malformedTimestamp.contact_replay_release_evidence.migration_applied_at = '2026-08-23';
    assert.equal(validate(malformedTimestamp).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const reversed = validRelease();
    reversed.contact_replay_release_evidence.probe_completed_at = '2026-08-23T14:59:59.000Z';
    assert.equal(validate(reversed).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const blankRun = validRelease();
    blankRun.contact_replay_release_evidence.probe_run_id = '';
    assert.equal(validate(blankRun).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');

    const oversizedRun = validRelease();
    oversizedRun.contact_replay_release_evidence.probe_run_id = 'x'.repeat(257);
    assert.equal(validate(oversizedRun).reason_code, 'CONTACT_REPLAY_RELEASE_EVIDENCE_INVALID');
  });

  test('distributed proof requires at least two runtime instances', () => {
    const release = validRelease();
    release.contact_replay_release_evidence.runtime_instance_count = 1;
    assert.equal(validate(release).reason_code, 'CONTACT_REPLAY_RUNTIME_COUNT_INSUFFICIENT');
  });

  test('duplicate nonce and capability consumption probes must each prove one replay rejection', () => {
    const nonceFailure = validRelease();
    nonceFailure.contact_replay_release_evidence.duplicate_nonce_probe.replay_rejections = 0;
    assert.equal(validate(nonceFailure).reason_code, 'CONTACT_REPLAY_NONCE_PROBE_FAILED');

    const consumeFailure = validRelease();
    consumeFailure.contact_replay_release_evidence.duplicate_consume_probe.successes = 2;
    consumeFailure.contact_replay_release_evidence.duplicate_consume_probe.replay_rejections = 0;
    assert.equal(validate(consumeFailure).reason_code, 'CONTACT_REPLAY_CONSUME_PROBE_FAILED');
  });
}

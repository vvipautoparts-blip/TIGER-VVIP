'use strict';

const { sha256Hex } = require('../../scripts/trust/contracts.cjs');
const { createTrustedSignalAdapter } = require('../../scripts/trust/trust-signals.cjs');
const { createRevocationStateResolver } = require('../../scripts/trust/revocation-state.cjs');

const HEX = (c) => c.repeat(64);

function scopeForRequest(request, releaseDnaSha256, overrides = {}) {
  return {
    subject_ref_sha256: sha256Hex(request.subject_ref),
    resource_ref_sha256: sha256Hex(request.resource_ref),
    action_profile_ref_sha256: sha256Hex(request.profile_id),
    country_ref_sha256: sha256Hex(request.country_code),
    release_dna_sha256: releaseDnaSha256,
    ...overrides,
  };
}

function createTrustedRevocationStateFixture({
  request,
  releaseDnaSha256,
  nowMs,
  status = 'PASS',
  sequence = 1,
  signalType = 'SYNTHETIC_TEST_RISK',
  issuedAtMs = nowMs - 10,
  freshUntilMs = nowMs + 60_000,
  issuerRefSha256 = HEX('e'),
  evidenceSha256 = HEX('f'),
  scopeOverride = {},
} = {}) {
  const scope = scopeForRequest(request, releaseDnaSha256, scopeOverride);
  const adapter = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate,
    clock: () => nowMs,
  });
  const signal = adapter.admit({
    schema: 'TIGER_TRUST_SIGNAL_V1',
    signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
    status,
    signal_type: signalType,
    ...scope,
    issuer_ref_sha256: issuerRefSha256,
    sequence,
    issued_at_ms: issuedAtMs,
    fresh_until_ms: freshUntilMs,
    evidence_sha256: evidenceSha256,
    state: 'PASS',
  });
  return createRevocationStateResolver({ clock: () => nowMs }).observe({
    signal,
    expectedScope: scope,
  });
}

module.exports = {
  scopeForRequest,
  createTrustedRevocationStateFixture,
};

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_TRUST_SIGNAL_LIFETIME_MS,
  createTrustedSignalAdapter,
} = require('../scripts/trust/trust-signals.cjs');
const {
  createRevocationStateResolver,
  isTrustedRevocationState,
} = require('../scripts/trust/revocation-state.cjs');

const HEX = (c) => c.repeat(64);
const NOW = 5_000_000;

function scope(resource = '2') {
  return {
    subject_ref_sha256: HEX('1'),
    resource_ref_sha256: HEX(resource),
    action_profile_ref_sha256: HEX('3'),
    country_ref_sha256: HEX('4'),
    release_dna_sha256: HEX('5'),
  };
}

function trustedSignal({ expectedScope = scope(), status = 'PASS', sequence = 1, evidence = '7' } = {}) {
  const adapter = createTrustedSignalAdapter({
    authenticate: (candidate) => candidate,
    clock: () => NOW,
  });
  return adapter.admit({
    schema: 'TIGER_TRUST_SIGNAL_V1',
    signal_class: 'AUTHENTICATED_TRUST_SIGNAL',
    status,
    signal_type: 'ACCEPTANCE_RISK',
    ...expectedScope,
    issuer_ref_sha256: HEX('6'),
    sequence,
    issued_at_ms: NOW - 10_000,
    fresh_until_ms: NOW + 60_000,
    evidence_sha256: HEX(evidence),
    state: 'PASS',
  });
}

test('M14 revocation remains capability-scoped instead of becoming a platform-wide kill switch', () => {
  const resolver = createRevocationStateResolver({ clock: () => NOW });
  const scopeA = scope('2');
  const scopeB = scope('8');

  const revokedA = resolver.observe({
    signal: trustedSignal({ expectedScope: scopeA, status: 'REVOKED', sequence: 10 }),
    expectedScope: scopeA,
  });
  const passB = resolver.observe({
    signal: trustedSignal({ expectedScope: scopeB, status: 'PASS', sequence: 1, evidence: '9' }),
    expectedScope: scopeB,
  });

  assert.equal(revokedA.effective_status, 'REVOKED');
  assert.equal(passB.effective_status, 'PASS');
  assert.notEqual(revokedA.scope_digest_sha256, passB.scope_digest_sha256);
  assert.equal(isTrustedRevocationState(revokedA), true);
  assert.equal(isTrustedRevocationState(passB), true);
});

test('M14 source outputs remain evidence-minimized and five-minute bounded', () => {
  assert.equal(MAX_TRUST_SIGNAL_LIFETIME_MS, 5 * 60 * 1000);
  const state = createRevocationStateResolver({ clock: () => NOW }).observe({
    signal: trustedSignal(),
    expectedScope: scope(),
  });
  const serialized = JSON.stringify(state).toLowerCase();

  for (const forbidden of [
    'nonce', 'password', 'credential', 'private_key', 'database_url',
    'user:', 'market-item:', 'precise_location', 'message_content',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('M14 trust source modules contain no network, cloud, remote DB, secret, DNS, payment, or deployment side effects', () => {
  const files = [
    'scripts/trust/trust-signals.cjs',
    'scripts/trust/revocation-state.cjs',
    'scripts/trust/scae.cjs',
  ];
  const forbidden = [
    "require('node:http')",
    "require('node:https')",
    "require('node:net')",
    "require('node:tls')",
    "require('node:child_process')",
    'fetch(',
    'process.env.',
    'supabase.from(',
    'supabase.rpc(',
    'aws-sdk',
    '@aws-sdk/',
    'stripe',
    'cloudflare',
  ];

  for (const relative of files) {
    const source = fs.readFileSync(path.join(process.cwd(), relative), 'utf8').toLowerCase();
    for (const token of forbidden) {
      assert.equal(source.includes(token.toLowerCase()), false, `${relative}: ${token}`);
    }
  }
});

test('SCAE has no executable legacy shape-only trusted_signals fallback', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'scripts/trust/scae.cjs'),
    'utf8',
  );
  assert.equal(source.includes('trusted_signals'), false);
  assert.ok(source.includes('revocation_state'));
  assert.ok(source.includes('isTrustedRevocationState'));
  assert.ok(source.includes('TRUST_SIGNAL_SCOPE_MISMATCH'));
});

test('M14 design keeps completion truth source-only and forbids inflated runtime claims', () => {
  const design = fs.readFileSync(
    path.join(
      process.cwd(),
      'docs/superpowers/specs/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation-design.md',
    ),
    'utf8',
  );
  assert.ok(design.includes('TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED'));
  assert.ok(design.includes('PRODUCTION_CONTINUOUS_REVOCATION_ACTIVE'));
  assert.ok(design.includes('CAEP_CONFORMANT'));
  assert.ok(design.includes('SSF_CONFORMANT'));
  assert.ok(design.includes('merge to `main`'));
});

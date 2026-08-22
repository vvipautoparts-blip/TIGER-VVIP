'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policy = require('../scripts/security/protected-view-policy.js');

const docPath = path.join(__dirname, '..', 'docs', 'security', 'PROTECTED_VIEW_NATIVE_INTEGRATION.md');

function input(overrides = {}) {
  return {
    surface_class: 'OWNER',
    authorization_valid: true,
    step_up_fresh: true,
    integrity_state: 'TRUSTED',
    capture_state: 'CLEAR',
    app_access_risk: 'CLEAR',
    runtime: 'WEB',
    ...overrides,
  };
}

test('canonical high-risk surfaces default to protected treatment', () => {
  assert.deepEqual(policy.HIGH_RISK_SURFACES, ['OWNER', 'FINANCIAL', 'DISCLOSURE']);

  for (const surface of policy.HIGH_RISK_SURFACES) {
    const decision = policy.evaluateProtectedView(input({ surface_class: surface }));
    assert.equal(decision.decision, 'ALLOW');
    assert.equal(decision.protected, true);
    assert.equal(decision.short_lived_view_required, true);
    assert.equal(decision.watermark_required, true);
    assert.equal(decision.app_switcher_redaction_required, true);
  }
});

test('invalid authorization revokes any protected high-risk view immediately', () => {
  for (const surface of policy.HIGH_RISK_SURFACES) {
    const decision = policy.evaluateProtectedView(input({
      surface_class: surface,
      authorization_valid: false,
    }));
    assert.equal(decision.decision, 'REVOKE_VIEW');
    assert.equal(decision.reason_code, 'AUTHORIZATION_INVALID');
  }
});

test('failed integrity on high-risk surfaces revokes the view', () => {
  const decision = policy.evaluateProtectedView(input({ integrity_state: 'FAILED' }));
  assert.equal(decision.decision, 'REVOKE_VIEW');
  assert.equal(decision.reason_code, 'INTEGRITY_FAILED');
});

test('unknown integrity on high-risk surfaces requires fresh step-up rather than silently trusting', () => {
  const decision = policy.evaluateProtectedView(input({
    integrity_state: 'UNKNOWN',
    step_up_fresh: false,
  }));
  assert.equal(decision.decision, 'REQUIRE_STEP_UP');
  assert.equal(decision.reason_code, 'INTEGRITY_UNPROVEN');
});

test('active capture on high-risk surfaces revokes the protected view', () => {
  const decision = policy.evaluateProtectedView(input({ capture_state: 'ACTIVE' }));
  assert.equal(decision.decision, 'REVOKE_VIEW');
  assert.equal(decision.reason_code, 'CAPTURE_ACTIVE');
});

test('capture risk on high-risk surfaces redacts before continuing', () => {
  const decision = policy.evaluateProtectedView(input({ capture_state: 'RISK' }));
  assert.equal(decision.decision, 'REDACT');
  assert.equal(decision.reason_code, 'CAPTURE_RISK');
  assert.equal(decision.redaction_required, true);
});

test('app-access risk requires step-up when not fresh and redacts when already stepped-up', () => {
  const stale = policy.evaluateProtectedView(input({
    app_access_risk: 'DETECTED',
    step_up_fresh: false,
  }));
  assert.equal(stale.decision, 'REQUIRE_STEP_UP');
  assert.equal(stale.reason_code, 'APP_ACCESS_RISK');

  const fresh = policy.evaluateProtectedView(input({
    app_access_risk: 'DETECTED',
    step_up_fresh: true,
  }));
  assert.equal(fresh.decision, 'REDACT');
  assert.equal(fresh.reason_code, 'APP_ACCESS_RISK');
});

test('standard authenticated surfaces do not inherit high-risk native requirements by label alone', () => {
  const decision = policy.evaluateProtectedView(input({
    surface_class: 'STANDARD_AUTHENTICATED',
    step_up_fresh: false,
    integrity_state: 'UNKNOWN',
    capture_state: 'RISK',
  }));

  assert.equal(decision.decision, 'ALLOW');
  assert.equal(decision.protected, false);
  assert.equal(decision.native_secure_surface_required, false);
  assert.equal(decision.short_lived_view_required, false);
});

test('native secure-surface requirement is declarative and runtime-aware, not a fake web API call', () => {
  const android = policy.evaluateProtectedView(input({ runtime: 'ANDROID_NATIVE' }));
  assert.equal(android.native_secure_surface_required, true);
  assert.equal(android.native_integrity_attestation_required, true);
  assert.equal(android.native_capture_observation_required, false);

  const apple = policy.evaluateProtectedView(input({ runtime: 'APPLE_NATIVE' }));
  assert.equal(apple.native_secure_surface_required, false);
  assert.equal(apple.native_integrity_attestation_required, true);
  assert.equal(apple.native_capture_observation_required, true);

  const web = policy.evaluateProtectedView(input({ runtime: 'WEB' }));
  assert.equal(web.native_secure_surface_required, false);
  assert.equal(web.native_integrity_attestation_required, false);
  assert.equal(web.native_capture_observation_required, false);
});

test('unknown surface, signal, or runtime values fail closed instead of defaulting', () => {
  assert.throws(() => policy.evaluateProtectedView(input({ surface_class: 'OWNERISH' })), /surface/i);
  assert.throws(() => policy.evaluateProtectedView(input({ integrity_state: 'MAYBE' })), /integrity/i);
  assert.throws(() => policy.evaluateProtectedView(input({ capture_state: 'MAYBE' })), /capture/i);
  assert.throws(() => policy.evaluateProtectedView(input({ app_access_risk: 'MAYBE' })), /risk/i);
  assert.throws(() => policy.evaluateProtectedView(input({ runtime: 'BROWSERISH' })), /runtime/i);
});

test('native integration documentation is truthful about Android, Apple, web, and physical-camera limits', () => {
  const doc = fs.readFileSync(docPath, 'utf8');

  assert.match(doc, /FLAG_SECURE/);
  assert.match(doc, /Play Integrity/);
  assert.match(doc, /app[- ]access[- ]risk/i);
  assert.match(doc, /app[- ]switcher/i);
  assert.match(doc, /capture state/i);
  assert.match(doc, /screenshot event/i);
  assert.match(doc, /App Attest/);
  assert.match(doc, /short[- ]lived/i);
  assert.match(doc, /watermark/i);
  assert.match(doc, /strict authorization/i);
  assert.match(doc, /physical camera/i);
  assert.match(doc, /impossible|cannot prevent/i);
  assert.match(doc, /no client secret/i);
});

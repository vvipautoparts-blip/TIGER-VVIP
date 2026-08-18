'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = '../scripts/security/soa/owner-access-policy.js';

test('SOA owner policy module exists and exports frozen 2026 security invariants', () => {
  const policy = require(modulePath);
  assert.equal(policy.MAX_L4_LEASE_SECONDS, 120);
  assert.equal(policy.TOTAL_CREDENTIAL_LOSS_L4_HOLD_SECONDS, 86400);
  assert.deepEqual(policy.AUTHORITY_STATES, ['PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED']);
  assert.equal(Object.isFrozen(policy.AUTHORITY_STATES), true);
});

test('OWNER activation requires verified authority plus passkey, TOTP and backup codes', () => {
  const { canActivateOwnerAuthority } = require(modulePath);
  const base = { authorityStatus: 'VERIFIED', factors: { passkey: true, totp: true, backupCodes: true } };
  assert.deepEqual(canActivateOwnerAuthority(base), { ok: true, code: 'OWNER_ACTIVATION_READY' });
  for (const factor of ['passkey', 'totp', 'backupCodes']) {
    const factors = { ...base.factors, [factor]: false };
    assert.equal(canActivateOwnerAuthority({ ...base, factors }).ok, false);
  }
  assert.equal(canActivateOwnerAuthority({ ...base, authorityStatus: 'PENDING' }).ok, false);
});

test('legacy admin roles never create sovereign OWNER authority', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  for (const legacyRole of ['admin', 'super_admin']) {
    const result = evaluateOwnerAccess({
      legacyRole,
      authority: null,
      security: null,
      auth: { sessionAuthenticated: true, mfaVerifiedAt: '2026-08-13T13:00:00.000Z', reverifiedAt: '2026-08-13T13:00:00.000Z' },
      requiredLevel: 'L1',
    }, { now: () => '2026-08-13T13:01:00.000Z' });
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'ERR_OWNER_AUTHORITY_MISSING');
  }
});

test('authority must be ACTIVE and fail closed for missing or malformed context', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  assert.equal(evaluateOwnerAccess(null).code, 'ERR_OWNER_CONTEXT_INVALID');
  assert.equal(evaluateOwnerAccess({}).code, 'ERR_OWNER_CONTEXT_INVALID');
  for (const status of ['PENDING', 'VERIFIED', 'SUSPENDED', 'REVOKED']) {
    const result = evaluateOwnerAccess({
      authority: { status, clerkUserId: 'user_1' },
      security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: false },
      auth: { clerkUserId: 'user_1', sessionAuthenticated: true },
      requiredLevel: 'L1',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'ERR_OWNER_AUTHORITY_INACTIVE');
  }
});

test('identity binding mismatch is denied even with ACTIVE authority', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  const result = evaluateOwnerAccess({
    authority: { status: 'ACTIVE', clerkUserId: 'owner_expected' },
    security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: false },
    auth: { clerkUserId: 'attacker', sessionAuthenticated: true },
    requiredLevel: 'L1',
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ERR_OWNER_IDENTITY_BINDING_MISMATCH');
});

test('kill switch, recovery and security hold all fail closed', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  const base = {
    authority: { status: 'ACTIVE', clerkUserId: 'owner_1' },
    security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: false },
    auth: { clerkUserId: 'owner_1', sessionAuthenticated: true },
    requiredLevel: 'L1',
  };
  assert.equal(evaluateOwnerAccess({ ...base, security: { ...base.security, killSwitch: true } }).code, 'ERR_OWNER_KILL_SWITCH');
  assert.equal(evaluateOwnerAccess({ ...base, security: { ...base.security, recoveryState: 'PENDING' } }).code, 'ERR_OWNER_RECOVERY_PENDING');
  assert.equal(evaluateOwnerAccess({ ...base, security: { ...base.security, holdState: 'ACTIVE' } }).code, 'ERR_OWNER_SECURITY_HOLD');
});

test('assurance requirements increase from L1 to L4 and stale proof is denied', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  const base = {
    authority: { status: 'ACTIVE', clerkUserId: 'owner_1' },
    security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: true },
    auth: {
      clerkUserId: 'owner_1', sessionAuthenticated: true,
      mfaVerifiedAt: '2026-08-13T13:00:00.000Z',
      reverifiedAt: '2026-08-13T13:00:00.000Z',
    },
  };
  const clock = { now: () => '2026-08-13T13:01:00.000Z' };
  for (const level of ['L1', 'L2', 'L3', 'L4']) {
    assert.equal(evaluateOwnerAccess({ ...base, requiredLevel: level }, clock).allowed, true, level);
  }
  const stale = evaluateOwnerAccess({ ...base, requiredLevel: 'L4', auth: { ...base.auth, reverifiedAt: '2026-08-13T12:58:00.000Z' } }, clock);
  assert.equal(stale.allowed, false);
  assert.equal(stale.code, 'ERR_OWNER_REVERIFICATION_REQUIRED');
});

test('L4 cannot be used while L4 security state is disabled', () => {
  const { evaluateOwnerAccess } = require(modulePath);
  const result = evaluateOwnerAccess({
    authority: { status: 'ACTIVE', clerkUserId: 'owner_1' },
    security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: false },
    auth: { clerkUserId: 'owner_1', sessionAuthenticated: true, mfaVerifiedAt: '2026-08-13T13:00:00.000Z', reverifiedAt: '2026-08-13T13:00:00.000Z' },
    requiredLevel: 'L4',
  }, { now: () => '2026-08-13T13:01:00.000Z' });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ERR_OWNER_L4_DISABLED');
});

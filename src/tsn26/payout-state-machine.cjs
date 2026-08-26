'use strict';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const STATES = Object.freeze({
  PAYOUT_PROFILE_PENDING: 'PAYOUT_PROFILE_PENDING',
  IDENTITY_VALIDATED: 'IDENTITY_VALIDATED',
  PAYOUT_DESTINATION_VERIFIED: 'PAYOUT_DESTINATION_VERIFIED',
  FINANCIALLY_ACTIVE: 'FINANCIALLY_ACTIVE',
  FINANCIAL_PRIVILEGE_SUSPENDED: 'FINANCIAL_PRIVILEGE_SUSPENDED',
  REVOKED: 'REVOKED',
});

const ALLOWED_ROLES = new Set([
  'OWNER',
  'PARTNER_1',
  'PARTNER_2',
  'PARTNER_3',
  'GENERAL_MANAGER',
  'SECTOR_MANAGER',
  'MARKETER',
]);

function iso(value, code) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return { ms, value: new Date(ms).toISOString() };
}

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function freezeProfile(profile) {
  return Object.freeze({
    ...profile,
    extensions: Object.freeze(profile.extensions.map((item) => Object.freeze({ ...item }))),
    history: Object.freeze(profile.history.map((item) => Object.freeze({ ...item }))),
  });
}

function createPayoutProfile({ subjectUid, role, grantedAt }) {
  nonEmpty(subjectUid, 'TSN26_PAYOUT_SUBJECT_REQUIRED');
  nonEmpty(role, 'TSN26_PAYOUT_ROLE_REQUIRED');
  if (!ALLOWED_ROLES.has(role)) throw new Error(`TSN26_INVALID_PAYOUT_ROLE:${role}`);
  const grant = iso(grantedAt, 'TSN26_INVALID_GRANTED_AT');
  const deadlineAt = new Date(grant.ms + TWELVE_HOURS_MS).toISOString();
  return freezeProfile({
    subjectUid,
    role,
    grantedAt: grant.value,
    deadlineAt,
    state: STATES.PAYOUT_PROFILE_PENDING,
    identityValidated: false,
    payoutDestinationVerified: false,
    payoutDestinationRef: null,
    extensions: [],
    history: [{ event: 'ROLE_GRANTED', at: grant.value, actorUid: 'SYSTEM' }],
  });
}

function assertChronology(profile, at) {
  const eventAt = iso(at, 'TSN26_INVALID_PAYOUT_EVENT_TIME');
  const last = profile.history.at(-1);
  if (last && eventAt.ms < Date.parse(last.at)) {
    throw new Error('TSN26_PAYOUT_EVENT_TIME_REGRESSION');
  }
  return eventAt;
}

function deriveState(identityValidated, payoutDestinationVerified) {
  if (identityValidated && payoutDestinationVerified) return STATES.FINANCIALLY_ACTIVE;
  if (identityValidated) return STATES.IDENTITY_VALIDATED;
  if (payoutDestinationVerified) return STATES.PAYOUT_DESTINATION_VERIFIED;
  return STATES.PAYOUT_PROFILE_PENDING;
}

function transitionPayoutProfile(profile, eventInput) {
  if (!profile || typeof profile !== 'object') throw new Error('TSN26_PAYOUT_PROFILE_REQUIRED');
  if (profile.state === STATES.REVOKED) throw new Error('TSN26_TERMINAL_PAYOUT_STATE');
  const event = nonEmpty(eventInput?.event, 'TSN26_PAYOUT_EVENT_REQUIRED');
  const actorUid = nonEmpty(eventInput?.actorUid, 'TSN26_PAYOUT_EVENT_ACTOR_REQUIRED');
  const at = assertChronology(profile, eventInput?.at);

  if (event === 'REVOKED') {
    const reason = nonEmpty(eventInput?.reason, 'TSN26_REVOKE_REASON_REQUIRED');
    return freezeProfile({
      ...profile,
      state: STATES.REVOKED,
      history: [...profile.history, { event, at: at.value, actorUid, reason }],
    });
  }

  if (profile.state === STATES.FINANCIAL_PRIVILEGE_SUSPENDED) {
    throw new Error('TSN26_SUSPENDED_PROFILE_REQUIRES_EXPLICIT_REACTIVATION');
  }

  let identityValidated = profile.identityValidated;
  let payoutDestinationVerified = profile.payoutDestinationVerified;
  let payoutDestinationRef = profile.payoutDestinationRef;
  const historyEntry = { event, at: at.value, actorUid };

  if (event === 'IDENTITY_VALIDATED') {
    identityValidated = true;
  } else if (event === 'PAYOUT_DESTINATION_VERIFIED') {
    payoutDestinationRef = nonEmpty(eventInput?.destinationRef, 'TSN26_PAYOUT_DESTINATION_REQUIRED');
    payoutDestinationVerified = true;
    historyEntry.destinationRef = payoutDestinationRef;
  } else {
    throw new Error(`TSN26_UNSUPPORTED_PAYOUT_EVENT:${event}`);
  }

  return freezeProfile({
    ...profile,
    identityValidated,
    payoutDestinationVerified,
    payoutDestinationRef,
    state: deriveState(identityValidated, payoutDestinationVerified),
    history: [...profile.history, historyEntry],
  });
}

function applyDeadline(profile, { at }) {
  if (!profile || typeof profile !== 'object') throw new Error('TSN26_PAYOUT_PROFILE_REQUIRED');
  if (profile.state === STATES.REVOKED || profile.state === STATES.FINANCIALLY_ACTIVE) return profile;
  const now = iso(at, 'TSN26_INVALID_DEADLINE_CHECK_TIME');
  if (now.ms <= Date.parse(profile.deadlineAt)) return profile;

  return freezeProfile({
    ...profile,
    state: STATES.FINANCIAL_PRIVILEGE_SUSPENDED,
    history: [
      ...profile.history,
      {
        event: 'PAYOUT_DEADLINE_EXPIRED',
        at: now.value,
        actorUid: 'SYSTEM',
        reason: 'REQUIRED_PAYOUT_VERIFICATION_INCOMPLETE',
      },
    ],
  });
}

function extendPayoutDeadline(profile, { extensionUntil, grantedBy, grantedAt, reason }) {
  if (!profile || typeof profile !== 'object') throw new Error('TSN26_PAYOUT_PROFILE_REQUIRED');
  if (profile.state === STATES.REVOKED) throw new Error('TSN26_TERMINAL_PAYOUT_STATE');
  nonEmpty(grantedBy, 'TSN26_EXTENSION_ACTOR_REQUIRED');
  nonEmpty(reason, 'TSN26_EXTENSION_REASON_REQUIRED');
  const granted = iso(grantedAt, 'TSN26_INVALID_EXTENSION_GRANTED_AT');
  const until = iso(extensionUntil, 'TSN26_INVALID_EXTENSION_UNTIL');
  if (until.ms <= granted.ms) throw new Error('TSN26_EXTENSION_MUST_BE_FUTURE');
  if (granted.ms > Date.parse(profile.deadlineAt)) {
    throw new Error('TSN26_EXTENSION_AFTER_DEADLINE_FORBIDDEN');
  }
  if (until.ms <= Date.parse(profile.deadlineAt)) {
    throw new Error('TSN26_EXTENSION_MUST_EXTEND_DEADLINE');
  }

  const extension = {
    previousDeadlineAt: profile.deadlineAt,
    extensionUntil: until.value,
    grantedBy,
    grantedAt: granted.value,
    reason,
  };

  return freezeProfile({
    ...profile,
    deadlineAt: until.value,
    extensions: [...profile.extensions, extension],
    history: [
      ...profile.history,
      { event: 'PAYOUT_DEADLINE_EXTENDED', at: granted.value, actorUid: grantedBy, reason, extensionUntil: until.value },
    ],
  });
}

function reactivateSuspendedPayoutProfile(profile, { newDeadlineAt, grantedBy, grantedAt, reason }) {
  if (!profile || typeof profile !== 'object') throw new Error('TSN26_PAYOUT_PROFILE_REQUIRED');
  if (profile.state !== STATES.FINANCIAL_PRIVILEGE_SUSPENDED) {
    throw new Error('TSN26_REACTIVATION_REQUIRES_SUSPENDED_STATE');
  }
  nonEmpty(grantedBy, 'TSN26_REACTIVATION_ACTOR_REQUIRED');
  nonEmpty(reason, 'TSN26_REACTIVATION_REASON_REQUIRED');
  const granted = iso(grantedAt, 'TSN26_INVALID_REACTIVATION_GRANTED_AT');
  const deadline = iso(newDeadlineAt, 'TSN26_INVALID_REACTIVATION_DEADLINE');
  if (deadline.ms <= granted.ms) {
    throw new Error('TSN26_REACTIVATION_DEADLINE_MUST_BE_FUTURE');
  }
  const last = profile.history.at(-1);
  if (last && granted.ms < Date.parse(last.at)) {
    throw new Error('TSN26_PAYOUT_EVENT_TIME_REGRESSION');
  }

  const state = deriveState(profile.identityValidated, profile.payoutDestinationVerified);
  return freezeProfile({
    ...profile,
    deadlineAt: deadline.value,
    state,
    history: [
      ...profile.history,
      {
        event: 'PAYOUT_PROFILE_REACTIVATED',
        at: granted.value,
        actorUid: grantedBy,
        reason,
        newDeadlineAt: deadline.value,
      },
    ],
  });
}

function assertExternalPayoutEligible(profile, { at }) {
  const checked = applyDeadline(profile, { at });
  if (
    checked.state !== STATES.FINANCIALLY_ACTIVE ||
    checked.identityValidated !== true ||
    checked.payoutDestinationVerified !== true ||
    !checked.payoutDestinationRef
  ) {
    throw new Error(`TSN26_PAYOUT_NOT_ELIGIBLE:${checked.state}`);
  }
  return true;
}

module.exports = {
  TWELVE_HOURS_MS,
  STATES,
  createPayoutProfile,
  transitionPayoutProfile,
  applyDeadline,
  extendPayoutDeadline,
  reactivateSuspendedPayoutProfile,
  assertExternalPayoutEligible,
};

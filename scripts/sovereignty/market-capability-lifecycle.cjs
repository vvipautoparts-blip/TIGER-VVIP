'use strict';

const STATES = Object.freeze([
  'ABSENT',
  'DEFINED',
  'EVIDENCED',
  'OWNER_SEALED',
  'DARK',
  'CANARY',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
]);

const STATE_SET = new Set(STATES);
const FORWARD = Object.freeze({
  ABSENT: Object.freeze(['DEFINED']),
  DEFINED: Object.freeze(['EVIDENCED', 'SUSPENDED', 'REVOKED']),
  EVIDENCED: Object.freeze(['OWNER_SEALED', 'SUSPENDED', 'REVOKED']),
  OWNER_SEALED: Object.freeze(['DARK', 'SUSPENDED', 'REVOKED']),
  DARK: Object.freeze(['CANARY', 'SUSPENDED', 'REVOKED']),
  CANARY: Object.freeze(['ACTIVE', 'SUSPENDED', 'REVOKED']),
  ACTIVE: Object.freeze(['SUSPENDED', 'REVOKED']),
  SUSPENDED: Object.freeze(['EVIDENCED', 'REVOKED']),
  REVOKED: Object.freeze([])
});

function lifecycleError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function assertState(state) {
  if (!STATE_SET.has(state)) throw lifecycleError('SGF_CAPABILITY_STATE_INVALID');
  return state;
}

function canTransition(from, to) {
  if (!STATE_SET.has(from) || !STATE_SET.has(to)) return false;
  return FORWARD[from].includes(to);
}

function assertTransition(from, to) {
  assertState(from);
  assertState(to);
  if (!canTransition(from, to)) throw lifecycleError('SGF_CAPABILITY_TRANSITION_DENIED');
  return to;
}

function isFullyActive(state) {
  assertState(state);
  return state === 'ACTIVE';
}

module.exports = Object.freeze({
  STATES,
  canTransition,
  assertTransition,
  isFullyActive
});

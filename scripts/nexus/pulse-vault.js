const LEVELS = Object.freeze(new Set([
  'PULSE_2',
  'PULSE_10',
  'PULSE_25',
  'PULSE_45'
]));

const MODES = Object.freeze(new Set([
  'NOW',
  'SMART',
  'PRECISE'
]));

function denial(code) {
  return Object.freeze({ ok: false, code });
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function derivePulseVault(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return denial('PULSE_SNAPSHOT_INVALID');
  }

  if (!LEVELS.has(snapshot.level)) {
    return denial('PULSE_LEVEL_INVALID');
  }

  if (!MODES.has(snapshot.mode)) {
    return denial('PULSE_MODE_INVALID');
  }

  const { total, consumed, allocated } = snapshot;
  if (!safeCount(total)
    || !safeCount(consumed)
    || !safeCount(allocated)
    || consumed > total
    || allocated > (total - consumed)) {
    return denial('PULSE_BALANCE_INVALID');
  }

  return Object.freeze({
    ok: true,
    code: 'OK',
    level: snapshot.level,
    total,
    consumed,
    allocated,
    available: total - allocated,
    remaining: total - consumed,
    mode: snapshot.mode,
    expiresAt: null
  });
}

export const PULSE_VAULT_LEVELS = Object.freeze([...LEVELS]);
export const PULSE_VAULT_MODES = Object.freeze([...MODES]);

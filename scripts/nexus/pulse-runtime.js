const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES = new Set(['NOW', 'SMART', 'PRECISE']);
const STATES = new Set(['ACTIVE', 'PAUSED', 'DEPLETED', 'FROZEN']);
const OPPORTUNITY_STATES = new Set(['LOW', 'BALANCED', 'STRONG', 'FROZEN']);

function pulseError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validKey(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 180;
}

function normalizeMode(value) {
  if (typeof value !== 'string') return null;
  const mode = value.trim().toUpperCase();
  return MODES.has(mode) ? mode : null;
}

function normalizeGroup(group) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return null;
  const mode = normalizeMode(group.mode);
  const state = typeof group.state === 'string' ? group.state.trim().toUpperCase() : '';
  const opportunityState = typeof group.opportunityState === 'string' ? group.opportunityState.trim().toUpperCase() : '';
  if (!UUID.test(String(group.allocationGroupId || '')) || !UUID.test(String(group.postId || ''))
      || !mode || !STATES.has(state) || !OPPORTUNITY_STATES.has(opportunityState)) return null;
  const fields = ['allocated', 'consumed', 'released', 'remaining'];
  if (!fields.every((key) => safeCount(group[key]))) return null;
  if (group.consumed + group.released + group.remaining !== group.allocated) return null;
  return Object.freeze({
    allocationGroupId: group.allocationGroupId,
    postId: group.postId,
    mode,
    state,
    opportunityState,
    allocated: group.allocated,
    consumed: group.consumed,
    released: group.released,
    remaining: group.remaining
  });
}

function normalizeVault(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.ok !== true) return null;
  if (![data.granted, data.available, data.allocated, data.consumed].every(safeCount)) return null;
  if (data.available + data.allocated + data.consumed !== data.granted) return null;
  if (data.expiresAt !== null || !Array.isArray(data.groups) || data.groups.length > 500) return null;
  const groups = [];
  for (const group of data.groups) {
    const normalized = normalizeGroup(group);
    if (!normalized) return null;
    groups.push(normalized);
  }
  return Object.freeze({
    ok: true,
    granted: data.granted,
    available: data.available,
    allocated: data.allocated,
    consumed: data.consumed,
    remaining: data.available + data.allocated,
    expiresAt: null,
    groups: Object.freeze(groups)
  });
}

async function rpc(client, name, args, allowNull = false) {
  let response;
  try {
    response = await client.rpc(name, args);
  } catch (cause) {
    throw pulseError('PULSE_RPC_FAILED', cause);
  }
  if (!response || response.error || (!allowNull && (response.data === null || response.data === undefined))) {
    throw pulseError('PULSE_RPC_FAILED', response && response.error);
  }
  return response.data;
}

function assertUuid(value, code) {
  if (typeof value !== 'string' || !UUID.test(value)) throw pulseError(code);
  return value;
}

function assertKey(value) {
  if (!validKey(value)) throw pulseError('PULSE_IDEMPOTENCY_KEY_INVALID');
  return value;
}

export function createPulseRuntime(client) {
  if (!client || typeof client.rpc !== 'function') throw pulseError('PULSE_CLIENT_REQUIRED');

  return Object.freeze({
    async ownedObjects() {
      const data = await rpc(client, 'vvip_nexus_owned_pulse_objects', { p_limit: 200 }, true);
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.ok !== true || !Array.isArray(data.items) || data.items.length > 200) {
        throw pulseError('PULSE_OWNED_OBJECTS_INVALID');
      }
      const ids = [];
      const seen = new Set();
      for (const item of data.items) {
        const postId = item && typeof item === 'object' ? item.postId : null;
        if (!UUID.test(String(postId || '')) || seen.has(postId)) throw pulseError('PULSE_OWNED_OBJECTS_INVALID');
        seen.add(postId);
        ids.push(postId);
      }
      return Object.freeze(ids);
    },

    async readVault() {
      const data = await rpc(client, 'vvip_pulse_vault_read', undefined, true);
      const normalized = normalizeVault(data);
      if (!normalized) throw pulseError('PULSE_VAULT_SNAPSHOT_INVALID');
      return normalized;
    },

    async allocate(input = {}) {
      const postId = assertUuid(input.postId, 'PULSE_OBJECT_ID_INVALID');
      if (!Number.isSafeInteger(input.units) || input.units <= 0) throw pulseError('PULSE_ALLOCATION_UNITS_INVALID');
      const mode = normalizeMode(input.mode);
      if (!mode) throw pulseError('PULSE_MODE_INVALID');
      const idempotencyKey = assertKey(input.idempotencyKey);
      return rpc(client, 'vvip_pulse_allocate', {
        p_post_id: postId,
        p_requested_units: input.units,
        p_mode: mode,
        p_idempotency_key: idempotencyKey
      });
    },

    async pause(input = {}) {
      const allocationGroupId = assertUuid(input.allocationGroupId, 'PULSE_ALLOCATION_ID_INVALID');
      const idempotencyKey = assertKey(input.idempotencyKey);
      return rpc(client, 'vvip_pulse_pause_allocation', {
        p_allocation_group_id: allocationGroupId,
        p_idempotency_key: idempotencyKey
      });
    },

    async setMode(input = {}) {
      const allocationGroupId = assertUuid(input.allocationGroupId, 'PULSE_ALLOCATION_ID_INVALID');
      const mode = normalizeMode(input.mode);
      if (!mode) throw pulseError('PULSE_MODE_INVALID');
      const idempotencyKey = assertKey(input.idempotencyKey);
      return rpc(client, 'vvip_pulse_mode_set', {
        p_allocation_group_id: allocationGroupId,
        p_mode: mode,
        p_idempotency_key: idempotencyKey
      });
    }
  });
}

export const PULSE_RUNTIME_MODES = Object.freeze([...MODES]);

'use strict';

const UNAVAILABLE = Object.freeze({
  ok: false,
  reason_code: 'DURABLE_REPLAY_UNAVAILABLE',
});

function normalizedResult(response, successCode, conflictCode) {
  if (!response || typeof response !== 'object' || response.error != null) return UNAVAILABLE;
  if (!Array.isArray(response.data) || response.data.length !== 1) return UNAVAILABLE;

  const row = response.data[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return UNAVAILABLE;
  if (typeof row.ok !== 'boolean' || typeof row.reason_code !== 'string') return UNAVAILABLE;

  if (row.ok === true && row.reason_code === successCode) {
    return Object.freeze({ ok: true, reason_code: successCode });
  }
  if (row.ok === false && row.reason_code === conflictCode) {
    return Object.freeze({ ok: false, reason_code: conflictCode });
  }
  return UNAVAILABLE;
}

function issueParams(record = {}) {
  return {
    p_authorization_nonce_hash: record.authorization_nonce_hash,
    p_capability_id: record.capability_id,
    p_request_id: record.request_id,
    p_requester_subject: record.requester_subject,
    p_owner_subject_ref: record.owner_subject_ref,
    p_ad_id: record.ad_id,
    p_sector_id: record.sector_id,
    p_country: record.country,
    p_channel: record.channel,
    p_policy_version: record.policy_version,
    p_physics_version: record.physics_version,
    p_reveal_policy_ref: record.reveal_policy_ref,
    p_reveal_authorized: record.reveal_authorized,
    p_issued_at: record.issued_at,
    p_expires_at: record.expires_at,
  };
}

function consumeParams(record = {}) {
  return {
    p_capability_id: record.capability_id,
    p_request_id: record.request_id,
    p_requester_subject: record.requester_subject,
    p_owner_subject_ref: record.owner_subject_ref,
    p_ad_id: record.ad_id,
    p_sector_id: record.sector_id,
    p_country: record.country,
    p_channel: record.channel,
    p_policy_version: record.policy_version,
    p_physics_version: record.physics_version,
  };
}

function createSupabaseDurableReplayStore(options = {}) {
  const supabase = options.supabase;
  if (!supabase || typeof supabase !== 'object' || typeof supabase.rpc !== 'function') {
    throw new TypeError('server-created supabase client with rpc is required');
  }

  async function issueCapability(record) {
    try {
      const response = await supabase.rpc(
        'issue_market_contact_capability',
        issueParams(record),
      );
      return normalizedResult(
        response,
        'CONTACT_CAPABILITY_ISSUED',
        'CONTACT_REPLAY_OR_CONFLICT',
      );
    } catch {
      return UNAVAILABLE;
    }
  }

  async function consumeCapability(record) {
    try {
      const response = await supabase.rpc(
        'consume_market_contact_capability',
        consumeParams(record),
      );
      return normalizedResult(
        response,
        'HANDOFF_CAPABILITY_CONSUMED',
        'HANDOFF_REPLAY_OR_CONFLICT',
      );
    } catch {
      return UNAVAILABLE;
    }
  }

  return Object.freeze({ issueCapability, consumeCapability });
}

module.exports = {
  createSupabaseDurableReplayStore,
};

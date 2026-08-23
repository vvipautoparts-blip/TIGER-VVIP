'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = path.join(
  __dirname,
  '..',
  'scripts',
  'marketplace',
  'supabase-durable-replay-store.js',
);

function loadFactory() {
  assert.equal(
    fs.existsSync(MODULE_PATH),
    true,
    'supabase-durable-replay-store.js must exist before the server adapter contract can pass',
  );
  return require(MODULE_PATH).createSupabaseDurableReplayStore;
}

function issueRecord(overrides = {}) {
  return {
    authorization_nonce_hash: 'a'.repeat(64),
    capability_id: 'contact_cap_001',
    request_id: 'contact_req_001',
    requester_subject: 'buyer_001',
    owner_subject_ref: 'seller_001',
    ad_id: 'ad_001',
    sector_id: 'automotive',
    country: 'JO',
    channel: 'SOCIAL_MESSAGE',
    policy_version: 'policy-2026-08',
    physics_version: '1.0.0',
    reveal_policy_ref: 'reveal-policy-v1',
    reveal_authorized: true,
    issued_at: '2026-08-23T15:00:00.000Z',
    expires_at: '2026-08-23T15:05:00.000Z',
    ...overrides,
  };
}

function consumeRecord(overrides = {}) {
  const record = issueRecord(overrides);
  return {
    capability_id: record.capability_id,
    request_id: record.request_id,
    requester_subject: record.requester_subject,
    owner_subject_ref: record.owner_subject_ref,
    ad_id: record.ad_id,
    sector_id: record.sector_id,
    country: record.country,
    channel: record.channel,
    policy_version: record.policy_version,
    physics_version: record.physics_version,
  };
}

function expectedIssueParams(record) {
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

function expectedConsumeParams(record) {
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

test('issueCapability calls only the exact issue RPC with exact bounded parameter mapping', async () => {
  const createStore = loadFactory();
  const calls = [];
  const supabase = {
    async rpc(name, params) {
      calls.push({ name, params: structuredClone(params) });
      return { data: [{ ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' }], error: null };
    },
  };
  const store = createStore({ supabase });
  const record = issueRecord();

  const result = await store.issueCapability(record);

  assert.deepEqual(result, { ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' });
  assert.deepEqual(calls, [{
    name: 'issue_market_contact_capability',
    params: expectedIssueParams(record),
  }]);
});

test('consumeCapability calls only the exact consume RPC with exact binding mapping', async () => {
  const createStore = loadFactory();
  const calls = [];
  const supabase = {
    async rpc(name, params) {
      calls.push({ name, params: structuredClone(params) });
      return { data: [{ ok: true, reason_code: 'HANDOFF_CAPABILITY_CONSUMED' }], error: null };
    },
  };
  const store = createStore({ supabase });
  const record = consumeRecord();

  const result = await store.consumeCapability(record);

  assert.deepEqual(result, { ok: true, reason_code: 'HANDOFF_CAPABILITY_CONSUMED' });
  assert.deepEqual(calls, [{
    name: 'consume_market_contact_capability',
    params: expectedConsumeParams(record),
  }]);
});

test('preserves only the two bounded replay/conflict outcomes returned by the exact RPCs', async () => {
  const createStore = loadFactory();
  const issueStore = createStore({
    supabase: {
      async rpc() {
        return { data: [{ ok: false, reason_code: 'CONTACT_REPLAY_OR_CONFLICT' }], error: null };
      },
    },
  });
  const consumeStore = createStore({
    supabase: {
      async rpc() {
        return { data: [{ ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' }], error: null };
      },
    },
  });

  assert.deepEqual(
    await issueStore.issueCapability(issueRecord()),
    { ok: false, reason_code: 'CONTACT_REPLAY_OR_CONFLICT' },
  );
  assert.deepEqual(
    await consumeStore.consumeCapability(consumeRecord()),
    { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' },
  );
});

test('RPC errors malformed data multiple rows and unexpected reason codes fail closed', async () => {
  const createStore = loadFactory();
  const malformedReplies = [
    { data: null, error: null },
    { data: [], error: null },
    { data: [{ ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' }, { ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' }], error: null },
    { data: [{ ok: 'true', reason_code: 'CONTACT_CAPABILITY_ISSUED' }], error: null },
    { data: [{ ok: true, reason_code: 'UNEXPECTED' }], error: null },
    { data: [{ ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' }], error: { message: 'db transport detail' } },
  ];

  for (const reply of malformedReplies) {
    const store = createStore({ supabase: { async rpc() { return reply; } } });
    const result = await store.issueCapability(issueRecord());
    assert.deepEqual(result, { ok: false, reason_code: 'DURABLE_REPLAY_UNAVAILABLE' });
    assert.equal(JSON.stringify(result).includes('transport'), false);
  }
});

test('RPC exceptions are opaque and service-role credential strings are never accepted as a client', async () => {
  const createStore = loadFactory();
  const store = createStore({
    supabase: {
      async rpc() {
        throw new Error('service role credential or transport detail');
      },
    },
  });

  assert.deepEqual(
    await store.issueCapability(issueRecord()),
    { ok: false, reason_code: 'DURABLE_REPLAY_UNAVAILABLE' },
  );
  assert.deepEqual(
    await store.consumeCapability(consumeRecord()),
    { ok: false, reason_code: 'DURABLE_REPLAY_UNAVAILABLE' },
  );

  assert.throws(
    () => createStore({ supabase: 'service-role-key-must-not-be-accepted' }),
    /supabase/i,
  );
});

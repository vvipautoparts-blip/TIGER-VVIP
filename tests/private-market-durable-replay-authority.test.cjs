'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = path.join(__dirname, '..', 'scripts', 'marketplace', 'durable-replay-authority.js');

function loadAuthorityFactory() {
  assert.equal(
    fs.existsSync(MODULE_PATH),
    true,
    'durable-replay-authority.js must exist before the durable replay contract can pass',
  );
  return require(MODULE_PATH).createDurableReplayAuthority;
}

function validCapability(overrides = {}) {
  return {
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

function createSharedStore() {
  const nonceHashes = new Set();
  const capabilities = new Map();

  return {
    issuedRecords: [],
    consumedRecords: [],

    async issueCapability(record) {
      this.issuedRecords.push(structuredClone(record));
      if (nonceHashes.has(record.authorization_nonce_hash) || capabilities.has(record.capability_id)) {
        return { ok: false, reason_code: 'CONTACT_REPLAY_OR_CONFLICT' };
      }
      nonceHashes.add(record.authorization_nonce_hash);
      capabilities.set(record.capability_id, structuredClone(record));
      return { ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' };
    },

    async consumeCapability(record) {
      this.consumedRecords.push(structuredClone(record));
      const stored = capabilities.get(record.capability_id);
      if (!stored || stored.consumed_at) {
        return { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' };
      }
      for (const field of [
        'requester_subject',
        'ad_id',
        'channel',
        'policy_version',
        'physics_version',
      ]) {
        if (stored[field] !== record[field]) {
          return { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' };
        }
      }
      stored.consumed_at = '2026-08-23T15:01:00.000Z';
      capabilities.set(record.capability_id, stored);
      return { ok: true, reason_code: 'HANDOFF_CAPABILITY_CONSUMED' };
    },
  };
}

test('hashes the raw nonce before persistence and never returns private replay material', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const store = createSharedStore();
  const authority = createDurableReplayAuthority({ store });

  const result = await authority.issueAuthorization({
    nonce: 'nonce-super-secret-001',
    capability: validCapability(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason_code, 'CONTACT_CAPABILITY_ISSUED');
  assert.equal(store.issuedRecords.length, 1);
  assert.match(store.issuedRecords[0].authorization_nonce_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(store.issuedRecords[0].authorization_nonce_hash, 'nonce-super-secret-001');
  assert.equal(JSON.stringify(store.issuedRecords[0]).includes('nonce-super-secret-001'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'nonce'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'authorization_nonce_hash'), false);
});

test('two runtime instances sharing one store cannot issue the same authorization nonce twice', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const store = createSharedStore();
  const runtimeA = createDurableReplayAuthority({ store });
  const runtimeB = createDurableReplayAuthority({ store });

  const first = await runtimeA.issueAuthorization({
    nonce: 'nonce-shared-001',
    capability: validCapability({ capability_id: 'contact_cap_a' }),
  });
  const replay = await runtimeB.issueAuthorization({
    nonce: 'nonce-shared-001',
    capability: validCapability({ capability_id: 'contact_cap_b' }),
  });

  assert.equal(first.ok, true);
  assert.equal(replay.ok, false);
  assert.equal(replay.reason_code, 'CONTACT_REPLAY_OR_CONFLICT');
});

test('two runtime instances sharing one store cannot consume the same handoff capability twice', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const store = createSharedStore();
  const runtimeA = createDurableReplayAuthority({ store });
  const runtimeB = createDurableReplayAuthority({ store });
  const capability = validCapability({ capability_id: 'contact_cap_shared' });

  const issued = await runtimeA.issueAuthorization({ nonce: 'nonce-consume-001', capability });
  assert.equal(issued.ok, true);

  const first = await runtimeA.consumeHandoff({ capability, actor_subject: 'buyer_001' });
  const replay = await runtimeB.consumeHandoff({ capability, actor_subject: 'buyer_001' });

  assert.equal(first.ok, true);
  assert.equal(first.reason_code, 'HANDOFF_CAPABILITY_CONSUMED');
  assert.equal(replay.ok, false);
  assert.equal(replay.reason_code, 'HANDOFF_REPLAY_OR_CONFLICT');
});

test('binding mismatch fails closed before the store can grant a handoff', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const store = createSharedStore();
  const authority = createDurableReplayAuthority({ store });
  const capability = validCapability();

  const issued = await authority.issueAuthorization({ nonce: 'nonce-binding-001', capability });
  assert.equal(issued.ok, true);

  const result = await authority.consumeHandoff({
    capability: { ...capability, ad_id: 'ad_tampered' },
    actor_subject: 'buyer_001',
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason_code, 'HANDOFF_REPLAY_OR_CONFLICT');
});

test('storage rejection, malformed storage replies, and storage exceptions fail closed without raw errors', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const capability = validCapability();

  for (const store of [
    {
      async issueCapability() { return { ok: false, reason_code: 'CONTACT_REPLAY_OR_CONFLICT' }; },
      async consumeCapability() { return { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' }; },
    },
    {
      async issueCapability() { return { surprise: true }; },
      async consumeCapability() { return { surprise: true }; },
    },
    {
      async issueCapability() { throw new Error('database credential or transport detail'); },
      async consumeCapability() { throw new Error('database credential or transport detail'); },
    },
  ]) {
    const authority = createDurableReplayAuthority({ store });
    const issue = await authority.issueAuthorization({ nonce: 'nonce-fail-001', capability });
    assert.equal(issue.ok, false);
    assert.ok(['CONTACT_REPLAY_OR_CONFLICT', 'DURABLE_REPLAY_UNAVAILABLE'].includes(issue.reason_code));
    assert.equal(JSON.stringify(issue).includes('credential'), false);

    const consume = await authority.consumeHandoff({ capability, actor_subject: 'buyer_001' });
    assert.equal(consume.ok, false);
    assert.ok(['HANDOFF_REPLAY_OR_CONFLICT', 'DURABLE_REPLAY_UNAVAILABLE'].includes(consume.reason_code));
    assert.equal(JSON.stringify(consume).includes('credential'), false);
  }
});

test('rejects incomplete capability bindings instead of persisting ambiguous authority', async () => {
  const createDurableReplayAuthority = loadAuthorityFactory();
  const store = createSharedStore();
  const authority = createDurableReplayAuthority({ store });

  for (const field of [
    'capability_id',
    'request_id',
    'requester_subject',
    'owner_subject_ref',
    'ad_id',
    'sector_id',
    'country',
    'channel',
    'policy_version',
    'physics_version',
    'issued_at',
    'expires_at',
  ]) {
    const capability = validCapability();
    delete capability[field];
    const result = await authority.issueAuthorization({ nonce: `nonce-missing-${field}`, capability });
    assert.equal(result.ok, false, `${field} must be required`);
    assert.equal(result.reason_code, 'DURABLE_REPLAY_INPUT_INVALID');
  }

  assert.equal(store.issuedRecords.length, 0);
});

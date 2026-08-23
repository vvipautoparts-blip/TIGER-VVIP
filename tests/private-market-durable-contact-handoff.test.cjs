'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { CONTACT_STATES } = require('../scripts/marketplace/private-market-contracts.js');

const MODULE_PATH = path.join(__dirname, '..', 'scripts', 'marketplace', 'durable-contact-handoff.js');
const NOW = '2026-08-23T16:00:00.000Z';

function loadFactory() {
  assert.equal(
    fs.existsSync(MODULE_PATH),
    true,
    'durable-contact-handoff.js must exist before the durable runtime composition contract can pass',
  );
  return require(MODULE_PATH).createDurableContactHandoff;
}

function validGenome(overrides = {}) {
  return {
    identity: {
      ad_id: 'ad_001',
      owner_subject: 'seller_001',
      source_type: 'LISTING',
      source_revision: 4,
      created_at: '2026-08-23T10:00:00.000Z',
      updated_at: '2026-08-23T15:00:00.000Z',
      provenance_state: 'VERIFIED',
      moderation_state: 'APPROVED',
      country: 'JO',
      policy_version: 'policy-2026-08',
    },
    taxonomy: {
      sector_id: 'automotive',
      category_id: 'parts',
      subcategory_id: 'brake-pad',
      entity_type: 'AUTO_PART',
      offer_mode: 'OFFER',
      attributes: { part_type: 'brake-pad', make: 'Hyundai', model: 'Kona', fitment_year: 2020 },
    },
    discovery: {
      title: 'Brake pads',
      summary: 'Front brake pad set',
      searchable_tokens: ['brake', 'pad', 'kona'],
      coarse_geo: { country: 'JO', city: 'Amman' },
      freshness_state: 'FRESH',
      expires_at: '2026-08-24T00:00:00.000Z',
    },
    advertising: {
      organic_eligibility_state: 'ELIGIBLE',
      sponsorship_eligibility_state: 'ELIGIBLE',
      sponsored: false,
      pulse_campaign_ref: null,
      delivery_market: 'JO',
      labeling_requirement: false,
      verified_viewability_eligible: true,
    },
    contact: {
      contact_capability_class: CONTACT_STATES.CONTACT_REQUIRES_REVEAL,
      reveal_policy_ref: 'reveal-policy-v1',
      safe_public_display_identity: 'Seller',
      allowed_handoff_channels: ['SOCIAL_MESSAGE'],
      blocked_by_policy: false,
    },
    ...overrides,
  };
}

function validPhysics(overrides = {}) {
  return {
    sector_id: 'automotive',
    version: '1.0.0',
    allowed_entity_types: ['AUTO_PART'],
    forbidden_entity_types: ['WHOLE_VEHICLE'],
    contact_modes: ['SOCIAL_MESSAGE'],
    hard_invariants: {
      transaction_features_forbidden: true,
      sponsored_cannot_bypass_eligibility: true,
      whole_vehicle_ads_forbidden: true,
    },
    ...overrides,
  };
}

function validRequest(overrides = {}) {
  return {
    request_id: 'contact_req_001',
    actor_subject: 'buyer_001',
    ad_id: 'ad_001',
    channel: 'SOCIAL_MESSAGE',
    nonce: 'nonce_001',
    requested_at: NOW,
    ...overrides,
  };
}

function validAuthority(overrides = {}) {
  return {
    actor_subject: 'buyer_001',
    country: 'JO',
    policy_version: 'policy-2026-08',
    reveal_allowed: true,
    reveal_policy_ref: 'reveal-policy-v1',
    ...overrides,
  };
}

function contactInput(overrides = {}) {
  return {
    request: validRequest(),
    genome: validGenome(),
    physics: validPhysics(),
    authority: validAuthority(),
    ...overrides,
  };
}

function createSharedStore(options = {}) {
  const nonceHashes = new Set();
  const capabilities = new Map();

  return {
    issueCalls: 0,
    consumeCalls: 0,

    async issueCapability(record) {
      this.issueCalls += 1;
      if (options.failIssue) throw new Error('database credential or transport detail');
      if (nonceHashes.has(record.authorization_nonce_hash) || capabilities.has(record.capability_id)) {
        return { ok: false, reason_code: 'CONTACT_REPLAY_OR_CONFLICT' };
      }
      nonceHashes.add(record.authorization_nonce_hash);
      capabilities.set(record.capability_id, { ...structuredClone(record), consumed_at: null });
      return { ok: true, reason_code: 'CONTACT_CAPABILITY_ISSUED' };
    },

    async consumeCapability(record) {
      this.consumeCalls += 1;
      if (options.failConsume) throw new Error('database credential or transport detail');
      const stored = capabilities.get(record.capability_id);
      if (!stored || stored.consumed_at) {
        return { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' };
      }
      for (const field of [
        'request_id', 'requester_subject', 'owner_subject_ref', 'ad_id', 'sector_id',
        'country', 'channel', 'policy_version', 'physics_version',
      ]) {
        if (stored[field] !== record[field]) {
          return { ok: false, reason_code: 'HANDOFF_REPLAY_OR_CONFLICT' };
        }
      }
      stored.consumed_at = NOW;
      capabilities.set(record.capability_id, stored);
      return { ok: true, reason_code: 'HANDOFF_CAPABILITY_CONSUMED' };
    },
  };
}

function runtime(store, overrides = {}) {
  const createDurableContactHandoff = loadFactory();
  return createDurableContactHandoff({
    store,
    now: () => NOW,
    maxCapabilityTtlMs: 5 * 60 * 1000,
    ...overrides,
  });
}

test('two runtime instances sharing one durable store cannot authorize the same nonce twice', async () => {
  const store = createSharedStore();
  const runtimeA = runtime(store);
  const runtimeB = runtime(store);

  const first = await runtimeA.authorizeContact(contactInput());
  const replay = await runtimeB.authorizeContact(contactInput());

  assert.equal(first.ok, true, first.errors && first.errors.join(', '));
  assert.equal(first.state, 'CONTACT_AUTHORIZED');
  assert.equal(replay.ok, false);
  assert.ok(replay.reason_codes.includes('CONTACT_REPLAY_OR_CONFLICT'));
  assert.equal(store.issueCalls, 2);
});

test('a capability issued by one runtime can hand off on another runtime exactly once', async () => {
  const store = createSharedStore();
  const runtimeA = runtime(store);
  const runtimeB = runtime(store);
  const authorization = await runtimeA.authorizeContact(contactInput());
  assert.equal(authorization.ok, true);

  const first = await runtimeB.emitHandoff({
    capability: authorization.capability,
    actor_subject: 'buyer_001',
  });
  const replay = await runtimeA.emitHandoff({
    capability: authorization.capability,
    actor_subject: 'buyer_001',
  });

  assert.equal(first.ok, true, first.errors && first.errors.join(', '));
  assert.equal(first.state, 'HANDOFF_EMITTED');
  assert.equal(first.terminal_state, 'TIGER_MARKET_ROLE_ENDED');
  assert.equal(replay.ok, false);
  assert.ok(replay.reason_codes.includes('HANDOFF_REPLAY_OR_CONFLICT'));
  assert.equal(store.consumeCalls, 2);

  for (const forbidden of [
    'raw_intent', 'intent_text', 'email', 'phone', 'message_body', 'group_id',
    'checkout', 'order', 'transaction', 'payment_intent', 'escrow', 'settlement',
    'delivery_order', 'deal_status',
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(first.receipt, forbidden), false, `${forbidden} must not enter the receipt`);
  }
});

test('durable composition preserves actor country reveal channel whole-vehicle and private/no-transaction admission checks', async () => {
  const spoofed = await runtime(createSharedStore()).authorizeContact(contactInput({
    request: validRequest({ actor_subject: 'attacker' }),
  }));
  assert.equal(spoofed.ok, false);
  assert.ok(spoofed.reason_codes.includes('ACTOR_AUTHORITY_MISMATCH'));

  const crossCountry = await runtime(createSharedStore()).authorizeContact(contactInput({
    authority: validAuthority({ country: 'US' }),
  }));
  assert.equal(crossCountry.ok, false);
  assert.ok(crossCountry.reason_codes.includes('COUNTRY_AUTHORITY_MISMATCH'));

  const revealMismatch = await runtime(createSharedStore()).authorizeContact(contactInput({
    authority: validAuthority({ reveal_policy_ref: 'wrong-policy' }),
  }));
  assert.equal(revealMismatch.ok, false);
  assert.ok(revealMismatch.reason_codes.includes('REVEAL_POLICY_MISMATCH'));

  const badChannel = await runtime(createSharedStore()).authorizeContact(contactInput({
    request: validRequest({ channel: 'GROUP_CHAT' }),
  }));
  assert.equal(badChannel.ok, false);
  assert.ok(badChannel.reason_codes.includes('CHANNEL_NOT_ALLOWED'));

  const wholeVehicle = await runtime(createSharedStore()).authorizeContact(contactInput({
    genome: validGenome({
      taxonomy: { ...validGenome().taxonomy, category_id: 'vehicles', entity_type: 'WHOLE_VEHICLE' },
    }),
  }));
  assert.equal(wholeVehicle.ok, false);
  assert.ok(wholeVehicle.reason_codes.includes('WHOLE_VEHICLE_FORBIDDEN'));

  const privatePayload = await runtime(createSharedStore()).authorizeContact(contactInput({
    request: validRequest({ raw_intent: 'private search', payment_intent: { amount: 100 } }),
  }));
  assert.equal(privatePayload.ok, false);
  assert.ok(privatePayload.reason_codes.includes('PRIVATE_OR_TRANSACTION_PAYLOAD_FORBIDDEN'));
});

test('issue-store uncertainty fails closed and never falls back to local replay authority', async () => {
  const store = createSharedStore({ failIssue: true });
  const result = await runtime(store).authorizeContact(contactInput());

  assert.equal(result.ok, false);
  assert.ok(result.reason_codes.includes('DURABLE_REPLAY_UNAVAILABLE'));
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'capability'), false);
  assert.equal(JSON.stringify(result).includes('credential'), false);
});

test('consume-store uncertainty fails closed without emitting a handoff receipt', async () => {
  const backing = createSharedStore();
  const issuer = runtime(backing);
  const authorization = await issuer.authorizeContact(contactInput());
  assert.equal(authorization.ok, true);

  const failingStore = {
    issueCapability: backing.issueCapability.bind(backing),
    async consumeCapability() {
      throw new Error('database credential or transport detail');
    },
  };
  const result = await runtime(failingStore).emitHandoff({
    capability: authorization.capability,
    actor_subject: 'buyer_001',
  });

  assert.equal(result.ok, false);
  assert.ok(result.reason_codes.includes('DURABLE_REPLAY_UNAVAILABLE'));
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'receipt'), false);
  assert.equal(JSON.stringify(result).includes('credential'), false);
});

test('handoff revalidates actor and capability expiry before durable consumption', async () => {
  let clock = NOW;
  const store = createSharedStore();
  const createDurableContactHandoff = loadFactory();
  const source = createDurableContactHandoff({
    store,
    now: () => clock,
    maxCapabilityTtlMs: 5 * 60 * 1000,
  });
  const authorization = await source.authorizeContact(contactInput());
  assert.equal(authorization.ok, true);

  const attacker = await source.emitHandoff({
    capability: authorization.capability,
    actor_subject: 'attacker',
  });
  assert.equal(attacker.ok, false);
  assert.ok(attacker.reason_codes.includes('ACTOR_AUTHORITY_MISMATCH'));
  assert.equal(store.consumeCalls, 0);

  clock = '2026-08-23T16:06:00.000Z';
  const expired = await source.emitHandoff({
    capability: authorization.capability,
    actor_subject: 'buyer_001',
  });
  assert.equal(expired.ok, false);
  assert.ok(expired.reason_codes.includes('CAPABILITY_EXPIRED'));
  assert.equal(store.consumeCalls, 0);
});

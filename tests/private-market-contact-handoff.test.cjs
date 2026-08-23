'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CONTACT_STATES } = require('../scripts/marketplace/private-market-contracts.js');
const { createContactHandoffConvergence } = require('../scripts/marketplace/contact-handoff.js');

const NOW = '2026-08-23T12:45:00.000Z';

function validGenome(overrides = {}) {
  return {
    identity: {
      ad_id: 'ad_001',
      owner_subject: 'seller_001',
      source_type: 'LISTING',
      source_revision: 4,
      created_at: '2026-08-23T10:00:00.000Z',
      updated_at: '2026-08-23T12:00:00.000Z',
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

function service(overrides = {}) {
  return createContactHandoffConvergence({
    now: () => NOW,
    maxCapabilityTtlMs: 5 * 60 * 1000,
    ...overrides,
  });
}

test('authorizes one-to-one contact with server-bound actor, reveal policy, channel intersection, and bounded immutable capability', () => {
  const result = service().authorizeContact({
    request: validRequest(),
    genome: validGenome(),
    physics: validPhysics(),
    authority: validAuthority(),
  });

  assert.equal(result.ok, true, result.errors && result.errors.join(', '));
  assert.equal(result.state, 'CONTACT_AUTHORIZED');
  assert.equal(result.capability.requester_subject, 'buyer_001');
  assert.equal(result.capability.owner_subject_ref, 'seller_001');
  assert.equal(result.capability.ad_id, 'ad_001');
  assert.equal(result.capability.channel, 'SOCIAL_MESSAGE');
  assert.equal(result.capability.policy_version, 'policy-2026-08');
  assert.equal(result.capability.physics_version, '1.0.0');
  assert.equal(result.capability.reveal_authorized, true);
  assert.equal(Object.isFrozen(result.capability), true);

  const ttl = Date.parse(result.capability.expires_at) - Date.parse(result.capability.issued_at);
  assert.ok(ttl > 0 && ttl <= 5 * 60 * 1000);

  for (const forbidden of ['raw_intent', 'intent_text', 'email', 'phone', 'message_body', 'checkout', 'order', 'payment_intent']) {
    assert.equal(Object.prototype.hasOwnProperty.call(result.capability, forbidden), false, `${forbidden} must not leave the boundary`);
  }
});

test('fails closed on actor spoofing, cross-country policy, reveal mismatch, blocked contact, and disallowed channel', () => {
  const spoofed = service().authorizeContact({
    request: validRequest({ actor_subject: 'attacker' }), genome: validGenome(), physics: validPhysics(), authority: validAuthority(),
  });
  assert.equal(spoofed.ok, false);
  assert.ok(spoofed.reason_codes.includes('ACTOR_AUTHORITY_MISMATCH'));

  const crossCountry = service().authorizeContact({
    request: validRequest(), genome: validGenome(), physics: validPhysics(), authority: validAuthority({ country: 'US' }),
  });
  assert.equal(crossCountry.ok, false);
  assert.ok(crossCountry.reason_codes.includes('COUNTRY_AUTHORITY_MISMATCH'));

  const revealMismatch = service().authorizeContact({
    request: validRequest(), genome: validGenome(), physics: validPhysics(), authority: validAuthority({ reveal_policy_ref: 'wrong-policy' }),
  });
  assert.equal(revealMismatch.ok, false);
  assert.ok(revealMismatch.reason_codes.includes('REVEAL_POLICY_MISMATCH'));

  const blocked = service().authorizeContact({
    request: validRequest(),
    genome: validGenome({ contact: { ...validGenome().contact, contact_capability_class: CONTACT_STATES.CONTACT_BLOCKED, blocked_by_policy: true } }),
    physics: validPhysics(),
    authority: validAuthority(),
  });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.reason_codes.includes('CONTACT_BLOCKED'));

  const disallowedChannel = service().authorizeContact({
    request: validRequest({ channel: 'GROUP_CHAT' }), genome: validGenome(), physics: validPhysics(), authority: validAuthority(),
  });
  assert.equal(disallowedChannel.ok, false);
  assert.ok(disallowedChannel.reason_codes.includes('CHANNEL_NOT_ALLOWED'));
});

test('rejects private payload injection and never creates a parallel messaging/content path', () => {
  for (const [field, value] of [
    ['raw_intent', 'private search intent'],
    ['email', 'seller@example.com'],
    ['phone', '+962000000000'],
    ['message_body', 'negotiate the price here'],
    ['group_id', 'group_1'],
    ['checkout', { amount: 100 }],
  ]) {
    const result = service().authorizeContact({
      request: validRequest({ [field]: value }), genome: validGenome(), physics: validPhysics(), authority: validAuthority(),
    });
    assert.equal(result.ok, false, `${field} must fail closed`);
    assert.ok(result.reason_codes.includes('PRIVATE_OR_TRANSACTION_PAYLOAD_FORBIDDEN'));
  }
});

test('revalidates Ad Genome freshness and Sector Physics entity eligibility at pre-contact', () => {
  const expired = service().authorizeContact({
    request: validRequest(),
    genome: validGenome({ discovery: { ...validGenome().discovery, expires_at: '2026-08-23T12:00:00.000Z' } }),
    physics: validPhysics(),
    authority: validAuthority(),
  });
  assert.equal(expired.ok, false);
  assert.ok(expired.reason_codes.includes('OBJECT_EXPIRED'));

  const wholeVehicle = service().authorizeContact({
    request: validRequest(),
    genome: validGenome({ taxonomy: { ...validGenome().taxonomy, category_id: 'vehicles', entity_type: 'WHOLE_VEHICLE' } }),
    physics: validPhysics(),
    authority: validAuthority(),
  });
  assert.equal(wholeVehicle.ok, false);
  assert.ok(wholeVehicle.reason_codes.includes('ENTITY_NOT_ALLOWED'));
  assert.ok(wholeVehicle.reason_codes.includes('WHOLE_VEHICLE_FORBIDDEN'));
});

test('sponsorship never overrides contact policy and successful nonce cannot be replayed', () => {
  const sponsoredBlocked = service().authorizeContact({
    request: validRequest(),
    genome: validGenome({
      advertising: {
        ...validGenome().advertising,
        sponsored: true,
        pulse_campaign_ref: 'pulse_001',
        labeling_requirement: true,
      },
      contact: { ...validGenome().contact, contact_capability_class: CONTACT_STATES.CONTACT_BLOCKED, blocked_by_policy: true },
    }),
    physics: validPhysics(),
    authority: validAuthority(),
  });
  assert.equal(sponsoredBlocked.ok, false);
  assert.ok(sponsoredBlocked.reason_codes.includes('CONTACT_BLOCKED'));

  const convergence = service();
  const first = convergence.authorizeContact({ request: validRequest(), genome: validGenome(), physics: validPhysics(), authority: validAuthority() });
  assert.equal(first.ok, true);
  const replay = convergence.authorizeContact({ request: validRequest(), genome: validGenome(), physics: validPhysics(), authority: validAuthority() });
  assert.equal(replay.ok, false);
  assert.ok(replay.reason_codes.includes('REPLAY_DETECTED'));
});

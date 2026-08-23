'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTACT_STATES,
  FORBIDDEN_TRANSACTION_FIELDS,
  validateMarketGenesisRequest,
  validateMarketGenesisResponse,
  validateAdGenome,
  createSectorPhysicsRegistry,
} = require('../scripts/marketplace/private-market-contracts.js');

function validGenesisRequest(overrides = {}) {
  return {
    request_id: 'req_001',
    actor_subject: 'user_001',
    intent_id: 'intent_001',
    intent_revision: 7,
    intent_direction: 'NEED',
    sector_id: 'real-estate',
    sector_physics_version: '1.0.0',
    market_scope: { country: 'JO', region: 'AMMAN', location_precision: 'COARSE' },
    purpose: 'DISCOVERY',
    visibility_context: { visibility: 'PRIVATE' },
    policy_context: { policy_version: 'policy-2026-08', country: 'JO', capabilities: [] },
    requested_result_bound: 20,
    request_time: '2026-08-23T11:30:00.000Z',
    ...overrides,
  };
}

function validGenesisResponse(overrides = {}) {
  return {
    generation_id: 'gen_001',
    intent_revision_used: 7,
    sector_id: 'real-estate',
    sector_physics_version: '1.0.0',
    results: [],
    policy_version_digest: 'sha256:policy-2026-08',
    generated_at: '2026-08-23T11:30:00.000Z',
    expires_at: '2026-08-23T11:35:00.000Z',
    ...overrides,
  };
}

function validAdGenome(overrides = {}) {
  return {
    identity: {
      ad_id: 'ad_001',
      owner_subject: 'seller_001',
      source_type: 'LISTING',
      source_revision: 3,
      created_at: '2026-08-23T10:00:00.000Z',
      updated_at: '2026-08-23T11:00:00.000Z',
      provenance_state: 'VERIFIED',
      moderation_state: 'APPROVED',
      country: 'JO',
      policy_version: 'policy-2026-08',
    },
    taxonomy: {
      sector_id: 'real-estate',
      category_id: 'property',
      subcategory_id: 'apartment',
      entity_type: 'PROPERTY',
      offer_mode: 'OFFER',
      attributes: { bedrooms: 3 },
    },
    discovery: {
      title: 'Apartment',
      summary: 'Three bedroom apartment',
      searchable_tokens: ['apartment', 'three-bedroom'],
      coarse_geo: { country: 'JO', region: 'AMMAN' },
      freshness_state: 'FRESH',
      expires_at: '2026-09-01T00:00:00.000Z',
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
    sector_id: 'real-estate',
    version: '1.0.0',
    allowed_entity_types: ['PROPERTY'],
    forbidden_entity_types: ['WHOLE_VEHICLE'],
    required_dimensions: ['bedrooms'],
    optional_dimensions: ['bathrooms'],
    normalization_rules: {},
    publication_validators: [],
    discovery_validators: [],
    sponsored_admission_validators: [],
    freshness_policy: { max_age_seconds: 86400 },
    geography_semantics: { precision: 'COARSE' },
    price_value_semantics: { descriptive_only: true },
    evidence_semantics: {},
    compatibility_semantics: {},
    ranking_feature_allowlist: ['category_fit', 'location_area_fit'],
    explanation_reason_allowlist: ['CATEGORY_FIT', 'LOCATION_AREA_FIT'],
    contact_modes: ['SOCIAL_MESSAGE'],
    disclosure_requirements: [],
    media_requirements: {},
    country_overlays: { JO: { contact_modes: ['SOCIAL_MESSAGE'] } },
    moderation_policy_hooks: [],
    retention_audit_class: 'MARKET_DISCOVERY',
    migration_compatibility_range: '^1.0.0',
    hard_invariants: {
      transaction_features_forbidden: true,
      sponsored_cannot_bypass_eligibility: true,
    },
    ...overrides,
  };
}

test('Market Genesis validates request schema and binds server authority/version', () => {
  const request = validGenesisRequest();
  const result = validateMarketGenesisRequest(request, {
    actorSubject: 'user_001',
    intentRevision: 7,
    sectorPhysicsVersion: '1.0.0',
    policyVersion: 'policy-2026-08',
    maxResultBound: 50,
  });
  assert.equal(result.ok, true, result.errors && result.errors.join(', '));

  const spoofed = validateMarketGenesisRequest(validGenesisRequest({ actor_subject: 'attacker' }), {
    actorSubject: 'user_001', intentRevision: 7, sectorPhysicsVersion: '1.0.0', policyVersion: 'policy-2026-08', maxResultBound: 50,
  });
  assert.equal(spoofed.ok, false);
  assert.ok(spoofed.reason_codes.includes('ACTOR_AUTHORITY_MISMATCH'));
});

test('Market Genesis rejects stale intent/physics revisions and unbounded output', () => {
  const stale = validateMarketGenesisRequest(validGenesisRequest({ intent_revision: 6 }), {
    actorSubject: 'user_001', intentRevision: 7, sectorPhysicsVersion: '1.0.0', policyVersion: 'policy-2026-08', maxResultBound: 50,
  });
  assert.equal(stale.ok, false);
  assert.ok(stale.reason_codes.includes('STALE_INTENT_REVISION'));

  const stalePhysics = validateMarketGenesisRequest(validGenesisRequest({ sector_physics_version: '0.9.0' }), {
    actorSubject: 'user_001', intentRevision: 7, sectorPhysicsVersion: '1.0.0', policyVersion: 'policy-2026-08', maxResultBound: 50,
  });
  assert.equal(stalePhysics.ok, false);
  assert.ok(stalePhysics.reason_codes.includes('STALE_SECTOR_PHYSICS_VERSION'));

  const tooLarge = validateMarketGenesisRequest(validGenesisRequest({ requested_result_bound: 51 }), {
    actorSubject: 'user_001', intentRevision: 7, sectorPhysicsVersion: '1.0.0', policyVersion: 'policy-2026-08', maxResultBound: 50,
  });
  assert.equal(tooLarge.ok, false);
  assert.ok(tooLarge.reason_codes.includes('RESULT_BOUND_EXCEEDED'));
});

test('Market Genesis response is version-bound, bounded, and expiring', () => {
  const ok = validateMarketGenesisResponse(validGenesisResponse(), {
    intentRevision: 7, sectorPhysicsVersion: '1.0.0', maxResultBound: 20,
  });
  assert.equal(ok.ok, true, ok.errors && ok.errors.join(', '));

  const bad = validateMarketGenesisResponse(validGenesisResponse({
    intent_revision_used: 6,
    expires_at: '2026-08-23T11:20:00.000Z',
    results: Array.from({ length: 21 }, (_, i) => ({ object_ref: `ad_${i}` })),
  }), { intentRevision: 7, sectorPhysicsVersion: '1.0.0', maxResultBound: 20 });
  assert.equal(bad.ok, false);
  assert.ok(bad.reason_codes.includes('STALE_INTENT_REVISION'));
  assert.ok(bad.reason_codes.includes('RESULT_BOUND_EXCEEDED'));
  assert.ok(bad.reason_codes.includes('INVALID_EXPIRY'));
});

test('Ad Genome rejects every authoritative transaction field', () => {
  for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
    const genome = validAdGenome({ [field]: 'forbidden' });
    const result = validateAdGenome(genome, { now: '2026-08-23T11:30:00.000Z' });
    assert.equal(result.ok, false, `${field} must be rejected`);
    assert.ok(result.reason_codes.includes('FORBIDDEN_TRANSACTION_FIELD'));
  }
});

test('Ad Genome sponsorship cannot bypass eligibility or labeling', () => {
  const bypass = validAdGenome({
    advertising: {
      organic_eligibility_state: 'INELIGIBLE',
      sponsorship_eligibility_state: 'INELIGIBLE',
      sponsored: true,
      pulse_campaign_ref: 'pulse_001',
      delivery_market: 'JO',
      labeling_requirement: true,
      verified_viewability_eligible: true,
    },
  });
  const result = validateAdGenome(bypass, { now: '2026-08-23T11:30:00.000Z' });
  assert.equal(result.ok, false);
  assert.ok(result.reason_codes.includes('SPONSORSHIP_INELIGIBLE'));

  const unlabeled = validAdGenome({
    advertising: { ...validAdGenome().advertising, sponsored: true, pulse_campaign_ref: 'pulse_001', labeling_requirement: false },
  });
  const unlabeledResult = validateAdGenome(unlabeled, { now: '2026-08-23T11:30:00.000Z' });
  assert.equal(unlabeledResult.ok, false);
  assert.ok(unlabeledResult.reason_codes.includes('SPONSORED_LABEL_REQUIRED'));
});

test('Ad Genome fails closed on expired objects and invalid contact reveal policy', () => {
  const expired = validateAdGenome(validAdGenome({
    discovery: { ...validAdGenome().discovery, expires_at: '2026-08-23T11:00:00.000Z' },
  }), { now: '2026-08-23T11:30:00.000Z' });
  assert.equal(expired.ok, false);
  assert.ok(expired.reason_codes.includes('OBJECT_EXPIRED'));

  const unsafeContact = validateAdGenome(validAdGenome({
    contact: { ...validAdGenome().contact, reveal_policy_ref: null },
  }), { now: '2026-08-23T11:30:00.000Z' });
  assert.equal(unsafeContact.ok, false);
  assert.ok(unsafeContact.reason_codes.includes('REVEAL_POLICY_REQUIRED'));
});

test('Sector Physics active versions are immutable and unknown sectors fail closed', () => {
  const registry = createSectorPhysicsRegistry();
  registry.activate(validPhysics());
  const resolved = registry.resolve('real-estate', '1.0.0', 'JO');
  assert.equal(resolved.ok, true);
  assert.equal(Object.isFrozen(resolved.physics), true);
  assert.throws(() => registry.activate(validPhysics({ required_dimensions: ['bathrooms'] })), /immutable/i);

  const unknown = registry.resolve('missing-sector', '1.0.0', 'JO');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason_code, 'UNKNOWN_SECTOR');
});

test('Sector Physics validates required dimensions/entity rules and country overlay cannot override hard invariants', () => {
  const registry = createSectorPhysicsRegistry();
  assert.throws(() => registry.activate(validPhysics({ required_dimensions: [] })), /required_dimensions/i);
  assert.throws(() => registry.activate(validPhysics({ allowed_entity_types: ['PROPERTY'], forbidden_entity_types: ['PROPERTY'] })), /allowed.*forbidden/i);
  assert.throws(() => registry.activate(validPhysics({
    country_overlays: { JO: { hard_invariants: { transaction_features_forbidden: false } } },
  })), /hard invariants/i);
});

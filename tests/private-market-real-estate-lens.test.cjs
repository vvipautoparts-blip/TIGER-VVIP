'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createListing } = require('../scripts/listing/listing-contract.js');
const {
  createSectorPhysicsRegistry,
  validateAdGenome,
  FORBIDDEN_TRANSACTION_FIELDS,
} = require('../scripts/marketplace/private-market-contracts.js');
const { compileLensRecord } = require('../scripts/marketplace/market-lens-compiler.js');
const {
  REAL_ESTATE_PHYSICS,
  REAL_ESTATE_LENS,
  canonicalizeRealEstateRecord,
  mapRealEstateRetrieval,
} = require('../scripts/marketplace/lenses/real-estate.js');

function propertyListing(overrides = {}) {
  const input = {
    listingId: 'property_001',
    ownerClerkUserId: 'seller_001',
    sector: 'real-estate',
    category: 'apartment',
    title: 'Three bedroom apartment in Abdoun',
    description: '155 sqm apartment available for rent',
    numericPrice: 850,
    currency: 'JOD',
    country: 'JO',
    city: 'Amman',
    area: 'Abdoun',
    sectorAttributes: {
      offerMode: 'rent',
      areaSqm: 155,
      bedrooms: 3,
      bathrooms: 2,
      furnishing: 'SEMI_FURNISHED',
      availableFrom: '2026-09-01',
      pricePeriod: 'MONTH',
    },
    status: 'published',
    images: [],
    coverImageId: null,
    createdAt: '2026-08-23T09:00:00.000Z',
    updatedAt: '2026-08-23T11:00:00.000Z',
    publishedAt: '2026-08-23T11:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z',
    idempotencyKey: 'idem_property_001',
    schemaVersion: 1,
    ...overrides,
  };
  const created = createListing(input, { now: '2026-08-23T11:00:00.000Z' });
  assert.equal(created.ok, true, created.errors && JSON.stringify(created.errors));
  return created.value;
}

function authorityContext(overrides = {}) {
  return {
    policy_version: 'policy-2026-08',
    provenance_state: 'VERIFIED',
    moderation_state: 'APPROVED',
    contact: {
      safe_public_display_identity: 'Seller',
      reveal_policy_ref: 'reveal-policy-v1',
      allowed_handoff_channels: ['SOCIAL_MESSAGE'],
    },
    ...overrides,
  };
}

test('M2 Real Estate Physics is registry-valid and preserves global non-transaction invariants', () => {
  const registry = createSectorPhysicsRegistry();
  registry.activate(REAL_ESTATE_PHYSICS);
  const resolved = registry.resolve('real-estate', REAL_ESTATE_PHYSICS.version, 'JO');

  assert.equal(resolved.ok, true);
  assert.ok(resolved.physics.allowed_entity_types.includes('APARTMENT'));
  assert.ok(resolved.physics.allowed_entity_types.includes('LAND'));
  assert.ok(resolved.physics.allowed_entity_types.includes('FARM'));
  assert.ok(resolved.physics.allowed_entity_types.includes('COMMERCIAL_PROPERTY'));
  assert.ok(resolved.physics.forbidden_entity_types.includes('WHOLE_VEHICLE'));
  assert.equal(resolved.physics.price_value_semantics.descriptive_only, true);
  assert.equal(resolved.physics.hard_invariants.transaction_features_forbidden, true);
});

test('M2 canonicalizes the existing Listing Contract into an Ad Genome without a parallel property source model', () => {
  const listing = propertyListing();
  const genome = canonicalizeRealEstateRecord(listing, authorityContext());
  const validated = validateAdGenome(genome, { now: '2026-08-23T11:30:00.000Z' });

  assert.equal(validated.ok, true, validated.errors && validated.errors.join(', '));
  assert.equal(genome.identity.ad_id, listing.listingId);
  assert.equal(genome.identity.owner_subject, listing.ownerClerkUserId);
  assert.equal(genome.taxonomy.sector_id, 'real-estate');
  assert.equal(genome.taxonomy.entity_type, 'APARTMENT');
  assert.equal(genome.taxonomy.offer_mode, 'RENT');
  assert.equal(genome.taxonomy.attributes.area_sqm, 155);
  assert.equal(genome.discovery.coarse_geo.city, 'Amman');
  assert.deepEqual(genome.discovery.price_value, { amount: 850, currency: 'JOD', period: 'MONTH', descriptive_only: true });

  for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
    assert.equal(Object.prototype.hasOwnProperty.call(genome, field), false, `${field} must not exist on the genome`);
  }
});

test('M2 rejects a Listing Contract record from another sector instead of silently reclassifying it', () => {
  const automotive = propertyListing({
    listingId: 'part_001',
    sector: 'automotive',
    category: 'parts',
  });
  assert.throws(
    () => canonicalizeRealEstateRecord(automotive, authorityContext()),
    /real-estate sector/i,
  );
});

test('M2 retrieval mapping emits allowlisted real-estate features, not raw intent or exact private location', () => {
  const features = mapRealEstateRetrieval({
    property_type: 'apartment',
    offer_mode: 'rent',
    region: 'AMMAN',
    area: 'Abdoun',
    area_sqm: { min: 120, max: 180 },
    bedrooms: { min: 2 },
    price: { max: 1000, currency: 'JOD', period: 'MONTH' },
    availability_from: '2026-09-01',
    raw_intent: 'private free text must not leave SYNAPSE',
    exact_latitude: 31.9501,
    exact_longitude: 35.9239,
  });

  assert.deepEqual(features, {
    property_type: 'APARTMENT',
    offer_mode: 'RENT',
    region: 'AMMAN',
    area: 'Abdoun',
    area_sqm: { min: 120, max: 180 },
    bedrooms: { min: 2 },
    price: { max: 1000, currency: 'JOD', period: 'MONTH' },
    availability_from: '2026-09-01',
  });
  assert.equal('raw_intent' in features, false);
  assert.equal('exact_latitude' in features, false);
  assert.equal('exact_longitude' in features, false);
});

test('M2 generic lens compiler uses a Lens contract rather than sector-specific branches', () => {
  const compiled = compileLensRecord(propertyListing(), REAL_ESTATE_LENS, {
    ...authorityContext(),
    retrieval_request: { property_type: 'apartment', offer_mode: 'rent', region: 'AMMAN' },
  });

  assert.equal(compiled.sector_id, 'real-estate');
  assert.equal(compiled.physics_version, REAL_ESTATE_PHYSICS.version);
  assert.equal(compiled.genome.taxonomy.entity_type, 'APARTMENT');
  assert.deepEqual(compiled.retrieval_features, {
    property_type: 'APARTMENT',
    offer_mode: 'RENT',
    region: 'AMMAN',
  });

  const syntheticLens = {
    physics: { sector_id: 'synthetic-sector', version: '9.9.9' },
    canonicalize(record) { return { marker: record.marker }; },
    mapRetrieval(request) { return { token: request.token }; },
  };
  const synthetic = compileLensRecord({ marker: 'ok' }, syntheticLens, { retrieval_request: { token: 'x' } });
  assert.deepEqual(synthetic, {
    sector_id: 'synthetic-sector',
    physics_version: '9.9.9',
    genome: { marker: 'ok' },
    retrieval_features: { token: 'x' },
  });
});

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
  AUTO_PARTS_PHYSICS,
  AUTO_PARTS_LENS,
  validateAutoPartsCategoryFirewall,
  canonicalizeAutoPartsRecord,
  mapAutoPartsRetrieval,
} = require('../scripts/marketplace/lenses/auto-parts.js');

function partListing(overrides = {}) {
  const input = {
    listingId: 'part_001',
    ownerClerkUserId: 'seller_001',
    sector: 'automotive',
    category: 'parts',
    title: 'Toyota Camry 2020 front brake pads',
    description: 'New front brake pad set for Toyota Camry XV70',
    numericPrice: 45,
    currency: 'JOD',
    country: 'JO',
    city: 'Amman',
    area: 'Bayader',
    sectorAttributes: {
      partType: 'brake-pad',
      make: 'Toyota',
      model: 'Camry',
      generation: 'XV70',
      yearFrom: 2018,
      yearTo: 2022,
      engine: '2.5L',
      drivetrain: 'FWD',
      partNumber: 'BRK-123',
      oemNumber: '04465-33480',
      condition: 'new',
      manufacturerType: 'aftermarket',
    },
    status: 'published',
    images: [],
    coverImageId: null,
    createdAt: '2026-08-23T09:00:00.000Z',
    updatedAt: '2026-08-23T11:00:00.000Z',
    publishedAt: '2026-08-23T11:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z',
    idempotencyKey: 'idem_part_001',
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
    semantic_evidence: { whole_vehicle_probability: 0.01 },
    contact: {
      safe_public_display_identity: 'Seller',
      reveal_policy_ref: 'reveal-policy-v1',
      allowed_handoff_channels: ['SOCIAL_MESSAGE'],
    },
    ...overrides,
  };
}

test('M3 Auto Parts Physics permits parts only and preserves global non-transaction invariants', () => {
  const registry = createSectorPhysicsRegistry();
  registry.activate(AUTO_PARTS_PHYSICS);
  const resolved = registry.resolve('automotive', AUTO_PARTS_PHYSICS.version, 'JO');

  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.physics.allowed_entity_types, ['AUTO_PART']);
  assert.ok(resolved.physics.forbidden_entity_types.includes('WHOLE_VEHICLE'));
  assert.equal(resolved.physics.category_firewall.allowed_source_category, 'parts');
  assert.equal(resolved.physics.category_firewall.whole_vehicle_ads_forbidden, true);
  assert.equal(resolved.physics.price_value_semantics.descriptive_only, true);
  assert.equal(resolved.physics.hard_invariants.transaction_features_forbidden, true);
});

test('M3 Category Firewall rejects non-parts automotive categories before canonicalization', () => {
  const maintenance = partListing({
    listingId: 'maintenance_001',
    category: 'maintenance',
    title: 'Engine maintenance service',
    description: 'Workshop maintenance service',
  });
  const verdict = validateAutoPartsCategoryFirewall(maintenance, authorityContext());

  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes('AUTO_PARTS_ONLY'));
  assert.throws(
    () => canonicalizeAutoPartsRecord(maintenance, authorityContext()),
    /AUTO_PARTS_ONLY/,
  );
});

test('M3 Category Firewall rejects a whole vehicle masquerading as a parts listing', () => {
  const disguisedVehicle = partListing({
    listingId: 'vehicle_001',
    title: 'Toyota Camry 2022 car for sale',
    description: 'Complete vehicle for sale, low mileage, ready to drive',
    sectorAttributes: {
      partType: 'vehicle',
      make: 'Toyota',
      model: 'Camry',
      yearFrom: 2022,
      yearTo: 2022,
      condition: 'used',
    },
  });
  const verdict = validateAutoPartsCategoryFirewall(disguisedVehicle, authorityContext({
    semantic_evidence: { whole_vehicle_probability: 0.99 },
  }));

  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes('WHOLE_VEHICLE_FORBIDDEN'));
  assert.throws(
    () => canonicalizeAutoPartsRecord(disguisedVehicle, authorityContext({
      semantic_evidence: { whole_vehicle_probability: 0.99 },
    })),
    /WHOLE_VEHICLE_FORBIDDEN/,
  );
});

test('M3 whole-vehicle ban has a deterministic lexical backstop for high-signal Arabic/English sale language', () => {
  const english = partListing({
    listingId: 'vehicle_en_001',
    title: 'Toyota Corolla complete car for sale',
    description: 'Whole vehicle, ready to drive',
  });
  const arabic = partListing({
    listingId: 'vehicle_ar_001',
    title: 'تويوتا كامري سيارة للبيع كاملة',
    description: 'مركبة كاملة جاهزة للقيادة',
  });

  assert.equal(validateAutoPartsCategoryFirewall(english, authorityContext({ semantic_evidence: undefined })).ok, false);
  assert.equal(validateAutoPartsCategoryFirewall(arabic, authorityContext({ semantic_evidence: undefined })).ok, false);
});

test('M3 canonicalizes the existing Listing Contract into a fitment-aware Ad Genome', () => {
  const listing = partListing();
  const genome = canonicalizeAutoPartsRecord(listing, authorityContext());
  const validated = validateAdGenome(genome, { now: '2026-08-23T11:30:00.000Z' });

  assert.equal(validated.ok, true, validated.errors && validated.errors.join(', '));
  assert.equal(genome.identity.ad_id, listing.listingId);
  assert.equal(genome.taxonomy.sector_id, 'automotive');
  assert.equal(genome.taxonomy.entity_type, 'AUTO_PART');
  assert.equal(genome.taxonomy.attributes.part_type, 'brake-pad');
  assert.equal(genome.taxonomy.attributes.make, 'Toyota');
  assert.equal(genome.taxonomy.attributes.model, 'Camry');
  assert.equal(genome.taxonomy.attributes.generation, 'XV70');
  assert.equal(genome.taxonomy.attributes.year_from, 2018);
  assert.equal(genome.taxonomy.attributes.year_to, 2022);
  assert.equal(genome.taxonomy.attributes.part_number, 'BRK-123');
  assert.equal(genome.taxonomy.attributes.oem_number, '04465-33480');
  assert.equal(genome.taxonomy.attributes.condition, 'NEW');
  assert.equal(genome.discovery.price_value.descriptive_only, true);

  for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
    assert.equal(Object.prototype.hasOwnProperty.call(genome, field), false, `${field} must not exist on the genome`);
  }
});

test('M3 retrieval mapping emits only fitment-safe features and strips raw intent/private identifiers', () => {
  const features = mapAutoPartsRetrieval({
    part_type: 'brake-pad',
    make: 'Toyota',
    model: 'Camry',
    generation: 'XV70',
    year: 2020,
    engine: '2.5L',
    drivetrain: 'FWD',
    part_number: 'BRK-123',
    oem_number: '04465-33480',
    condition: 'new',
    price: { max: 60, currency: 'JOD' },
    raw_intent: 'private free text must not leave SYNAPSE',
    vin: 'PRIVATE-VIN-MUST-NOT-LEAK',
    exact_latitude: 31.95,
    exact_longitude: 35.92,
  });

  assert.deepEqual(features, {
    part_type: 'brake-pad',
    make: 'Toyota',
    model: 'Camry',
    generation: 'XV70',
    year: 2020,
    engine: '2.5L',
    drivetrain: 'FWD',
    part_number: 'BRK-123',
    oem_number: '04465-33480',
    condition: 'NEW',
    price: { max: 60, currency: 'JOD' },
  });
  assert.equal('raw_intent' in features, false);
  assert.equal('vin' in features, false);
  assert.equal('exact_latitude' in features, false);
  assert.equal('exact_longitude' in features, false);
});

test('M3 generic Lens compiler consumes Auto Parts without adding an automotive branch to core', () => {
  const compiled = compileLensRecord(partListing(), AUTO_PARTS_LENS, {
    ...authorityContext(),
    retrieval_request: { make: 'Toyota', model: 'Camry', year: 2020, part_type: 'brake-pad' },
  });

  assert.equal(compiled.sector_id, 'automotive');
  assert.equal(compiled.physics_version, AUTO_PARTS_PHYSICS.version);
  assert.equal(compiled.genome.taxonomy.entity_type, 'AUTO_PART');
  assert.deepEqual(compiled.retrieval_features, {
    part_type: 'brake-pad',
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
  });
});

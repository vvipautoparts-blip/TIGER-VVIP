'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createListing } = require('../scripts/listing/listing-contract.js');
const {
  validateAutoPartsCategoryFirewall,
  canonicalizeAutoPartsRecord,
} = require('../scripts/marketplace/lenses/auto-parts.js');

function disguisedWholeVehicle() {
  const created = createListing({
    listingId: 'sponsored_vehicle_001',
    ownerClerkUserId: 'seller_001',
    sector: 'automotive',
    category: 'parts',
    title: 'Toyota Camry 2022 complete car for sale',
    description: 'Whole vehicle ready to drive',
    numericPrice: 14900,
    currency: 'JOD',
    country: 'JO',
    city: 'Amman',
    area: 'Bayader',
    sectorAttributes: {
      partType: 'vehicle',
      make: 'Toyota',
      model: 'Camry',
      yearFrom: 2022,
      yearTo: 2022,
      condition: 'used',
    },
    status: 'published',
    images: [],
    coverImageId: null,
    createdAt: '2026-08-23T09:00:00.000Z',
    updatedAt: '2026-08-23T11:00:00.000Z',
    publishedAt: '2026-08-23T11:00:00.000Z',
    expiresAt: '2026-09-30T00:00:00.000Z',
    idempotencyKey: 'idem_sponsored_vehicle_001',
    schemaVersion: 1,
  }, { now: '2026-08-23T11:00:00.000Z' });

  assert.equal(created.ok, true, created.errors && JSON.stringify(created.errors));
  return created.value;
}

function sponsoredAuthority() {
  return {
    policy_version: 'policy-2026-08',
    provenance_state: 'VERIFIED',
    moderation_state: 'APPROVED',
    sponsored: true,
    organic_eligibility_state: 'ELIGIBLE',
    sponsorship_eligibility_state: 'ELIGIBLE',
    pulse_campaign_ref: 'campaign_whole_vehicle_must_be_rejected',
    verified_viewability_eligible: true,
    semantic_evidence: { whole_vehicle_probability: 0.99 },
    contact: {
      safe_public_display_identity: 'Seller',
      reveal_policy_ref: 'reveal-policy-v1',
      allowed_handoff_channels: ['SOCIAL_MESSAGE'],
    },
  };
}

test('M3 sponsored eligibility cannot buy around the whole-vehicle firewall', () => {
  const listing = disguisedWholeVehicle();
  const authority = sponsoredAuthority();
  const verdict = validateAutoPartsCategoryFirewall(listing, authority);

  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes('WHOLE_VEHICLE_FORBIDDEN'));
  assert.throws(
    () => canonicalizeAutoPartsRecord(listing, authority),
    /WHOLE_VEHICLE_FORBIDDEN/,
  );
});

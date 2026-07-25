#!/usr/bin/env node
// VVIP TIGER — Global V1 Listing API Contract Tests
'use strict';
const assert = require('assert');
const {
  validateListingInput,
  validateStatusTransition,
  sanitizeListingForOwner,
  sanitizeListingForPublic,
  VALID_SECTORS,
  VALID_STATUSES,
  LISTING_TRANSITIONS
} = require('../scripts/listing/listing-api-contract.js');

// --- validateListingInput ---

// Happy path
const good = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts',
  title_ar: 'قطعة أصلية للسيارة', price: 150, currency: 'JOD',
  country_code: 'JO', condition: 'used',
  images: [{ url: 'https://cdn.example.com/img1.webp', order: 0 }],
  attributes: { color: 'red', year: 2020 }
});
assert.ok(good.valid, 'Valid input should pass: ' + JSON.stringify(good.errors));
assert.strictEqual(good.cleaned.sector_id, 'automotive');
assert.strictEqual(good.cleaned.currency, 'JOD');
assert.strictEqual(good.cleaned.country_code, 'JO');
assert.strictEqual(good.cleaned.images.length, 1);

// Missing required fields
const missing = validateListingInput({});
assert.ok(!missing.valid, 'Empty input should fail');
assert.ok(missing.errors.some(e => e.includes('sector_id')), 'Must complain about sector_id');
assert.ok(missing.errors.some(e => e.includes('title_ar')), 'Must complain about title_ar');

// Invalid sector
const badSector = validateListingInput({ sector_id: 'unknown', category_id: 'x', title_ar: 'test title here' });
assert.ok(!badSector.valid, 'Unknown sector must fail');

// Title too short
const shortTitle = validateListingInput({ sector_id: 'automotive', category_id: 'x', title_ar: 'AB' });
assert.ok(!shortTitle.valid, 'Title less than 3 chars must fail');

// Price negative
const negPrice = validateListingInput({ sector_id: 'automotive', category_id: 'x', title_ar: 'test title', price: -5 });
assert.ok(!negPrice.valid, 'Negative price must fail');

// Max 7 images
const manyImages = validateListingInput({
  sector_id: 'automotive', category_id: 'x', title_ar: 'test title ok',
  images: Array.from({ length: 8 }, (_, i) => ({ url: `https://cdn.example.com/img${i}.jpg`, order: i }))
});
assert.ok(!manyImages.valid, 'More than 7 images must fail');

// Invalid country code
const badCC = validateListingInput({ sector_id: 'automotive', category_id: 'x', title_ar: 'test title', country_code: 'LONG' });
assert.ok(!badCC.valid, 'Invalid country code must fail');

// Default currency JOD when not specified
const noCC = validateListingInput({ sector_id: 'materials', category_id: 'x', title_ar: 'test title here' });
assert.strictEqual(noCC.cleaned.currency, 'JOD', 'Default currency should be JOD');
assert.strictEqual(noCC.cleaned.country_code, 'JO', 'Default country should be JO');

// --- validateStatusTransition ---

// Owner: draft -> pending_review (allowed)
const t1 = validateStatusTransition('draft', 'pending_review', 'owner');
assert.ok(t1.allowed, 'Owner can submit draft for review');

// Owner: pending_review -> published (forbidden — state machine transition not defined)
const t2 = validateStatusTransition('pending_review', 'published', 'owner');
assert.ok(!t2.allowed, 'pending_review cannot go directly to published (must go via under_review)');
assert.ok(typeof t2.reason === 'string' && t2.reason.length > 0, 'Must have a reason');

// Owner: under_review -> published (also forbidden for owners)
const t2b = validateStatusTransition('under_review', 'published', 'owner');
assert.ok(!t2b.allowed, 'Owner cannot set published status');
assert.ok(t2b.reason.includes('moder'), 'Must mention moderator');

// Moderator: under_review -> published (allowed)
const t3 = validateStatusTransition('under_review', 'published', 'moderator');
assert.ok(t3.allowed, 'Moderator can publish from under_review');

// Moderator: under_review -> rejected (allowed)
const t4 = validateStatusTransition('under_review', 'rejected', 'moderator');
assert.ok(t4.allowed, 'Moderator can reject');

// Invalid transition
const t5 = validateStatusTransition('archived', 'published', 'moderator');
assert.ok(!t5.allowed, 'Archived listings cannot be re-published');

// Self-loop check
const t6 = validateStatusTransition('published', 'published', 'moderator');
assert.ok(!t6.allowed, 'published -> published not a defined transition');

// --- State machine completeness ---
for (const status of VALID_STATUSES) {
  assert.ok(status in LISTING_TRANSITIONS, `State machine must define transitions for: ${status}`);
}

// --- sanitizeListingForOwner ---
const ownerListing = {
  id: 'uuid1', clerk_user_id: 'user_abc', moderator_id: 'mod_xyz',
  title_ar: 'Test', status: 'published', rejection_reason: null
};
const ownerSafe = sanitizeListingForOwner(ownerListing);
assert.ok(!('moderator_id' in ownerSafe), 'moderator_id must be removed for owner');
assert.ok('clerk_user_id' in ownerSafe, 'clerk_user_id visible to owner');
assert.ok('rejection_reason' in ownerSafe, 'rejection_reason visible to owner');

// --- sanitizeListingForPublic ---
const publicSafe = sanitizeListingForPublic(ownerListing);
assert.ok(!('moderator_id' in publicSafe), 'moderator_id removed from public');
assert.ok(!('clerk_user_id' in publicSafe), 'clerk_user_id removed from public');
assert.ok(!('rejection_reason' in publicSafe), 'rejection_reason removed from public');

// sanitize null returns null
assert.strictEqual(sanitizeListingForOwner(null), null);
assert.strictEqual(sanitizeListingForPublic(null), null);

console.log('PASS: Global V1 listing API contract — all checks passed');

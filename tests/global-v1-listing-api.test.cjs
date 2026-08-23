#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const {
  validateListingInput,
  validateStatusTransition,
  sanitizeListingForOwner,
  sanitizeListingForPublic,
  VALID_SECTORS,
  VALID_STATUSES,
  LISTING_TRANSITIONS
} = require('../scripts/listing/listing-api-contract.js');

const good = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts',
  title_ar: 'قطعة أصلية للسيارة', price: 150, currency: 'JOD',
  country_code: 'JO', condition: 'used',
  images: [{ url: 'https://cdn.example.com/img1.webp', order: 0 }],
  attributes: { color: 'red', year: 2020 }
});
assert.ok(good.valid, 'Valid input should pass: ' + JSON.stringify(good.errors));
assert.equal(good.cleaned.sector_id, 'automotive');
assert.equal(good.cleaned.currency, 'JOD');
assert.equal(good.cleaned.country_code, 'JO');
assert.equal(good.cleaned.images.length, 1);
assert.ok(VALID_SECTORS.includes('food'), 'legacy compatibility API must recognize current food sector');

const missing = validateListingInput({});
assert.ok(!missing.valid, 'Empty input should fail');
assert.ok(missing.errors.some(e => e.includes('sector_id')), 'Must complain about sector_id');
assert.ok(missing.errors.some(e => e.includes('title_ar')), 'Must complain about title_ar');
assert.ok(missing.errors.some(e => e.includes('currency')), 'Must require currency');
assert.ok(missing.errors.some(e => e.includes('country_code')), 'Must require country_code');

const badSector = validateListingInput({
  sector_id: 'unknown', category_id: 'x', title_ar: 'test title here', currency: 'USD', country_code: 'US'
});
assert.ok(!badSector.valid, 'Unknown sector must fail');

const badCategory = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_full_cars', title_ar: 'سيارة كاملة للبيع', currency: 'JOD', country_code: 'JO'
});
assert.ok(!badCategory.valid, 'Whole-car automotive category must fail');
assert.ok(badCategory.errors.some(e => e.includes('category_id')), 'Whole-car rejection must identify category_id');

const shortTitle = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts', title_ar: 'AB', currency: 'JOD', country_code: 'JO'
});
assert.ok(!shortTitle.valid, 'Title less than 3 chars must fail');

const negPrice = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts', title_ar: 'test title', price: -5, currency: 'JOD', country_code: 'JO'
});
assert.ok(!negPrice.valid, 'Negative price must fail');

const manyImages = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts', title_ar: 'test title ok', currency: 'JOD', country_code: 'JO',
  images: Array.from({ length: 8 }, (_, i) => ({ url: `https://cdn.example.com/img${i}.jpg`, order: i }))
});
assert.ok(!manyImages.valid, 'More than 7 images must fail');

const badCC = validateListingInput({
  sector_id: 'automotive', category_id: 'auto_parts', title_ar: 'test title', currency: 'JOD', country_code: 'LONG'
});
assert.ok(!badCC.valid, 'Invalid country code must fail');

const missingGeo = validateListingInput({ sector_id: 'materials', category_id: 'suppliers', title_ar: 'test title here' });
assert.equal(Object.hasOwn(missingGeo.cleaned, 'currency'), false, 'currency must never silently default');
assert.equal(Object.hasOwn(missingGeo.cleaned, 'country_code'), false, 'country must never silently default');

const t1 = validateStatusTransition('draft', 'pending_review', { capabilities: ['listing.submit.own'] });
assert.ok(t1.allowed, 'Explicit own-submit capability can submit draft');

const t2 = validateStatusTransition('pending_review', 'published', { capabilities: ['listing.review.publish'] });
assert.ok(!t2.allowed, 'undefined state transition remains forbidden');
assert.ok(typeof t2.reason === 'string' && t2.reason.length > 0, 'Must have a reason');

const roleOnly = validateStatusTransition('under_review', 'published', 'moderator');
assert.ok(!roleOnly.allowed, 'Role strings cannot authorize status changes');

const t3 = validateStatusTransition('under_review', 'published', { capabilities: ['listing.review.publish'] });
assert.ok(t3.allowed, 'Explicit publish capability can publish from under_review');

const t4 = validateStatusTransition('under_review', 'rejected', { capabilities: ['listing.review.reject'] });
assert.ok(t4.allowed, 'Explicit reject capability can reject');

const t5 = validateStatusTransition('archived', 'published', { capabilities: ['listing.review.publish'] });
assert.ok(!t5.allowed, 'Archived listings cannot be re-published');

const t6 = validateStatusTransition('published', 'published', { capabilities: ['listing.review.publish'] });
assert.ok(!t6.allowed, 'published -> published not a defined transition');

for (const status of VALID_STATUSES) {
  assert.ok(status in LISTING_TRANSITIONS, `State machine must define transitions for: ${status}`);
}

const ownerListing = {
  id: 'uuid1', clerk_user_id: 'user_abc', moderator_id: 'mod_xyz',
  title_ar: 'Test', status: 'published', rejection_reason: null
};
const ownerSafe = sanitizeListingForOwner(ownerListing);
assert.ok(!('moderator_id' in ownerSafe), 'moderator_id must be removed for owner');
assert.ok('clerk_user_id' in ownerSafe, 'clerk_user_id visible to owner');
assert.ok('rejection_reason' in ownerSafe, 'rejection_reason visible to owner');

const publicSafe = sanitizeListingForPublic(ownerListing);
assert.ok(!('moderator_id' in publicSafe), 'moderator_id removed from public');
assert.ok(!('clerk_user_id' in publicSafe), 'clerk_user_id removed from public');
assert.ok(!('rejection_reason' in publicSafe), 'rejection_reason removed from public');

assert.equal(sanitizeListingForOwner(null), null);
assert.equal(sanitizeListingForPublic(null), null);

console.log('PASS: Global V1 listing API compatibility contract');

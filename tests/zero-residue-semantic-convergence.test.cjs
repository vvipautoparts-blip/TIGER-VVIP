'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const listingApi = require('../scripts/listing/listing-api-contract.js');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

// 1) Global listing input must not silently inherit one master country/currency.
const missingGeo = listingApi.validateListingInput({
  sector_id: 'materials',
  category_id: 'suppliers',
  title_ar: 'مواد بناء للاستخدام التجاري'
});
assert.equal(missingGeo.valid, false, 'country/currency must be explicit, not silently defaulted');
assert.ok(missingGeo.errors.some((message) => /currency/i.test(message)), 'missing currency must be reported');
assert.ok(missingGeo.errors.some((message) => /country/i.test(message)), 'missing country must be reported');
assert.equal(Object.hasOwn(missingGeo.cleaned, 'currency'), false, 'no implicit currency may be emitted');
assert.equal(Object.hasOwn(missingGeo.cleaned, 'country_code'), false, 'no implicit country may be emitted');

// 2) Whole-vehicle categories are not valid automotive listing input.
const wholeVehicle = listingApi.validateListingInput({
  sector_id: 'automotive',
  category_id: 'auto_full_cars',
  title_ar: 'سيارة كاملة للبيع',
  currency: 'JOD',
  country_code: 'JO'
});
assert.equal(wholeVehicle.valid, false, 'whole-vehicle automotive inventory must fail closed');
assert.ok(wholeVehicle.errors.some((message) => /category/i.test(message)), 'whole-vehicle rejection must identify category');

// 3) Status authority is capability-driven; role labels alone are never authority.
const roleOnly = listingApi.validateStatusTransition('under_review', 'published', 'moderator');
assert.equal(roleOnly.allowed, false, 'role label must not authorize publishing');

const capabilityPublish = listingApi.validateStatusTransition('under_review', 'published', {
  capabilities: ['listing.review.publish']
});
assert.equal(capabilityPublish.allowed, true, 'explicit publish capability should authorize the defined transition');

const ownSubmit = listingApi.validateStatusTransition('draft', 'pending_review', {
  capabilities: ['listing.submit.own']
});
assert.equal(ownSubmit.allowed, true, 'own submit capability should authorize draft submission');

// 4) Current visible search copy must not invite whole-car inventory.
const indexHtml = read('index.html');
assert.doesNotMatch(indexHtml, /ابحث عن منتج، خدمة، شركة، عقار أو سيارة/i, 'Home marketplace placeholder must not advertise whole cars');

const translations = JSON.parse(read('scripts/vvip-i18n-translations.json'));
assert.doesNotMatch(translations.ar['search.placeholder'], /سيارة/i, 'Arabic search placeholder must not advertise whole cars');
assert.doesNotMatch(translations.en['search.placeholder'], /\bcars?\b/i, 'English search placeholder must not advertise whole cars');

// 5) Broker account type may represent an independent external profession, never TIGER brokerage.
const accountTypesSource = read('scripts/onboarding/pr38-account-types.js');
assert.doesNotMatch(accountTypesSource, /وساطة منظمة بين الأطراف ضمن ضوابط المنصة/, 'broker description must not imply TIGER-managed brokerage');
assert.doesNotMatch(accountTypesSource, /Structured brokering between parties under platform rules/i, 'English broker description must not imply TIGER-managed brokerage');
assert.match(accountTypesSource, /TIGER[^\n]*(?:الاكتشاف|التواصل)|(?:الاكتشاف|التواصل)[^\n]*TIGER/i, 'broker description must preserve discovery/contact boundary');

// 6) A forward-only source migration must retire the historical full-car category without deleting audit history.
const retirementMigration = read('supabase/migrations/20260823033000_retire_whole_vehicle_automotive_category.sql');
assert.match(retirementMigration, /auto_full_cars/i, 'retirement migration must address the legacy category');
assert.match(retirementMigration, /is_active\s*=\s*false/i, 'legacy category must be deactivated, not deleted');
assert.doesNotMatch(retirementMigration, /delete\s+from\s+vvip_categories/i, 'historical category rows must not be deleted');
assert.match(retirementMigration, /NOT\s+VALID/i, 'new whole-vehicle write guard should avoid retroactive validation of historical rows');

console.log('PASS: zero-residue semantic convergence');

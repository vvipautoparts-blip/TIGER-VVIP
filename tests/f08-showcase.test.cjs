'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const generatorPath = path.resolve(__dirname, '../scripts/showcase/generate-f08-showcase.cjs');
const verifierPath = path.resolve(__dirname, '../scripts/showcase/verify-f08-showcase.cjs');

const sectors = ['automotive','real-estate','professional-services','equipment'];
const countries = ['JO','AE','DE','CA'];

function make() {
  const { generateF08Showcase } = require(generatorPath);
  return generateF08Showcase({ seed: 'TIGER-F08-2026', sectors, countries });
}

test('F08 generates exactly 25,000 deterministic synthetic objects', () => {
  const first = make();
  const second = make();
  assert.equal(first.length, 25000);
  assert.equal(second.length, 25000);
  assert.deepEqual(first.slice(0, 25), second.slice(0, 25));
  assert.equal(new Set(first.map(item => item.syntheticId)).size, 25000);
});

test('F08 objects are explicitly synthetic and use only supplied registries', () => {
  const rows = make();
  for (const row of rows) {
    assert.equal(row.synthetic, true);
    assert.ok(sectors.includes(row.sector));
    assert.ok(countries.includes(row.countryCode));
    assert.ok(['OFFER','NEED','SERVICE','OPPORTUNITY'].includes(row.intent));
  }
});

test('F08 contains no real-person contact or product lifetime fields', () => {
  const rows = make();
  const forbidden = ['phone','email','contactPhone','contact_email','expiresAt','expiry','productLifetime','lifetimeDays'];
  for (const row of rows) {
    for (const key of forbidden) assert.equal(Object.prototype.hasOwnProperty.call(row, key), false);
    assert.doesNotMatch(JSON.stringify(row), /@|https?:\/\/|wa\.me|tel:/i);
  }
});

test('F08 verifier rejects wrong count, duplicates and unlabeled objects', () => {
  const { verifyF08Showcase } = require(verifierPath);
  const rows = make();
  let result = verifyF08Showcase(rows, { sectors, countries });
  assert.equal(result.ok, true, result.errors.join('\n'));

  result = verifyF08Showcase(rows.slice(0, 24999), { sectors, countries });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_REQUIRES_EXACTLY_25000_OBJECTS'));

  const duplicate = rows.slice();
  duplicate[24999] = duplicate[0];
  result = verifyF08Showcase(duplicate, { sectors, countries });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_SYNTHETIC_IDS_MUST_BE_UNIQUE'));

  const unlabeled = rows.slice();
  unlabeled[0] = { ...unlabeled[0], synthetic: false };
  result = verifyF08Showcase(unlabeled, { sectors, countries });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('F08_ALL_OBJECTS_MUST_BE_SYNTHETIC'));
});

test('F08 generator refuses missing or empty sector/country registries', () => {
  const { generateF08Showcase } = require(generatorPath);
  assert.throws(() => generateF08Showcase({ seed: 'x', sectors: [], countries }), /F08_SECTOR_REGISTRY_REQUIRED/);
  assert.throws(() => generateF08Showcase({ seed: 'x', sectors, countries: [] }), /F08_COUNTRY_REGISTRY_REQUIRED/);
});

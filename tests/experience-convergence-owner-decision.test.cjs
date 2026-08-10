const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const decisionPath = path.join(
  __dirname,
  '..',
  'project-control',
  'experience-convergence',
  'v1',
  'owner-decision.json'
);

function decision() {
  assert.equal(
    fs.existsSync(decisionPath),
    true,
    'owner decision must exist before experience convergence can pass'
  );
  return JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
}

test('owner decision removes blanket manual review from the ordinary listing path', () => {
  const value = decision();
  assert.equal(value.listing_publication.blanket_manual_review_required, false);
  assert.equal(value.listing_publication.exception_policy_hold_allowed, true);
  assert.equal(value.listing_publication.automated_safety_checks_required, true);
});

test('owner decision places pricing and visibility after ad content is complete', () => {
  const value = decision();
  assert.equal(value.listing_creation.content_first, true);
  assert.equal(value.listing_creation.pricing_step, 'AFTER_CONTENT_COMPLETE');
  assert.equal(value.listing_creation.payment_required_to_start_draft, false);
});

test('owner decision declares all seven approved marketplace sectors', () => {
  const value = decision();
  assert.deepEqual(value.marketplace.sectors, [
    'automotive',
    'real-estate',
    'construction',
    'professional-services',
    'equipment',
    'trade-supply',
    'engineering-consulting'
  ]);
});

test('owner decision preserves mandatory security and policy boundaries', () => {
  const value = decision();
  assert.deepEqual(value.security_controls.mandatory, [
    'AUTHENTICATION',
    'RLS',
    'MEDIA_VALIDATION',
    'INPUT_VALIDATION',
    'ABUSE_CONTROLS',
    'COUNTRY_SEAL',
    'PAYMENT_VERIFICATION',
    'AUDIT_TRAIL'
  ]);
  assert.equal(value.production_mutations_allowed_by_this_decision, false);
});

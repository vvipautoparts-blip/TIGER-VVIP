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

test('ordinary social posts publish directly without business paperwork or human preview', () => {
  const value = decision();
  assert.equal(value.social_post.publish_mode, 'DIRECT');
  assert.equal(value.social_post.commercial_registration_required, false);
  assert.equal(value.social_post.business_verification_required, false);
  assert.equal(value.social_post.blanket_manual_review_required, false);
  assert.equal(value.social_post.admin_preview_required, false);
  assert.equal(value.social_post.payment_required_to_publish, false);
  assert.equal(value.social_post.marketplace_fields_required, false);
  assert.equal(value.social_post.automated_safety_controls_required, true);
});

test('social post financing is optional and appears only after publication succeeds', () => {
  const value = decision();
  assert.equal(value.social_post_financing.optional, true);
  assert.equal(value.social_post_financing.trigger, 'AFTER_SUCCESSFUL_PUBLICATION');
  assert.equal(value.social_post_financing.blocks_publication, false);
  assert.equal(value.social_post_financing.pricing_source, 'COUNTRY_POLICY');
  assert.equal(value.social_post_financing.server_payment_verification_required, true);
});

test('every monetary purchase binds Clerk identity to the trusted internal account', () => {
  const value = decision();
  assert.equal(value.purchase_identity.clerk_identity_required, true);
  assert.equal(value.purchase_identity.internal_account_required, true);
  assert.equal(value.purchase_identity.canonical_internal_account_field, 'accountId');
  assert.equal(value.purchase_identity.profile_identity_bridge_field, 'clerk_user_id');
  assert.equal(value.purchase_identity.client_supplied_account_override_allowed, false);
  assert.equal(value.purchase_identity.server_authorization_required, true);
  assert.equal(value.purchase_identity.audit_required, true);
  assert.deepEqual(value.purchase_identity.applies_to, [
    'PURCHASE',
    'PAYMENT',
    'POST_BOOST',
    'LISTING_VISIBILITY',
    'SUBSCRIPTION'
  ]);
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

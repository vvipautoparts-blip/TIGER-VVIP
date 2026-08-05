const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const constitutionPath = path.join(
  root,
  'project-control/v13.1/contracts/owner_constitution.json'
);

function loadConstitution() {
  assert.ok(
    fs.existsSync(constitutionPath),
    'V13.1 owner constitution must exist as an executable repository contract'
  );

  return JSON.parse(fs.readFileSync(constitutionPath, 'utf8'));
}

test('V13.1 is the final constitutional authority and production stays fail-closed', () => {
  const constitution = loadConstitution();

  assert.equal(constitution.constitution_id, 'V13.1');
  assert.equal(constitution.authority, 'OWNER_FINAL_CONSTITUTION');
  assert.equal(constitution.precedence, 'SUPERSEDES_INCOMPATIBLE_LEGACY_RULES');
  assert.equal(
    constitution.production_state,
    'BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE'
  );
});

test('the final global listing image limit is exactly seven and never price-dependent', () => {
  const constitution = loadConstitution();

  assert.equal(constitution.listing_media.max_images_per_listing, 7);
  assert.equal(constitution.listing_media.video_enabled, false);
  assert.equal(constitution.listing_media.image_limit_price_dependent, false);
  assert.deepEqual(
    constitution.listing_media.supersedes,
    ['GLOBAL_IMAGE_LIMIT_10', 'ANY_PAID_IMAGE_LIMIT_INCREASE']
  );
});

test('impression quantity has no global fixed value and is controlled only by a country seal', () => {
  const constitution = loadConstitution();

  assert.equal(constitution.exposure.global_fixed_impressions, null);
  assert.equal(constitution.exposure.quantity_authority, 'COUNTRY_SEAL_ONLY');
  assert.equal(constitution.exposure.price_authority, 'COUNTRY_SEAL_ONLY');
  assert.deepEqual(constitution.exposure.forbidden_global_values, [250, 400]);
});

test('chat delivery and mediation have full general availability for all users', () => {
  const constitution = loadConstitution();

  for (const capabilityName of ['internal_chat', 'delivery', 'mediation']) {
    const capability = constitution.capabilities[capabilityName];
    assert.equal(capability.constitutionally_allowed, true, capabilityName);
    assert.equal(
      capability.availability_policy,
      'FULL_GENERAL_AVAILABILITY',
      capabilityName
    );
    assert.equal(capability.access_scope, 'ALL_USERS', capabilityName);
    assert.equal(capability.owner_or_partner_grant_required, false, capabilityName);
    assert.equal(capability.user_self_access_allowed, true, capabilityName);
  }
});

test('WhatsApp is an approval-free handoff to the app installed on the user device', () => {
  const constitution = loadConstitution();
  const whatsapp = constitution.capabilities.external_whatsapp;

  assert.equal(whatsapp.prepared, true);
  assert.equal(whatsapp.implementation_state, 'FULLY_PREPARED');
  assert.equal(whatsapp.integration_mode, 'EXTERNAL_HANDOFF_ONLY');
  assert.equal(whatsapp.handoff_type, 'DEVICE_APP_DEEP_LINK');
  assert.equal(
    whatsapp.target_application,
    'WHATSAPP_INSTALLED_ON_USER_DEVICE'
  );
  assert.equal(whatsapp.availability_policy, 'FULL_GENERAL_AVAILABILITY');
  assert.equal(whatsapp.access_scope, 'ALL_USERS');
  assert.equal(whatsapp.approval_required, false);
  assert.equal(whatsapp.user_self_access_allowed, true);
  assert.equal(whatsapp.internal_message_transport, false);
  assert.equal(whatsapp.platform_sends_messages, false);
  assert.equal(whatsapp.platform_receives_messages, false);
  assert.equal(whatsapp.platform_reads_messages, false);
  assert.equal(whatsapp.platform_stores_messages, false);
  assert.equal(whatsapp.platform_manages_whatsapp_account, false);
  assert.equal(whatsapp.whatsapp_api_integration, false);
  assert.equal('approval_policy' in whatsapp, false);
  assert.equal('required_approver_groups' in whatsapp, false);
  assert.equal('grant_required' in whatsapp, false);
  assert.equal('grant_authority_roles' in whatsapp, false);
});

test('legacy conflicts are explicitly superseded instead of remaining active silently', () => {
  const constitution = loadConstitution();
  const conflictIds = new Set(
    constitution.legacy_overrides.map((entry) => entry.legacy_rule_id)
  );

  for (const required of [
    'GLOBAL_IMAGE_LIMIT_10',
    'GLOBAL_FIXED_IMPRESSIONS_250',
    'GLOBAL_FIXED_IMPRESSIONS_400',
    'CHAT_FORBIDDEN',
    'DELIVERY_FORBIDDEN',
    'MEDIATION_FORBIDDEN'
  ]) {
    assert.ok(conflictIds.has(required), `missing legacy override: ${required}`);
  }

  assert.ok(
    constitution.legacy_overrides.every(
      (entry) => entry.classification === 'SUPERSEDED_BY_V13_1_OWNER_FINAL'
    )
  );
});

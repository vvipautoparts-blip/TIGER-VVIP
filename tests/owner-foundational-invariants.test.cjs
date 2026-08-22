"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const authorityPath = path.join(root, "project-control/owner/OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.json");
const registryPath = path.join(root, "docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

function readAuthority() {
  return JSON.parse(fs.readFileSync(authorityPath, "utf8"));
}

test("owner foundational authority exists and is active for the complete platform", () => {
  const authority = readAuthority();
  assert.equal(authority.status, "ACTIVE_OWNER_AUTHORITY");
  assert.equal(authority.scope, "ENTIRE_PLATFORM");
  assert.equal(authority.design_horizon, "2026-2096+");
});

test("automotive remains parts-only and whole vehicles are prohibited", () => {
  const authority = readAuthority();
  assert.equal(authority.automotive.parts_only, true);
  assert.equal(authority.automotive.whole_vehicle_listings_allowed, false);
  assert.equal(authority.automotive.whole_vehicle_sale_rental_inventory_allowed, false);
  assert.equal(authority.automotive.vehicle_models_or_miniatures_as_automotive_vehicle_inventory_allowed, false);
});

test("food is full-scope and includes meat and poultry families", () => {
  const authority = readAuthority();
  assert.equal(authority.food.full_scope, true);
  assert.ok(authority.food.required_category_families.includes("meat"));
  assert.ok(authority.food.required_category_families.includes("poultry"));
  assert.ok(authority.food.required_category_families.includes("fish_seafood"));
  assert.ok(authority.food.required_category_families.includes("dairy"));
});

test("platform is country-portable without claiming legal exemption", () => {
  const authority = readAuthority();
  assert.equal(authority.global_architecture.single_country_master, false);
  assert.equal(authority.global_architecture.hardcoded_launch_country, false);
  assert.equal(authority.global_architecture.applicable_law_bypass_allowed, false);
});

test("sensitive permissions fail closed and delegation cannot exceed grantor scope", () => {
  const authority = readAuthority();
  assert.equal(authority.permissions.sensitive_permissions_default_granted, false);
  assert.equal(authority.permissions.server_side_authoritative, true);
  assert.equal(authority.permissions.owner_high_risk_requires_fresh_step_up, true);
  assert.equal(authority.delegation.partner_can_delegate_only_with_explicit_capability, true);
  assert.equal(authority.delegation.grantor_can_exceed_own_capability, false);
  assert.equal(authority.delegation.grantor_can_widen_beyond_delegation_ceiling, false);
});

test("owner has sovereign country-scoped payment rail authority", () => {
  const authority = readAuthority();
  const payment = authority.owner_payment_control;

  assert.equal(payment.owner_is_root_authority, true);
  assert.equal(payment.final_activation_requires_owner, true);
  assert.equal(payment.fresh_step_up_required_for_activation_rotation_retirement, true);
  assert.equal(payment.country_payment_profile_required, true);
  assert.equal(payment.provider_neutral_core, true);
  assert.equal(payment.new_rail_requires_core_rebuild, false);
  assert.equal(payment.payment_numbers_hardcoded_in_application_code, false);
  assert.equal(payment.active_configuration_is_versioned_immutable, true);
  assert.equal(payment.all_changes_use_change_sets, true);
  assert.equal(payment.atomic_activation, true);
  assert.equal(payment.rollback_to_last_verified_version, true);
  assert.equal(payment.silent_cross_country_fallback_allowed, false);
  assert.equal(payment.raw_payment_credentials_in_client_or_repo_allowed, false);

  for (const capability of [
    "PAYMENT_RAIL_CREATE",
    "PAYMENT_DESTINATION_ROTATE",
    "PAYMENT_PROVIDER_ONBOARD",
    "PAYMENT_RAIL_VERIFY",
    "PAYMENT_RAIL_ACTIVATE",
    "PAYMENT_RAIL_SUSPEND",
    "PAYMENT_RAIL_RETIRE",
    "PAYMENT_CHANGESET_APPROVE"
  ]) {
    assert.ok(authority.permissions.owner_core_capabilities.includes(capability), capability);
  }
});

test("Jordan country payment profile can configure CliQ without falsely claiming it is live", () => {
  const payment = readAuthority().owner_payment_control;
  const jordan = payment.jordan_profile;

  assert.equal(jordan.country_code, "JO");
  assert.equal(jordan.cliq_supported_as_configurable_rail, true);
  assert.equal(jordan.cliq_assumed_active_without_provider_contract, false);
  assert.equal(jordan.messaging_standard, "ISO_20022");
  assert.ok(jordan.cliq_endpoint_types_supported_by_manifest.includes("ALIAS"));
  assert.ok(jordan.cliq_endpoint_types_supported_by_manifest.includes("IBAN"));
  assert.ok(jordan.cliq_endpoint_types_supported_by_manifest.includes("MERCHANT_ACQUIRER_QR"));
});

test("platform payment rails remain platform-owned-service only and never external-deal settlement", () => {
  const authority = readAuthority();
  const payment = authority.owner_payment_control;

  assert.equal(payment.external_buyer_seller_deal_payments_allowed, false);
  assert.ok(payment.purpose_scope.includes("advertising"));
  assert.ok(payment.purpose_scope.includes("campaigns"));
  assert.ok(payment.purpose_scope.includes("ad_credits_packages"));
  assert.equal(authority.contact_boundary.external_deal_payment, 0);
  assert.equal(authority.contact_boundary.external_deal_settlement, 0);
});

test("platform earnings use immutable 14-day cycles and never external-deal commission", () => {
  const authority = readAuthority();
  assert.equal(authority.platform_earnings.cycle_days, 14);
  assert.equal(authority.platform_earnings.current_meter_resets_each_cycle, true);
  assert.equal(authority.platform_earnings.reset_deletes_history, false);
  assert.equal(authority.platform_earnings.external_deal_commission_allowed, false);
  assert.equal(authority.platform_earnings.ledger, "APPEND_ONLY_WITH_REVERSING_ADJUSTMENTS");
});

test("protected-view and anti-tamper authority does not claim impossible guarantees", () => {
  const authority = readAuthority();
  assert.equal(authority.screen_capture.absolute_physical_camera_prevention_claim, false);
  assert.equal(authority.anti_tamper.sensitive_authority_server_side, true);
  assert.equal(authority.anti_tamper.durable_client_secrets_allowed, false);
  assert.equal(authority.anti_tamper.tampered_client_confers_server_authority, false);
});

test("contact handoff remains terminal and registry keeps the fail-closed boundary", () => {
  const authority = readAuthority();
  const registry = fs.readFileSync(registryPath, "utf8");
  assert.equal(authority.contact_boundary.terminal, true);
  assert.equal(authority.contact_boundary.external_deal_state_machine, 0);
  assert.equal(authority.contact_boundary.external_deal_payment, 0);
  assert.equal(authority.contact_boundary.external_deal_commission, 0);
  assert.match(registry, /CONTACT_HANDOFF_IS_TERMINAL=true/);
});

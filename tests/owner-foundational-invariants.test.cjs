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

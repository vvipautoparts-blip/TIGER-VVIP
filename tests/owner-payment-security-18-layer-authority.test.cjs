"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const authorityPath = path.join(
  root,
  "project-control/owner/OWNER_PAYMENT_SECURITY_18_LAYER_DEFENSE_2026-08-22.json"
);

function authority() {
  return JSON.parse(fs.readFileSync(authorityPath, "utf8"));
}

test("payment control plane has exactly eighteen independent constitutional security layers", () => {
  const value = authority();
  assert.equal(value.status, "ACTIVE_OWNER_SECURITY_AUTHORITY");
  assert.equal(value.scope, "SOVEREIGN_PAYMENT_CONTROL_PLANE");
  assert.equal(value.layers.length, 18);
  assert.equal(value.invariants.layer_count, 18);
  assert.deepEqual(value.layers.map((layer) => layer.id), Array.from({ length: 18 }, (_, index) => index + 1));
  assert.equal(new Set(value.layers.map((layer) => layer.key)).size, 18);
});

test("one bypass can never grant sovereign payment authority", () => {
  const value = authority();
  assert.equal(value.absolute_unhackable_claim, false);
  assert.equal(value.single_layer_bypass_grants_authority, false);
  assert.equal(value.fail_closed_on_uncertain_sensitive_authorization, true);
});

test("eighteen-layer contract includes identity, attestation, authorization and HSM-backed secret custody", () => {
  const keys = new Set(authority().layers.map((layer) => layer.key));
  for (const required of [
    "PHISHING_RESISTANT_OWNER_IDENTITY",
    "FRESH_ACTION_BOUND_STEP_UP",
    "SHORT_LIVED_CAPABILITY_LEASE",
    "DEVICE_APP_ATTESTATION",
    "ZERO_TRUST_CONTINUOUS_RISK",
    "SERVER_SIDE_FINE_GRAINED_AUTHORIZATION",
    "DESTINATION_VAULT_HSM_KMS"
  ]) assert.ok(keys.has(required), required);
});

test("eighteen-layer contract includes endpoint verification, atomic activation and service isolation", () => {
  const keys = new Set(authority().layers.map((layer) => layer.key));
  for (const required of [
    "VERIFIED_PAYEE_ENDPOINT_BINDING",
    "IMMUTABLE_VERSIONED_CHANGESETS",
    "ATOMIC_ACTIVATION_REPLAY_DEFENSE",
    "NETWORK_SERVICE_SEGMENTATION"
  ]) assert.ok(keys.has(required), required);
});

test("eighteen-layer contract includes client resilience, supply-chain trust and adaptive detection", () => {
  const keys = new Set(authority().layers.map((layer) => layer.key));
  for (const required of [
    "RUNTIME_ANTI_TAMPER_CAPTURE_RISK",
    "SIGNED_BUILD_SUPPLY_CHAIN_PROVENANCE",
    "REAL_TIME_ANOMALY_ADAPTIVE_RESPONSE"
  ]) assert.ok(keys.has(required), required);
});

test("eighteen-layer contract ends with immutable owner truth and fail-closed recovery", () => {
  const keys = new Set(authority().layers.map((layer) => layer.key));
  assert.ok(keys.has("IMMUTABLE_AUDIT_OWNER_ALERTING"));
  assert.ok(keys.has("FAIL_CLOSED_KILL_SWITCH_VERIFIED_ROLLBACK"));
  assert.equal(authority().invariants.immutable_audit_owner_alert, true);
  assert.equal(authority().invariants.kill_switch_verified_rollback, true);
});

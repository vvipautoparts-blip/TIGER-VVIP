"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const authorityPath = path.join(
  root,
  "project-control/owner/OWNER_SELF_EVOLVING_COGNITIVE_CONTINUUM_2026-08-23.json"
);
const registryPath = path.join(root, "docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

function readAuthority() {
  return JSON.parse(fs.readFileSync(authorityPath, "utf8"));
}

test("owner cognitive continuum authority is active and extends the existing route", () => {
  const authority = readAuthority();

  assert.equal(authority.status, "ACTIVE_OWNER_AUTHORITY");
  assert.equal(authority.scope, "INTERNAL_COGNITIVE_CONTINUITY");
  assert.equal(authority.architecture.same_route_extension, true);
  assert.equal(authority.architecture.new_parallel_core, false);
  assert.equal(
    authority.architecture.model,
    "SELF_EVOLVING_COGNITIVE_CONTINUUM_WITH_CONSTITUTIONAL_GENOME"
  );
});

test("constitutional genome constrains evolution while cognition remains adaptive", () => {
  const cognition = readAuthority().cognition;

  assert.equal(cognition.permanent_mind, true);
  assert.equal(cognition.constitutional_genome.stable, true);
  assert.equal(cognition.constitutional_genome.self_rewrite_allowed, false);
  assert.equal(cognition.selective_memory, true);
  assert.equal(cognition.living_world_model, true);
  assert.equal(cognition.imagination_and_simulation, true);
  assert.equal(cognition.autonomous_curiosity, true);
  assert.equal(cognition.capability_genesis, true);
  assert.equal(cognition.independent_critic, true);
  assert.equal(cognition.shadow_evolution, true);
  assert.equal(cognition.real_selective_forgetting, true);
});

test("handoff stops the external deal role, not the internal cognitive continuum", () => {
  const boundary = readAuthority().post_handoff_boundary;

  assert.equal(boundary.contact_handoff_terminal, true);
  assert.equal(boundary.tiger_commercial_role_stops, true);
  assert.equal(boundary.external_deal_observation_allowed, false);
  assert.equal(boundary.external_negotiation_learning_allowed, false);
  assert.equal(boundary.external_payment_learning_allowed, false);
  assert.equal(boundary.internal_cognitive_continuum_continues, true);
  assert.equal(boundary.legacy_learning_stops_semantic_active, false);
  assert.equal(boundary.canonical_phrase, "THE DEAL STOPS. THE MIND EVOLVES.");
});

test("cognitive evolution is verified before structural promotion", () => {
  const evolution = readAuthority().evolution;

  assert.deepEqual(evolution.required_sequence, [
    "IMAGINE",
    "SIMULATE",
    "CRITIQUE",
    "VERIFY",
    "SHADOW",
    "GATE",
    "PROMOTE_OR_REJECT"
  ]);
  assert.equal(evolution.creator_is_sole_verifier, false);
  assert.equal(evolution.direct_unverified_production_self_modification, false);
});

test("cognitive authority preserves privacy, provenance, uncertainty and selective forgetting", () => {
  const memory = readAuthority().memory_governance;

  assert.equal(memory.store_everything_forever, false);
  assert.equal(memory.provenance_required, true);
  assert.equal(memory.confidence_required, true);
  assert.equal(memory.freshness_required, true);
  assert.equal(memory.privacy_class_required, true);
  assert.equal(memory.cognitive_half_life, true);
  assert.equal(memory.full_pipeline_erasure_propagation, true);
});

test("name remains mutable while architectural contracts remain authoritative", () => {
  const naming = readAuthority().naming;

  assert.equal(naming.display_name_mutable, true);
  assert.equal(naming.architectural_contracts_mutable_by_rebrand, false);
});

test("canonical owner registry records the deal-stops mind-evolves invariant", () => {
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(registry, /THE_DEAL_STOPS_THE_MIND_EVOLVES=true/);
  assert.match(
    registry,
    /OWNER_SELF_EVOLVING_COGNITIVE_CONTINUUM_2026-08-23\.md/
  );
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
  __dirname,
  "../scripts/discovery/one-field-semantic-capsule.js"
);

function loadCapsuleBoundary() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function validCapsuleInput() {
  return {
    capsuleId: "capsule_listing_cereal_01",
    sourceObjectId: "listing_cereal_01",
    sourceObjectType: "listing",
    canonicalConcepts: ["cpt_breakfast_cereal", "cpt_no_added_sugar"],
    aliases: ["كورن فليكس للأطفال بدون سكر", "kids cereal without added sugar"],
    structuredAttributes: {
      sugarGramsPer100g: 0,
      allergens: ["gluten"],
      packageSealed: true
    },
    relations: ["rel_audience_children"],
    multimodalRepresentations: ["media_image_cereal_01"],
    personaId: "persona_shop_01",
    domainViews: ["view_grocery_discovery"],
    conditionState: "new",
    geoContext: {
      countryCode: "JO",
      locality: "Amman"
    },
    timeFreshness: {
      publishedAt: "2026-08-22T09:00:00Z"
    },
    availabilitySignal: "available",
    evidenceRefs: ["evidence_label_01"],
    trustProjection: {
      level: "verified"
    },
    countryPolicyContext: {
      countryCode: "JO",
      policyVersion: "policy_2026_08"
    }
  };
}

test("semantic capsule returns a deeply immutable discovery projection", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();
  const input = validCapsuleInput();
  const capsule = createSemanticCapsule(input);

  assert.deepEqual(capsule, input);
  assert.equal(Object.isFrozen(capsule), true);
  assert.equal(Object.isFrozen(capsule.canonicalConcepts), true);
  assert.equal(Object.isFrozen(capsule.structuredAttributes), true);
  assert.equal(Object.isFrozen(capsule.structuredAttributes.allergens), true);
  assert.equal(Object.isFrozen(capsule.geoContext), true);
  assert.equal(Object.isFrozen(capsule.countryPolicyContext), true);

  assert.notEqual(capsule, input);
  assert.notEqual(capsule.canonicalConcepts, input.canonicalConcepts);
  assert.notEqual(capsule.structuredAttributes, input.structuredAttributes);
});

test("semantic capsule rejects unknown top-level fields", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();
  const input = validCapsuleInput();
  input.checkoutUrl = "https://example.invalid/checkout";

  assert.throws(
    () => createSemanticCapsule(input),
    /SEMANTIC_CAPSULE_UNKNOWN_FIELD/
  );
});

test("semantic capsule rejects duplicate semantic, view, and evidence identifiers", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();

  for (const [field, duplicate] of [
    ["canonicalConcepts", "cpt_breakfast_cereal"],
    ["domainViews", "view_grocery_discovery"],
    ["evidenceRefs", "evidence_label_01"]
  ]) {
    const input = validCapsuleInput();
    input[field] = [...input[field], duplicate];
    assert.throws(
      () => createSemanticCapsule(input),
      /SEMANTIC_CAPSULE_DUPLICATE_VALUE/,
      field
    );
  }
});

test("semantic capsule rejects recursive secret-bearing and prototype-pollution-shaped data", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();

  for (const structuredAttributes of [
    { nutrition: { authorization: "Bearer hidden" } },
    { provider: { serviceRole: "hidden" } },
    { credentials: { password: "hidden" } },
    JSON.parse('{"__proto__":{"polluted":true}}')
  ]) {
    const input = validCapsuleInput();
    input.structuredAttributes = structuredAttributes;
    assert.throws(
      () => createSemanticCapsule(input),
      /SEMANTIC_CAPSULE_UNSAFE_DATA/
    );
  }
});

test("semantic capsule accepts only discovery source object types", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();

  for (const sourceObjectType of ["order", "checkout", "payment", "escrow"] ) {
    const input = validCapsuleInput();
    input.sourceObjectType = sourceObjectType;
    assert.throws(
      () => createSemanticCapsule(input),
      /SEMANTIC_CAPSULE_SOURCE_TYPE_DENIED/,
      sourceObjectType
    );
  }
});

test("semantic capsule enforces brand-neutral stable identifier families", () => {
  const { createSemanticCapsule } = loadCapsuleBoundary();

  const invalidCases = [
    ["capsuleId", "TIGER-capsule-1"],
    ["sourceObjectId", "order_12345678"],
    ["personaId", "VVIP-owner-persona"],
    ["canonicalConcepts", ["TIGER_cereal"]],
    ["domainViews", ["mall"]],
    ["evidenceRefs", ["proof"]]
  ];

  for (const [field, value] of invalidCases) {
    const input = validCapsuleInput();
    input[field] = value;
    assert.throws(
      () => createSemanticCapsule(input),
      /SEMANTIC_CAPSULE_INVALID_ID/,
      field
    );
  }
});

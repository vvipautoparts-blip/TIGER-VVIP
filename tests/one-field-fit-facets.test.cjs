"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
  __dirname,
  "../scripts/discovery/one-field-fit-facets.js"
);

function loadFacetBoundary() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function cerealCapsule() {
  return {
    capsuleId: "capsule_listing_cereal_01",
    conditionState: "new",
    structuredAttributes: {
      sugar: "0g",
      allergens: ["gluten"],
      ingredients: ["corn"],
      age_suitability: "children",
      pack_size: "375g",
      brand: "example",
      price: 3.5
    },
    geoContext: { locality: "Amman" }
  };
}

test("generated cereal facets follow intent importance and available evidence", () => {
  const { generateFacets } = loadFacetBoundary();
  const facets = generateFacets({
    intent: {
      primaryFacets: [
        "sugar",
        "allergens",
        "ingredients",
        "age_suitability",
        "pack_size",
        "brand",
        "price",
        "location"
      ]
    },
    capsules: [cerealCapsule()],
    facetSchema: [
      "sugar",
      "allergens",
      "ingredients",
      "age_suitability",
      "pack_size",
      "brand",
      "price",
      "location"
    ]
  });

  assert.deepEqual(facets, [
    "sugar",
    "allergens",
    "ingredients",
    "age_suitability",
    "pack_size",
    "brand",
    "price",
    "location"
  ]);
  assert.equal(Object.isFrozen(facets), true);
});

test("durable-goods intent can prioritize condition dimensions and location", () => {
  const { generateFacets } = loadFacetBoundary();
  const facets = generateFacets({
    intent: {
      primaryFacets: ["condition", "dimensions", "material", "location", "price"]
    },
    capsules: [{
      capsuleId: "capsule_listing_sofa_01",
      conditionState: "used",
      structuredAttributes: {
        dimensions: "220x90cm",
        material: "fabric",
        price: 220
      },
      geoContext: { locality: "Amman" }
    }],
    facetSchema: ["condition", "dimensions", "material", "location", "price"]
  });

  assert.deepEqual(facets, ["condition", "dimensions", "material", "location", "price"]);
});

test("facet generation never emits a field outside schema or observed evidence", () => {
  const { generateFacets } = loadFacetBoundary();
  const facets = generateFacets({
    intent: {
      primaryFacets: ["sugar", "allergens", "secret_rank", "seller_commission"]
    },
    capsules: [cerealCapsule()],
    facetSchema: ["sugar", "allergens", "secret_rank"]
  });

  assert.deepEqual(facets, ["sugar", "allergens"]);
});

test("primary generated facets are bounded to eight", () => {
  const { generateFacets } = loadFacetBoundary();
  const fields = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const attributes = Object.fromEntries(fields.map((field) => [field, true]));

  const facets = generateFacets({
    intent: { primaryFacets: fields },
    capsules: [{
      capsuleId: "capsule_listing_generic_01",
      conditionState: "new",
      structuredAttributes: attributes,
      geoContext: null
    }],
    facetSchema: fields
  });

  assert.equal(facets.length, 8);
  assert.deepEqual(facets, fields.slice(0, 8));
});

test("fit explanation returns only evidence-backed organic reasons", () => {
  const { createFitExplanation } = loadFacetBoundary();
  const explanation = createFitExplanation({
    itemId: "listing_cereal_01",
    matchedEvidence: {
      productFamily: true,
      noAddedSugar: true,
      geography: true,
      personaKind: false
    }
  });

  assert.deepEqual(explanation, {
    itemId: "listing_cereal_01",
    reasons: [
      "matches_product_family",
      "matches_no_added_sugar",
      "matches_requested_geography"
    ]
  });
  assert.equal(Object.isFrozen(explanation), true);
  assert.equal(Object.isFrozen(explanation.reasons), true);
});

test("sponsored or paid state can never become an organic fit reason", () => {
  const { createFitExplanation } = loadFacetBoundary();

  for (const field of ["sponsored", "campaignId", "paidRank", "budget", "bid"]) {
    assert.throws(
      () => createFitExplanation({
        itemId: "listing_cereal_01",
        matchedEvidence: { productFamily: true, [field]: true }
      }),
      /FIT_EVIDENCE_DENIED/,
      field
    );
  }
});

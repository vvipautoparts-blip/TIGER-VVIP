"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
  __dirname,
  "../scripts/discovery/one-field-intent-scene.js"
);

function loadBoundary() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test("IntentFrame is immutable, bounded data and does not require a rigid category path", () => {
  const boundary = loadBoundary();
  const frame = boundary.createIntentFrame({
    intentId: "intent_cereal_01",
    intentType: "discover",
    productFamily: "breakfast_cereal",
    audience: "children",
    constraints: ["no_added_sugar"],
    categoryPath: [],
    primaryFacets: ["sugar", "allergens"]
  });

  assert.equal(frame.intentType, "discover");
  assert.deepEqual(frame.categoryPath, []);
  assert.deepEqual(frame.primaryFacets, ["sugar", "allergens"]);
  assert.equal(Object.isFrozen(frame), true);
  assert.equal(Object.isFrozen(frame.constraints), true);
  assert.equal(Object.isFrozen(frame.primaryFacets), true);
});

test("IntentFrame rejects unknown or executable-shaped fields", () => {
  const { createIntentFrame } = loadBoundary();

  assert.throws(() => createIntentFrame({
    intentId: "intent_cereal_01",
    intentType: "discover",
    productFamily: "breakfast_cereal",
    constraints: [],
    categoryPath: [],
    primaryFacets: [],
    script: "alert(1)"
  }), /INTENT_FRAME_UNKNOWN_FIELD/);
});

test("ExperienceManifest accepts only approved discovery scene components and props", () => {
  const { createExperienceManifest } = loadBoundary();
  const manifest = createExperienceManifest({
    sceneType: "intent_discovery",
    intentId: "intent_cereal_01",
    components: [
      { type: "IntentSummary", props: { intentId: "intent_cereal_01", summary: "حبوب إفطار للأطفال بدون سكر مضاف" } },
      { type: "DynamicFacetBar", props: { facets: ["sugar", "allergens"] } },
      { type: "ListingRail", props: { itemIds: ["listing_cereal_01"] } },
      { type: "EvidenceHint", props: { itemId: "listing_cereal_01", reasons: ["matches_no_added_sugar"] } },
      { type: "SponsoredRail", props: { itemIds: ["listing_cereal_02"], label: "sponsored" } },
      { type: "ContactHandoff", props: { itemId: "listing_cereal_01", channel: "message" } }
    ]
  });

  assert.equal(manifest.sceneType, "intent_discovery");
  assert.equal(manifest.components.length, 6);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.components), true);
});

test("ExperienceManifest rejects arbitrary executable component types", () => {
  const { createExperienceManifest } = loadBoundary();

  assert.throws(() => createExperienceManifest({
    sceneType: "intent_discovery",
    intentId: "intent_cereal_01",
    components: [
      { type: "RawJavaScript", props: { code: "fetch('/secrets')" } }
    ]
  }), /EXPERIENCE_COMPONENT_DENIED/);
});

test("ExperienceManifest rejects executable or unknown props even on approved components", () => {
  const { createExperienceManifest } = loadBoundary();

  for (const props of [
    { itemIds: ["listing_cereal_01"], onClick: "steal()" },
    { itemIds: ["listing_cereal_01"], dangerouslySetInnerHTML: "<script>x</script>" },
    { itemIds: ["listing_cereal_01"], componentCode: "return <X />" }
  ]) {
    assert.throws(() => createExperienceManifest({
      sceneType: "intent_discovery",
      intentId: "intent_cereal_01",
      components: [{ type: "ListingRail", props }]
    }), /EXPERIENCE_PROP_DENIED/);
  }
});

test("organic fit evidence is structurally isolated from paid delivery metadata", () => {
  const { createDiscoveryEvidence } = loadBoundary();
  const evidence = createDiscoveryEvidence({
    itemId: "listing_cereal_01",
    organicFit: {
      reasons: ["matches_product_family", "matches_no_added_sugar"]
    },
    paidDelivery: {
      sponsored: true,
      campaignId: "campaign_ads_01"
    }
  });

  assert.deepEqual(evidence.organicFit, {
    reasons: ["matches_product_family", "matches_no_added_sugar"]
  });
  assert.deepEqual(evidence.paidDelivery, {
    sponsored: true,
    campaignId: "campaign_ads_01"
  });
  assert.equal(Object.isFrozen(evidence.organicFit), true);
  assert.equal(Object.isFrozen(evidence.paidDelivery), true);
});

test("paid delivery fields cannot be authored inside organic fit evidence", () => {
  const { createDiscoveryEvidence } = loadBoundary();

  assert.throws(() => createDiscoveryEvidence({
    itemId: "listing_cereal_01",
    organicFit: {
      reasons: ["matches_product_family"],
      campaignId: "campaign_ads_01"
    },
    paidDelivery: { sponsored: true, campaignId: "campaign_ads_01" }
  }), /ORGANIC_PAID_METADATA_DENIED/);
});

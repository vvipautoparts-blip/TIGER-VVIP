"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../scripts/discovery/one-field-semantic-core.js");

function baseRegistry() {
  return core.createRegistry({
    brand: {
      id: "brand_001",
      aliases: { ar: "الاسم المؤقت", en: "Temporary Brand" }
    },
    views: [
      { id: "view_automotive", aliases: { ar: "السيارات", en: "Automotive" } },
      { id: "view_materials", aliases: { ar: "المواد", en: "Materials" } },
      { id: "view_real_estate", aliases: { ar: "العقارات", en: "Real Estate" } }
    ]
  });
}

test("brand rename changes presentation only and preserves stable identity", () => {
  const registry = baseRegistry();
  const renamed = core.renameBrandAlias(registry, "ar", "اسم جديد كليًا");

  assert.equal(renamed.brand.id, "brand_001");
  assert.equal(renamed.brand.aliases.ar, "اسم جديد كليًا");
  assert.equal(registry.brand.aliases.ar, "الاسم المؤقت");
  assert.deepEqual(renamed.views, registry.views);
});

test("view rename changes alias only and preserves semantic id", () => {
  const registry = baseRegistry();
  const renamed = core.renameViewAlias(registry, "view_materials", "ar", "اسم قطاع جديد");

  const before = registry.views.find((view) => view.id === "view_materials");
  const after = renamed.views.find((view) => view.id === "view_materials");
  assert.equal(before.aliases.ar, "المواد");
  assert.equal(after.id, before.id);
  assert.equal(after.aliases.ar, "اسم قطاع جديد");
});

test("adding a new view is additive and preserves all legacy views", () => {
  const registry = baseRegistry();
  const extended = core.addView(registry, {
    id: "view_household_discovery",
    aliases: { ar: "اسم مؤقت قابل للتغيير", en: "Temporary Discovery View" }
  });

  assert.deepEqual(
    registry.views.map((view) => view.id),
    ["view_automotive", "view_materials", "view_real_estate"]
  );
  assert.deepEqual(
    extended.views.map((view) => view.id),
    ["view_automotive", "view_materials", "view_real_estate", "view_household_discovery"]
  );
});

test("persona kinds are global actor types and are not owned by a sector/view", () => {
  for (const kind of [
    "individual", "company", "institution", "shop", "freelancer",
    "factory", "farm", "importer", "wholesaler", "supermarket"
  ]) {
    assert.equal(core.PERSONA_KINDS.includes(kind), true, kind);
  }

  assert.equal(Object.hasOwn(core.PERSONA_KIND_METADATA.factory, "viewId"), false);
  assert.equal(Object.hasOwn(core.PERSONA_KIND_METADATA.farm, "sector"), false);
});

test("condition applicability accepts used durable goods and rejects used packaged food", () => {
  assert.deepEqual(
    core.evaluateCondition({ capability: "durable_goods", condition: "used" }),
    { allowed: true, code: "CONDITION_ALLOWED" }
  );
  assert.deepEqual(
    core.evaluateCondition({ capability: "electronics", condition: "refurbished" }),
    { allowed: true, code: "CONDITION_ALLOWED" }
  );
  assert.deepEqual(
    core.evaluateCondition({ capability: "packaged_food", condition: "used" }),
    { allowed: false, code: "CONDITION_NOT_APPLICABLE" }
  );
});

test("approved Arabic cereal intent resolves without a rigid pre-created category path", () => {
  const frame = core.parseAcceptanceIntent("أريد كورن فليكس للأطفال بدون سكر.");

  assert.equal(frame.intentType, "discover");
  assert.equal(frame.productFamily, "breakfast_cereal");
  assert.equal(frame.audience, "children");
  assert.equal(frame.constraints.includes("no_added_sugar"), true);
  assert.deepEqual(frame.categoryPath, []);
  assert.deepEqual(frame.suggestedPersonaKinds, ["supermarket", "importer", "wholesaler", "shop"]);
  assert.equal(frame.primaryFacets.includes("sugar"), true);
  assert.equal(frame.primaryFacets.includes("allergens"), true);
});

test("AI or caller cannot directly mutate canonical ontology", () => {
  assert.deepEqual(
    core.validateOntologyOperation("PROPOSE_CONCEPT"),
    { allowed: true, code: "PROPOSAL_ALLOWED" }
  );
  assert.deepEqual(
    core.validateOntologyOperation("AI_DIRECT_CANONICAL_WRITE"),
    { allowed: false, code: "DIRECT_CANONICAL_WRITE_DENIED" }
  );
  assert.deepEqual(
    core.validateOntologyOperation("PROMOTE_CANONICAL"),
    { allowed: false, code: "GOVERNANCE_REQUIRED" }
  );
});

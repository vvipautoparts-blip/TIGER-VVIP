"use strict";

function freezeObject(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) freezeObject(value[key]);
  return Object.freeze(value);
}

function copyAliases(aliases) {
  return { ...(aliases || {}) };
}

function copyView(view) {
  return {
    id: view.id,
    aliases: copyAliases(view.aliases)
  };
}

const PERSONA_KINDS = Object.freeze([
  "individual",
  "company",
  "institution",
  "shop",
  "freelancer",
  "factory",
  "farm",
  "importer",
  "wholesaler",
  "supermarket"
]);

const PERSONA_KIND_METADATA = freezeObject(Object.fromEntries(
  PERSONA_KINDS.map((kind) => [kind, { id: kind }])
));

const CONDITION_POLICY = freezeObject({
  durable_goods: new Set(["new", "used", "refurbished", "open_box"]),
  electronics: new Set(["new", "used", "refurbished", "open_box"]),
  packaged_food: new Set(["new"])
});

function assertStableId(id, label) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError(`${label}_ID_REQUIRED`);
  }
}

function createRegistry(input) {
  if (!input || typeof input !== "object") throw new TypeError("REGISTRY_INPUT_REQUIRED");
  if (!input.brand || typeof input.brand !== "object") throw new TypeError("BRAND_REQUIRED");
  assertStableId(input.brand.id, "BRAND");

  const views = Array.isArray(input.views) ? input.views.map(copyView) : [];
  const seen = new Set();
  for (const view of views) {
    assertStableId(view.id, "VIEW");
    if (seen.has(view.id)) throw new Error("DUPLICATE_VIEW_ID");
    seen.add(view.id);
  }

  return freezeObject({
    brand: {
      id: input.brand.id,
      aliases: copyAliases(input.brand.aliases)
    },
    views
  });
}

function renameBrandAlias(registry, locale, alias) {
  if (!registry || !registry.brand) throw new TypeError("REGISTRY_REQUIRED");
  if (typeof locale !== "string" || locale.trim() === "") throw new TypeError("LOCALE_REQUIRED");
  if (typeof alias !== "string" || alias.trim() === "") throw new TypeError("ALIAS_REQUIRED");

  return freezeObject({
    brand: {
      id: registry.brand.id,
      aliases: { ...registry.brand.aliases, [locale]: alias }
    },
    views: registry.views
  });
}

function renameViewAlias(registry, viewId, locale, alias) {
  if (!registry || !Array.isArray(registry.views)) throw new TypeError("REGISTRY_REQUIRED");
  if (typeof locale !== "string" || locale.trim() === "") throw new TypeError("LOCALE_REQUIRED");
  if (typeof alias !== "string" || alias.trim() === "") throw new TypeError("ALIAS_REQUIRED");

  let found = false;
  const views = registry.views.map((view) => {
    if (view.id !== viewId) return view;
    found = true;
    return {
      id: view.id,
      aliases: { ...view.aliases, [locale]: alias }
    };
  });
  if (!found) throw new Error("VIEW_NOT_FOUND");

  return freezeObject({ brand: registry.brand, views });
}

function addView(registry, view) {
  if (!registry || !Array.isArray(registry.views)) throw new TypeError("REGISTRY_REQUIRED");
  if (!view || typeof view !== "object") throw new TypeError("VIEW_REQUIRED");
  assertStableId(view.id, "VIEW");
  if (registry.views.some((existing) => existing.id === view.id)) throw new Error("DUPLICATE_VIEW_ID");

  return freezeObject({
    brand: registry.brand,
    views: [...registry.views, copyView(view)]
  });
}

function evaluateCondition({ capability, condition } = {}) {
  const policy = CONDITION_POLICY[capability];
  if (!policy || !policy.has(condition)) {
    return { allowed: false, code: "CONDITION_NOT_APPLICABLE" };
  }
  return { allowed: true, code: "CONDITION_ALLOWED" };
}

function normalizeArabicIntent(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[.،!?؟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAcceptanceIntent(text) {
  const normalized = normalizeArabicIntent(text);
  const cereal = /(?:كورن\s*فليكس|حبوب\s*(?:ال)?إفطار|حبوب\s*(?:ال)?افطار)/u.test(normalized);
  const children = /(?:للأطفال|للاطفال|أطفال|اطفال)/u.test(normalized);
  const noSugar = /(?:بدون\s*سكر|خالي\s*من\s*السكر|من\s*دون\s*سكر)/u.test(normalized);

  if (!cereal) {
    return freezeObject({
      intentType: "discover",
      productFamily: "unknown",
      audience: null,
      constraints: [],
      categoryPath: [],
      suggestedPersonaKinds: [],
      primaryFacets: []
    });
  }

  return freezeObject({
    intentType: "discover",
    productFamily: "breakfast_cereal",
    audience: children ? "children" : null,
    constraints: noSugar ? ["no_added_sugar"] : [],
    categoryPath: [],
    suggestedPersonaKinds: ["supermarket", "importer", "wholesaler", "shop"],
    primaryFacets: ["sugar", "ingredients", "allergens", "age_suitability", "pack_size", "brand", "price", "location"]
  });
}

function validateOntologyOperation(operation) {
  if (operation === "PROPOSE_CONCEPT") {
    return { allowed: true, code: "PROPOSAL_ALLOWED" };
  }
  if (operation === "AI_DIRECT_CANONICAL_WRITE") {
    return { allowed: false, code: "DIRECT_CANONICAL_WRITE_DENIED" };
  }
  if (operation === "PROMOTE_CANONICAL") {
    return { allowed: false, code: "GOVERNANCE_REQUIRED" };
  }
  return { allowed: false, code: "ONTOLOGY_OPERATION_DENIED" };
}

module.exports = Object.freeze({
  PERSONA_KINDS,
  PERSONA_KIND_METADATA,
  createRegistry,
  renameBrandAlias,
  renameViewAlias,
  addView,
  evaluateCondition,
  parseAcceptanceIntent,
  validateOntologyOperation
});

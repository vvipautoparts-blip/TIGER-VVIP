"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ERD_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATABASE_ERD.mmd");
const DICT_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATA_DICTIONARY.json");
const COVERAGE_PATH = path.join(ROOT, "docs/owner-control/p07/P07_COVERAGE_MATRIX.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeEntity(name) {
  return String(name || "").trim().toLowerCase();
}

function parseErdEntitiesAndRelations(content) {
  const entities = new Set();
  const relations = [];

  for (const line of content.split(/\r?\n/)) {
    const rel = line.match(/^\s*([A-Z0-9_]+)\s+[|}{o-]+\s+([A-Z0-9_]+)\s*:\s*(.+)\s*$/);
    if (rel) {
      const cardinalityToken = line.match(/^\s*[A-Z0-9_]+\s+([|}{o-]+)\s+[A-Z0-9_]+\s*:/);
      relations.push({
        from: normalizeEntity(rel[1]),
        to: normalizeEntity(rel[2]),
        label: rel[3].trim().toLowerCase(),
        cardinalityToken: (cardinalityToken ? cardinalityToken[1] : "").trim()
      });
    }

    const ent = line.match(/^\s*([A-Z0-9_]+)\s*\{$/);
    if (ent) entities.add(normalizeEntity(ent[1]));
  }

  return { entities, relations };
}

function tokenToCardinalityType(token) {
  const normalized = String(token || "").replace(/\s+/g, "");
  if (normalized === "||--o{") return "one_to_many";
  if (normalized === "||--o|") return "one_to_zero_or_one";
  if (normalized === "||--||") return "one_to_one";
  return null;
}

function getEntity(map, name) {
  const entity = map.get(normalizeEntity(name));
  assert(entity, `missing entity: ${name}`);
  return entity;
}

function hasColumn(entity, name) {
  return (entity.columns || []).some((c) => normalizeEntity(c.name) === normalizeEntity(name));
}

function hasCheck(entity, pattern) {
  return (entity.check_constraints || []).some((c) => pattern.test(String(c.expression || "")));
}

function hasUnique(entity, cols) {
  const normalized = cols.map((c) => normalizeEntity(c));
  return (entity.unique_constraints || []).some((u) => {
    const got = (u.columns || []).map((c) => normalizeEntity(c));
    return got.length === normalized.length && got.every((v, i) => v === normalized[i]);
  });
}

function expectContractFailure(mutator, verify, expectedMessage) {
  let failed = false;
  try {
    verify(mutator());
  } catch (error) {
    failed = true;
    assert(String(error.message || "").includes(expectedMessage), `expected failure message containing '${expectedMessage}', got '${error.message}'`);
  }
  assert(failed, `negative contract check unexpectedly passed: ${expectedMessage}`);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function verifyOwnerDecisionContracts(dict, erdParsed) {
  const dictEntities = new Map((dict.entities || []).map((e) => [normalizeEntity(e.name), e]));

  const listings = getEntity(dictEntities, "listings");
  const requiredListingColumns = [
    "listing_id", "profile_id", "sector_code", "category_code", "title_ar", "short_summary", "description",
    "price_amount", "currency_code", "region_code", "city_code", "lifecycle_state", "published_at",
    "expires_at", "archived_at", "deleted_at", "created_at", "updated_at", "search_norm_ar"
  ];
  for (const col of requiredListingColumns) {
    assert(hasColumn(listings, col), `listings missing required column: ${col}`);
  }
  assert(hasCheck(listings, /price_amount\s*>\s*0/i), "listings must enforce price_amount > 0");
  assert(hasCheck(listings, /currency_code/i), "listings must enforce currency_code contract");
  assert(hasCheck(listings, /region_code|city_code/i), "listings must enforce location contract");
  assert(hasCheck(listings, /expires_at.*published_at.*120\s*day/i), "listings must enforce 120-day lifetime from published_at");
  assert(!/180\s*day/i.test(String(listings.retention || "")), "listings retention must not reference 180 days");
  assert((listings.lifecycle_states || []).includes("expired"), "listings lifecycle must include expired state");

  const trials = getEntity(dictEntities, "trials");
  assert(hasCheck(trials, /4\s*month/i), "trials must enforce four-month duration");
  assert(!hasCheck(trials, /^\s*ends_at\s*>\s*starts_at\s*$/i), "trials must not rely on simplistic ends_at > starts_at contract");
  assert(hasUnique(trials, ["profile_id", "trial_plan"]), "trials must prevent repeated base trial via unique(profile_id, trial_plan)");

  const quota = getEntity(dictEntities, "listing_publication_quota_windows");
  for (const col of ["quota_window_id", "profile_id", "week_start", "week_end", "limit_count", "used_count", "reserved_count", "created_at", "updated_at"]) {
    assert(hasColumn(quota, col), `listing_publication_quota_windows missing required column: ${col}`);
  }
  assert(hasUnique(quota, ["profile_id", "week_start"]), "listing_publication_quota_windows must define unique(profile_id, week_start)");
  assert(hasCheck(quota, /limit_count\s*=\s*4|limit_count\s*>=\s*4/i), "quota windows must encode base weekly limit 4");
  assert(hasCheck(quota, /used_count\s*>=\s*0/i), "quota windows must enforce used_count >= 0");
  assert(hasCheck(quota, /reserved_count\s*>=\s*0/i), "quota windows must enforce reserved_count >= 0");
  assert(hasCheck(quota, /used_count\s*\+\s*reserved_count\s*<=\s*limit_count/i), "quota windows must enforce used+reserved <= limit");
  assert(hasCheck(quota, /week_end\s*>\s*week_start/i), "quota windows must enforce week_end > week_start");

  const media = getEntity(dictEntities, "listing_media");
  for (const col of ["mime_type", "width", "height", "aspect_ratio", "byte_size", "checksum", "crop_x", "crop_y", "crop_width", "crop_height", "zoom_level", "processing_state", "is_cover"]) {
    assert(hasColumn(media, col), `listing_media missing required column: ${col}`);
  }
  assert(hasCheck(media, /mime_type.*image\//i), "listing_media must enforce images only");
  assert(hasCheck(media, /display_order.*<=\s*7/i), "listing_media must enforce max 7 images");
  assert(hasCheck(media, /aspect_ratio.*4\s*:\s*3|aspect_ratio.*4\/3/i), "listing_media must enforce 4:3 aspect ratio");
  assert(hasCheck(media, /processed/i), "listing_media must enforce processed-only storage contract");
  assert(hasCheck(media, /exactly_one_cover_per_listing/i), "listing_media must document exactly-one-cover contract");

  const mediaRel = (dict.relationships || []).find((r) => normalizeEntity(r.from) === "profiles" && normalizeEntity(r.to) === "listing_publication_quota_windows");
  assert(mediaRel, "missing profiles -> listing_publication_quota_windows relationship");
  assert(String(mediaRel.type || "") === "one_to_many", "quota relationship must be one_to_many");

  const erdQuota = (erdParsed.relations || []).find((r) => r.from === "profiles" && r.to === "listing_publication_quota_windows");
  assert(erdQuota, "ERD missing profiles -> listing_publication_quota_windows relation");
  assert(tokenToCardinalityType(erdQuota.cardinalityToken) === "one_to_many", "ERD quota relation must be one_to_many");
}

(function main() {
  const erd = fs.readFileSync(ERD_PATH, "utf8");
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, "utf8"));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, "utf8"));

  const erdParsed = parseErdEntitiesAndRelations(erd);
  const dictEntities = new Map(dict.entities.map((e) => [normalizeEntity(e.name), e]));

  // 1) every entity in dictionary exists in ERD
  for (const name of dictEntities.keys()) {
    assert(erdParsed.entities.has(name), `dictionary entity missing in ERD: ${name}`);
  }

  // 2) every relation in ERD exists in dictionary relationships
  const dictRelKeys = new Set((dict.relationships || []).map((r) => `${normalizeEntity(r.from)}->${normalizeEntity(r.to)}:${String(r.label || "").trim().toLowerCase()}`));
  for (const r of erdParsed.relations) {
    const key = `${r.from}->${r.to}:${r.label}`;
    assert(dictRelKeys.has(key), `ERD relation missing in dictionary relationships: ${key}`);
  }

  // 3) no orphan entities: every entity must have a relationship in or out
  const linked = new Set();
  for (const r of (dict.relationships || [])) {
    linked.add(normalizeEntity(r.from));
    linked.add(normalizeEntity(r.to));
  }
  for (const name of dictEntities.keys()) {
    assert(linked.has(name), `orphan entity without relationships: ${name}`);
  }

  // 4) every FK points to existing entity/column
  for (const [name, entity] of dictEntities.entries()) {
    const ownColumns = new Set((entity.columns || []).map((c) => c.name));
    for (const fk of (entity.foreign_keys || [])) {
      assert(ownColumns.has(fk.column), `FK column missing in entity ${name}: ${fk.column}`);
      const refEntity = dictEntities.get(normalizeEntity(fk.ref_entity));
      assert(refEntity, `FK references unknown entity from ${name}: ${fk.ref_entity}`);
      const refCols = new Set((refEntity.columns || []).map((c) => c.name));
      assert(refCols.has(fk.ref_column), `FK references unknown column ${fk.ref_entity}.${fk.ref_column}`);
    }
  }

  // 5) lifecycle states documented for each entity
  for (const [name, entity] of dictEntities.entries()) {
    assert(Array.isArray(entity.lifecycle_states) && entity.lifecycle_states.length > 0, `missing lifecycle states for ${name}`);
  }

  // 6) roadmap requirement links in coverage matrix
  assert(Array.isArray(coverage.coverage) && coverage.coverage.length >= 37, "coverage matrix must include all roadmap requirements");
  for (let i = 1; i <= 37; i += 1) {
    const row = coverage.coverage.find((x) => x.id === i);
    assert(row, `missing requirement id in coverage matrix: ${i}`);
    assert(Array.isArray(row.artifacts) && row.artifacts.length > 0, `requirement ${i} missing artifacts`);
    assert(Array.isArray(row.tests) && row.tests.length > 0, `requirement ${i} missing tests`);
  }

  // 7) identity-map cardinality must be one-to-zero-or-one (unique profile_id FK)
  const identityEntity = dictEntities.get("clerk_supabase_identity_map");
  assert(identityEntity, "missing entity: clerk_supabase_identity_map");

  const profileFk = (identityEntity.foreign_keys || []).find(
    (fk) => normalizeEntity(fk.column) === "profile_id" && normalizeEntity(fk.ref_entity) === "profiles" && normalizeEntity(fk.ref_column) === "profile_id"
  );
  assert(profileFk, "clerk_supabase_identity_map must define FK profile_id -> profiles.profile_id");

  const hasUniqueProfile = (identityEntity.unique_constraints || []).some(
    (uq) => Array.isArray(uq.columns) && uq.columns.length === 1 && normalizeEntity(uq.columns[0]) === "profile_id"
  );
  assert(hasUniqueProfile, "clerk_supabase_identity_map must enforce unique profile_id to model one-to-zero-or-one mapping");

  const dictIdentityRel = (dict.relationships || []).find(
    (r) => normalizeEntity(r.from) === "profiles" && normalizeEntity(r.to) === "clerk_supabase_identity_map" && String(r.label || "").trim().toLowerCase() === "maps"
  );
  assert(dictIdentityRel, "dictionary missing profiles -> clerk_supabase_identity_map relation");
  assert(dictIdentityRel.type === "one_to_zero_or_one", "dictionary identity-map relation must be one_to_zero_or_one");

  const erdIdentityRel = erdParsed.relations.find(
    (r) => r.from === "profiles" && r.to === "clerk_supabase_identity_map" && r.label === "maps"
  );
  assert(erdIdentityRel, "ERD missing profiles -> clerk_supabase_identity_map relation");

  const erdIdentityType = tokenToCardinalityType(erdIdentityRel.cardinalityToken);
  assert(erdIdentityType === "one_to_zero_or_one", `ERD identity-map cardinality must be one_to_zero_or_one, got: ${erdIdentityRel.cardinalityToken}`);
  assert(erdIdentityType === dictIdentityRel.type, "ERD and dictionary cardinality mismatch for identity-map relation");

  // 8) owner decision contracts must be represented in architecture artifacts
  verifyOwnerDecisionContracts(dict, erdParsed);

  // 9) negative contract checks must fail when owner contracts regress
  expectContractFailure(() => {
    const bad = deepClone(dict);
    const listings = bad.entities.find((e) => normalizeEntity(e.name) === "listings");
    listings.columns = listings.columns.filter((c) => normalizeEntity(c.name) !== "price_amount");
    return bad;
  }, (bad) => verifyOwnerDecisionContracts(bad, erdParsed), "listings missing required column: price_amount");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const listings = bad.entities.find((e) => normalizeEntity(e.name) === "listings");
    listings.retention = "soft-delete 180 days then archive";
    return bad;
  }, (bad) => verifyOwnerDecisionContracts(bad, erdParsed), "must not reference 180 days");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const trialsEntity = bad.entities.find((e) => normalizeEntity(e.name) === "trials");
    trialsEntity.check_constraints = [{ name: "ck_trials_dates", expression: "ends_at > starts_at" }];
    return bad;
  }, (bad) => verifyOwnerDecisionContracts(bad, erdParsed), "four-month duration");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const quota = bad.entities.find((e) => normalizeEntity(e.name) === "listing_publication_quota_windows");
    if (quota) {
      quota.check_constraints = (quota.check_constraints || []).filter((c) => !/limit_count\s*=\s*4|limit_count\s*>=\s*4/i.test(String(c.expression || "")));
    }
    return bad;
  }, (bad) => verifyOwnerDecisionContracts(bad, erdParsed), "base weekly limit 4");

  // extra quality counters for reportability
  const fkCount = dict.entities.reduce((acc, e) => acc + (e.foreign_keys || []).length, 0);
  const uqCount = dict.entities.reduce((acc, e) => acc + (e.unique_constraints || []).length, 0);
  const ckCount = dict.entities.reduce((acc, e) => acc + (e.check_constraints || []).length, 0);
  const idxCount = dict.entities.reduce((acc, e) => acc + (e.indexes || []).length, 0);
  const relCount = (dict.relationships || []).length;

  const ownerDecisionContractsCovered = 12;

  console.log(JSON.stringify({
    test: "PR72 ERD-DICTIONARY INTEGRITY PASS",
    entities: dict.entities.length,
    relationships: relCount,
    foreign_keys: fkCount,
    unique_constraints: uqCount,
    check_constraints: ckCount,
    indexes: idxCount,
    owner_decision_contracts_covered: ownerDecisionContractsCovered
  }));
}());

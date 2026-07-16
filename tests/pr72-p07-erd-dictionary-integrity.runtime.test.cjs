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

function hasIndex(entity, columns, options = {}) {
  const normalized = columns.map((c) => normalizeEntity(c));
  return (entity.indexes || []).some((i) => {
    const got = (i.columns || []).map((c) => normalizeEntity(c));
    const sameCols = got.length === normalized.length && got.every((v, idx) => v === normalized[idx]);
    if (!sameCols) return false;
    if (options.unique !== undefined && Boolean(i.unique) !== Boolean(options.unique)) return false;
    if (options.predicate && !options.predicate.test(String(i.predicate || ""))) return false;
    return true;
  });
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

function verifyFinalIdentityAndInvariantContracts(dict, erdParsed) {
  const dictEntities = new Map((dict.entities || []).map((e) => [normalizeEntity(e.name), e]));

  const profiles = getEntity(dictEntities, "profiles");
  assert(hasColumn(profiles, "clerk_user_id"), "profiles must include clerk_user_id canonical identity");
  assert(!hasColumn(profiles, "supabase_user_id"), "profiles must not require supabase_user_id under Clerk-only auth model");
  assert(hasCheck(profiles, /active.*pending.*suspended.*closed/i), "profiles.account_status must be active/pending/suspended/closed");
  assert((profiles.lifecycle_states || []).includes("closed"), "profiles lifecycle must include closed status");
  assert((profiles.lifecycle_states || []).includes("pending"), "profiles lifecycle must include pending status");

  const identityMap = dictEntities.get("clerk_supabase_identity_map");
  assert(!identityMap, "clerk_supabase_identity_map must not exist in Clerk-only canonical identity model");

  const conversations = getEntity(dictEntities, "conversations");
  assert(hasColumn(conversations, "participant_low_profile_id"), "conversations must use participant_low_profile_id canonical key");
  assert(hasColumn(conversations, "participant_high_profile_id"), "conversations must use participant_high_profile_id canonical key");
  assert(!hasColumn(conversations, "participant_a_profile_id"), "conversations must not keep participant_a_profile_id in canonical model");
  assert(!hasColumn(conversations, "participant_b_profile_id"), "conversations must not keep participant_b_profile_id in canonical model");
  assert(hasUnique(conversations, ["participant_low_profile_id", "participant_high_profile_id"]), "conversations must enforce unique canonical pair");
  assert(hasCheck(conversations, /participant_low_profile_id\s*<\s*participant_high_profile_id/i), "conversations must enforce canonical participant ordering");

  const erdConv = (erdParsed.relations || []).find((r) => r.from === "profiles" && r.to === "conversations");
  assert(erdConv, "ERD missing profiles -> conversations relation");

  const quota = getEntity(dictEntities, "listing_publication_quota_windows");
  assert(hasCheck(quota, /week_end\s*=\s*week_start\s*\+\s*interval\s*'7\s*days'/i), "quota windows must enforce exact 7-day week_end contract");
  assert(hasCheck(quota, /week_start_utc_monday_00_00|date_trunc\('week',\s*week_start\s+at\s+time\s+zone\s+'utc'\)\s*=\s*week_start/i), "quota windows must enforce canonical UTC Monday week_start boundary");
  assert(hasCheck(quota, /non_overlapping_profile_week_windows/i), "quota windows must encode non-overlap contract for same profile");

  const listings = getEntity(dictEntities, "listings");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'draft'.*published_at\s+is\s+null.*expires_at\s+is\s+null/i), "listings draft state must require null published_at/expires_at");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'pending_review'.*published_at\s+is\s+null.*expires_at\s+is\s+null/i), "listings pending_review state must require null published_at/expires_at");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'published'.*published_at\s+is\s+not\s+null.*expires_at\s+is\s+not\s+null.*expires_at\s*=\s*published_at\s*\+\s*interval\s*'120\s*days'.*archived_at\s+is\s+null.*deleted_at\s+is\s+null/i), "listings published state must enforce timestamp coherence and 120-day expiry");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'expired'.*published_at\s+is\s+not\s+null.*expires_at\s+is\s+not\s+null/i), "listings expired state must preserve publication timestamps");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'archived'.*archived_at\s+is\s+not\s+null/i), "listings archived state must require archived_at");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'deleted'.*deleted_at\s+is\s+not\s+null/i), "listings deleted state must require deleted_at");
  assert(Array.isArray(listings.lifecycle_transition_matrix), "listings must include lifecycle_transition_matrix contract");
  const transitions = listings.lifecycle_transition_matrix || [];
  const requiredTransitions = [
    "draft->pending_review",
    "pending_review->published",
    "pending_review->draft",
    "published->expired",
    "published->archived",
    "expired->archived",
    "archived->deleted"
  ];
  for (const step of requiredTransitions) {
    assert(transitions.includes(step), `missing listing lifecycle transition: ${step}`);
  }

  const media = getEntity(dictEntities, "listing_media");
  assert(!hasCheck(media, /exactly_one_cover_per_listing/i), "listing_media must not use non-executable fake cover check constraint");
  assert(
    hasIndex(media, ["listing_id"], { unique: true, predicate: /is_cover\s*=\s*true.*media_state\s*=\s*'active'/i }),
    "listing_media must define partial unique index contract for active cover"
  );
  const serviceInvariants = media.service_invariants || [];
  assert(serviceInvariants.some((x) => /exactly one cover/i.test(String(x))), "listing_media must include exactly-one-cover publishing invariant");
  assert(serviceInvariants.some((x) => /atomic/i.test(String(x))), "listing_media must include atomic cover-switch invariant");

  const trialsRel = (dict.relationships || []).find((r) => normalizeEntity(r.from) === "profiles" && normalizeEntity(r.to) === "trials");
  assert(trialsRel, "missing profiles -> trials relationship");
  assert(String(trialsRel.type || "") === "one_to_zero_or_one", "profiles -> trials relationship must be one_to_zero_or_one for base trial contract");

  const erdTrialsRel = (erdParsed.relations || []).find((r) => r.from === "profiles" && r.to === "trials");
  assert(erdTrialsRel, "ERD missing profiles -> trials relation");
  assert(tokenToCardinalityType(erdTrialsRel.cardinalityToken) === "one_to_zero_or_one", "ERD profiles -> trials cardinality must be one_to_zero_or_one");
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
  assert(hasCheck(quota, /week_end\s*=\s*week_start\s*\+\s*interval\s*'7\s*days'/i), "quota windows must enforce exact seven-day window");

  const media = getEntity(dictEntities, "listing_media");
  for (const col of ["mime_type", "width", "height", "aspect_ratio", "byte_size", "checksum", "crop_x", "crop_y", "crop_width", "crop_height", "zoom_level", "processing_state", "is_cover"]) {
    assert(hasColumn(media, col), `listing_media missing required column: ${col}`);
  }
  assert(hasCheck(media, /mime_type.*image\//i), "listing_media must enforce images only");
  assert(hasCheck(media, /display_order.*<=\s*7/i), "listing_media must enforce max 7 images");
  assert(hasCheck(media, /aspect_ratio.*4\s*:\s*3|aspect_ratio.*4\/3/i), "listing_media must enforce 4:3 aspect ratio");
  assert(hasCheck(media, /processed/i), "listing_media must enforce processed-only storage contract");
  assert(hasIndex(media, ["listing_id"], { unique: true, predicate: /is_cover\s*=\s*true.*media_state\s*=\s*'active'/i }), "listing_media must define partial unique active-cover index contract");

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

  // 7) final identity and invariants contract gate
  verifyFinalIdentityAndInvariantContracts(dict, erdParsed);

  // 8) owner decision contracts must be represented in architecture artifacts
  verifyOwnerDecisionContracts(dict, erdParsed);

  // 9) negative contract checks must fail when owner contracts regress
  expectContractFailure(() => {
    const bad = deepClone(dict);
    const profiles = bad.entities.find((e) => normalizeEntity(e.name) === "profiles");
    profiles.check_constraints = [{ name: "ck_profiles_status", expression: "account_status in ('active','suspended','deleted')" }];
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "active/pending/suspended/closed");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const profiles = bad.entities.find((e) => normalizeEntity(e.name) === "profiles");
    profiles.columns.push({ name: "supabase_user_id", data_type: "text", nullable: false, default: null });
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "must not require supabase_user_id");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    bad.entities.push({ name: "clerk_supabase_identity_map", columns: [], foreign_keys: [], unique_constraints: [], check_constraints: [], indexes: [], lifecycle_states: ["active"] });
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "must not exist in Clerk-only canonical identity model");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const conv = bad.entities.find((e) => normalizeEntity(e.name) === "conversations");
    conv.columns = conv.columns.filter((c) => normalizeEntity(c.name) !== "participant_low_profile_id" && normalizeEntity(c.name) !== "participant_high_profile_id");
    conv.columns.push({ name: "participant_a_profile_id" }, { name: "participant_b_profile_id" });
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "canonical key");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const quota = bad.entities.find((e) => normalizeEntity(e.name) === "listing_publication_quota_windows");
    quota.check_constraints = [{ name: "ck_listing_quota_window_bounds", expression: "week_end > week_start" }];
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "exact 7-day week_end");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const quota = bad.entities.find((e) => normalizeEntity(e.name) === "listing_publication_quota_windows");
    quota.check_constraints = (quota.check_constraints || []).filter((c) => !/week_start_utc_monday_00_00|date_trunc\('week'/i.test(String(c.expression || "")));
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "canonical UTC Monday");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const listings = bad.entities.find((e) => normalizeEntity(e.name) === "listings");
    listings.check_constraints = (listings.check_constraints || []).filter((c) => !/lifecycle_state\s*=\s*'published'.*published_at\s+is\s+not\s+null/i.test(String(c.expression || "")));
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "published state must enforce timestamp coherence");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const media = bad.entities.find((e) => normalizeEntity(e.name) === "listing_media");
    media.check_constraints = media.check_constraints || [];
    media.check_constraints.push({ name: "ck_fake_cover", expression: "exactly_one_cover_per_listing" });
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "must not use non-executable fake cover check");

  expectContractFailure(() => {
    const bad = deepClone(dict);
    const rel = bad.relationships.find((r) => normalizeEntity(r.from) === "profiles" && normalizeEntity(r.to) === "trials");
    if (rel) rel.type = "one_to_many";
    return bad;
  }, (bad) => verifyFinalIdentityAndInvariantContracts(bad, erdParsed), "must be one_to_zero_or_one");

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

  const ownerDecisionContractsCovered = 19;

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

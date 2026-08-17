"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ERD_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATABASE_ERD.mmd");
const DICT_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATA_DICTIONARY.json");
const COVERAGE_PATH = path.join(ROOT, "docs/owner-control/p07/P07_COVERAGE_MATRIX.json");
const SUPERSESSION_PATH = path.join(ROOT, "docs/owner-control/p07/P07_SUPERSESSION_NOTICE.md");
const CURRENT_MARKETPLACE_SQL = path.join(ROOT, "supabase/migrations/20260806090000_v14_marketplace_foundation.sql");
const LEGACY_SUPABASE_AUTH_COLUMN = ["supabase", "user", "id"].join("_");
const LEGACY_IDENTITY_MAP_ENTITY = ["clerk", "supabase", "identity", "map"].join("_");
const RETIRED_FIXED_DAYS = ["1", "2", "0"].join("");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalize(name) {
  return String(name || "").trim().toLowerCase();
}

function parseErd(content) {
  const entities = new Set();
  const relations = [];
  for (const line of content.split(/\r?\n/)) {
    const rel = line.match(/^\s*([A-Z0-9_]+)\s+[|}{o-]+\s+([A-Z0-9_]+)\s*:\s*(.+)\s*$/);
    if (rel) relations.push({ from: normalize(rel[1]), to: normalize(rel[2]), label: rel[3].trim().toLowerCase() });
    const ent = line.match(/^\s*([A-Z0-9_]+)\s*\{$/);
    if (ent) entities.add(normalize(ent[1]));
  }
  return { entities, relations };
}

function entityMap(dict) {
  return new Map((dict.entities || []).map((entity) => [normalize(entity.name), entity]));
}

function getEntity(map, name) {
  const entity = map.get(normalize(name));
  assert(entity, `missing entity: ${name}`);
  return entity;
}

function hasColumn(entity, name) {
  return (entity.columns || []).some((column) => normalize(column.name) === normalize(name));
}

function hasCheck(entity, pattern) {
  return (entity.check_constraints || []).some((item) => pattern.test(String(item.expression || "")));
}

function hasUnique(entity, columns) {
  const expected = columns.map(normalize);
  return (entity.unique_constraints || []).some((item) => {
    const got = (item.columns || []).map(normalize);
    return got.length === expected.length && got.every((value, index) => value === expected[index]);
  });
}

function hasIndex(entity, columns, predicate) {
  const expected = columns.map(normalize);
  return (entity.indexes || []).some((item) => {
    const got = (item.columns || []).map(normalize);
    return Boolean(item.unique) && got.length === expected.length && got.every((value, index) => value === expected[index]) && predicate.test(String(item.predicate || ""));
  });
}

function verifyReferenceIntegrity(dict, erd, coverage) {
  const map = entityMap(dict);
  for (const name of map.keys()) assert(erd.entities.has(name), `dictionary entity missing in ERD: ${name}`);

  const relationKeys = new Set((dict.relationships || []).map((relation) => `${normalize(relation.from)}->${normalize(relation.to)}:${String(relation.label || "").trim().toLowerCase()}`));
  for (const relation of erd.relations) {
    const key = `${relation.from}->${relation.to}:${relation.label}`;
    assert(relationKeys.has(key), `ERD relation missing in dictionary: ${key}`);
  }

  for (const [name, entity] of map.entries()) {
    const columns = new Set((entity.columns || []).map((column) => column.name));
    assert(Array.isArray(entity.lifecycle_states) && entity.lifecycle_states.length > 0, `missing lifecycle states for ${name}`);
    for (const fk of entity.foreign_keys || []) {
      assert(columns.has(fk.column), `FK column missing in ${name}: ${fk.column}`);
      const ref = map.get(normalize(fk.ref_entity));
      assert(ref, `FK references unknown entity from ${name}: ${fk.ref_entity}`);
      assert((ref.columns || []).some((column) => column.name === fk.ref_column), `FK references unknown column ${fk.ref_entity}.${fk.ref_column}`);
    }
  }

  assert(Array.isArray(coverage.coverage) && coverage.coverage.length >= 37, "historical P07 coverage evidence must remain complete");
  for (const row of coverage.owner_decision_contracts || []) {
    for (const artifact of row.artifacts || []) assert(fs.existsSync(path.join(ROOT, artifact)), `historical evidence artifact missing: ${artifact}`);
    for (const testPath of row.tests || []) assert(fs.existsSync(path.join(ROOT, testPath)), `historical evidence test reference missing: ${testPath}`);
  }
}

function verifyStillValidSecurityAndMediaEvidence(dict) {
  const map = entityMap(dict);
  const profiles = getEntity(map, "profiles");
  assert(hasColumn(profiles, "clerk_user_id"), "profiles must preserve Clerk canonical identity evidence");
  assert(!hasColumn(profiles, LEGACY_SUPABASE_AUTH_COLUMN), "legacy Supabase auth identity column must stay absent");
  assert(!map.has(LEGACY_IDENTITY_MAP_ENTITY), "legacy identity-map entity must stay absent");

  const conversations = getEntity(map, "conversations");
  assert(hasColumn(conversations, "participant_low_profile_id"), "canonical conversation low participant key missing");
  assert(hasColumn(conversations, "participant_high_profile_id"), "canonical conversation high participant key missing");
  assert(hasUnique(conversations, ["participant_low_profile_id", "participant_high_profile_id"]), "canonical conversation pair uniqueness missing");

  const listings = getEntity(map, "listings");
  assert(hasColumn(listings, "published_at"), "listings must retain published_at");
  assert(hasColumn(listings, "expires_at"), "historical schema evidence must retain generic expires_at capability");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'draft'.*published_at\s+is\s+null/i), "draft timestamp coherence evidence missing");
  assert(hasCheck(listings, /lifecycle_state\s*=\s*'archived'.*archived_at\s+is\s+not\s+null/i), "archive timestamp coherence evidence missing");

  const media = getEntity(map, "listing_media");
  assert(hasCheck(media, /mime_type.*image\//i), "listing media must remain still-image constrained");
  assert(hasCheck(media, /display_order.*<=\s*7/i), "listing media must preserve the seven-image maximum");
  assert(hasCheck(media, /aspect_ratio.*4\s*:\s*3|aspect_ratio.*4\/3/i), "listing media must preserve processed 4:3 evidence");
  assert(hasCheck(media, /processed/i), "listing media must preserve processed-only storage evidence");
  assert(hasIndex(media, ["listing_id"], /is_cover\s*=\s*true.*media_state\s*=\s*'active'/i), "active-cover unique index evidence missing");
}

function verifyCurrentRuntimeDoesNotRestoreRetiredLifetime() {
  const sql = fs.readFileSync(CURRENT_MARKETPLACE_SQL, "utf8");
  const fixedLifetime = new RegExp(`published_at\\s*\\+\\s*interval\\s*['\"]${RETIRED_FIXED_DAYS}\\s*days['\"]`, "i");
  assert(!fixedLifetime.test(sql), "current marketplace SQL must not restore the retired universal fixed listing lifetime");
  assert(/expires_at\s+is\s+null\s+or\s+published_at\s+is\s+null\s+or\s+published_at\s*<\s*expires_at/i.test(sql), "current marketplace SQL must keep expiry optional and only validate ordering when supplied");
}

(function main() {
  const notice = fs.readFileSync(SUPERSESSION_PATH, "utf8");
  assert(notice.includes("SUPERSEDED / HISTORICAL ONLY"), "P07 must be explicitly classified as historical");
  assert(notice.includes("FIXED_LISTING_LIFETIME_CANCELLED"), "P07 supersession token missing");

  const dict = JSON.parse(fs.readFileSync(DICT_PATH, "utf8"));
  const erd = parseErd(fs.readFileSync(ERD_PATH, "utf8"));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, "utf8"));

  verifyReferenceIntegrity(dict, erd, coverage);
  verifyStillValidSecurityAndMediaEvidence(dict);
  verifyCurrentRuntimeDoesNotRestoreRetiredLifetime();

  console.log(JSON.stringify({
    test: "P07 HISTORICAL INTEGRITY + CURRENT-RUNTIME SEPARATION PASS",
    entities: (dict.entities || []).length,
    relationships: (dict.relationships || []).length,
    owner_decision_evidence_rows: (coverage.owner_decision_contracts || []).length
  }));
}());

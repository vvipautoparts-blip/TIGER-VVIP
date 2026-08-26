"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LEGACY_IDENTITY_MAP_TOKEN = ["clerk", "supabase", "identity", "map"].join("_");
const LEGACY_SUPABASE_AUTH_TOKEN = ["supabase", "user", "id"].join("_");

const REQUIRED_FILES = [
  "docs/owner-control/p07/P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md",
  "docs/owner-control/p07/P07_DATABASE_ERD.mmd",
  "docs/owner-control/p07/P07_DATA_DICTIONARY.json",
  "docs/owner-control/p07/P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_MIGRATION_ORDERING_PLAN_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_ROLLBACK_PLAN_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md",
  "docs/owner-control/p07/P07_SUPERSESSION_NOTICE.md",
  "docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-15.md",
  "docs/change-control/20260716-pr72-p07-complete-database-architecture.json"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectFailure(fn, contains) {
  let failed = false;
  try {
    fn();
  } catch (error) {
    failed = true;
    assert(String(error.message || "").includes(contains), `expected message containing '${contains}', got '${error.message}'`);
  }
  assert(failed, `negative check unexpectedly passed: ${contains}`);
}

function validateEvidenceDependencies(manifest) {
  const deps = manifest.supporting_dependencies || manifest.supporting_dependency;
  const list = Array.isArray(deps) ? deps : (deps ? [deps] : []);
  assert(list.length >= 2, "supporting dependencies must include PR73 and PR74");
  const pr73 = list.find((d) => Number(d.pr) === 73);
  const pr74 = list.find((d) => Number(d.pr) === 74);
  assert(pr73, "missing PR73 supporting dependency");
  assert(pr74, "missing PR74 supporting dependency");
  assert(String(pr73.status || "") === "merged_and_post_merge_verified", "PR73 status must be merged_and_post_merge_verified");
  assert(String(pr74.status || "") === "merged_and_post_merge_verified", "PR74 status must be merged_and_post_merge_verified");
  assert(String(pr73.purpose || "").trim().length > 10, "PR73 purpose must be explicit");
  assert(String(pr74.purpose || "").trim().length > 10, "PR74 purpose must be explicit");
}

function validateHistoricalCoverage(coverage) {
  assert(Array.isArray(coverage.owner_decision_contracts), "coverage must include owner_decision_contracts array");
  const contracts = coverage.owner_decision_contracts;
  const requiredStillUsefulEvidence = [
    "mandatory price > 0",
    "mandatory location",
    "photos only",
    "maximum 7 photos",
    "fixed 4:3 processed derivative",
    "original discarded",
    "one-to-one communication",
    "audit append-only",
    "public media read only for published listings",
    "clerk is canonical auth identity",
    "account statuses match active/pending/suspended/closed",
    "canonical unordered conversation pair",
    "canonical utc weekly quota window",
    "listing lifecycle timestamp coherence",
    "enforceable single-cover design",
    "one base trial per profile"
  ];
  for (const name of requiredStillUsefulEvidence) {
    const row = contracts.find((x) => String(x.contract || "").toLowerCase() === name.toLowerCase());
    assert(row, `missing historical architecture evidence contract: ${name}`);
    assert(Array.isArray(row.artifacts) && row.artifacts.length > 0, `historical contract '${name}' missing artifacts`);
    assert(String(row.section || "").trim().length > 0, `historical contract '${name}' missing exact section`);
    assert(Array.isArray(row.tests) && row.tests.length > 0, `historical contract '${name}' missing executable evidence references`);
  }
}

(function main() {
  for (const rel of REQUIRED_FILES) assert(fs.existsSync(path.join(ROOT, rel)), `missing required file: ${rel}`);

  const supersession = read("docs/owner-control/p07/P07_SUPERSESSION_NOTICE.md");
  assert(supersession.includes("SUPERSEDED / HISTORICAL ONLY"), "P07 must be explicitly historical");
  assert(supersession.includes("FIXED_LISTING_LIFETIME_CANCELLED"), "P07 must record the cancelled fixed-lifetime contract");
  assert(supersession.includes("OWNER_BINDING_DECISIONS_2026-08-15.md"), "P07 supersession must point to the latest owner authority");

  const architecture = read("docs/owner-control/p07/P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md");
  const requiredChecklist = [
    "1. ERD كامل",
    "2. Machine-readable data dictionary",
    "32. RLS design matrix — Review Only",
    "33. Storage policy matrix — Review Only",
    "36. Evidence Manifest",
    "37. Coverage tests"
  ];
  for (const item of requiredChecklist) assert(architecture.includes(item), `missing architecture coverage item: ${item}`);

  const dataDictionary = JSON.parse(read("docs/owner-control/p07/P07_DATA_DICTIONARY.json"));
  assert(Array.isArray(dataDictionary.entities), "data dictionary must define entities array");
  assert(dataDictionary.entities.length >= 17, "historical data dictionary must preserve its full entity evidence set");
  assert(dataDictionary.entities.some((e) => String(e.name || "") === "listings"), "historical listings entity must remain auditable");

  const manifest = read("docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md");
  assert(manifest.includes("NO PRODUCTION CHANGE"), "manifest must include no-production-change pledge");

  assert(architecture.toLowerCase().includes("clerk jwt sub") && architecture.toLowerCase().includes("profiles.clerk_user_id"), "architecture review must document clerk jwt subject resolution against profiles.clerk_user_id");
  assert(!architecture.toLowerCase().includes(LEGACY_IDENTITY_MAP_TOKEN), "architecture review must not depend on legacy identity-map table");
  assert(!architecture.toLowerCase().includes(LEGACY_SUPABASE_AUTH_TOKEN), "architecture review must not require legacy Supabase auth identity in profiles");
  assert(architecture.toLowerCase().includes("canonical") && architecture.toLowerCase().includes("conversation"), "architecture review must document canonical conversation pair model");
  assert(architecture.toLowerCase().includes("monday 00:00 utc"), "architecture review must document canonical utc weekly window");
  assert(architecture.toLowerCase().includes("partial unique index") && architecture.toLowerCase().includes("is_cover"), "architecture review must document cover partial unique index contract");
  assert(architecture.toLowerCase().includes("atomic") && architecture.toLowerCase().includes("cover"), "architecture review must document atomic cover-switch invariant");

  const manifestJson = JSON.parse(read("docs/owner-control/p07/P07_EVIDENCE_MANIFEST.json"));
  validateEvidenceDependencies(manifestJson);

  const storagePolicy = read("docs/owner-control/p07/P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md").toLowerCase();
  assert(!storagePolicy.includes("listing image original"), "storage policy must not include durable listing image original contract");
  assert(!storagePolicy.includes("canonical source object"), "storage policy must not include canonical source object contract");
  assert(storagePolicy.includes("temporary upload"), "storage policy must include temporary upload stage");
  assert(storagePolicy.includes("processed 4:3 derivative"), "storage policy must include processed 4:3 derivative stage");
  assert(storagePolicy.includes("discard temporary original"), "storage policy must include temporary-original discard stage");

  const rls = read("docs/owner-control/p07/P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md").toLowerCase();
  assert(rls.includes("audit_logs"), "RLS matrix must include audit_logs policy");
  assert(rls.includes("append-only") || rls.includes("immutable"), "audit_logs must be append-only/immutable");
  assert(rls.includes("no update") || rls.includes("update: denied"), "audit_logs must deny update");
  assert(rls.includes("no delete") || rls.includes("delete: denied"), "audit_logs must deny delete");
  assert(rls.includes("public read only when parent listing is published"), "listing_media must be public-readable only when parent listing is published");
  assert(rls.includes("clerk jwt sub") && rls.includes("profiles.clerk_user_id"), "RLS matrix must document Clerk JWT subject mapping to profiles.clerk_user_id");
  assert(!rls.includes(LEGACY_IDENTITY_MAP_TOKEN), "RLS matrix must not include legacy identity-map table in final identity model");

  const coverage = JSON.parse(read("docs/owner-control/p07/P07_COVERAGE_MATRIX.json"));
  validateHistoricalCoverage(coverage);

  expectFailure(() => validateEvidenceDependencies({ supporting_dependencies: [{ pr: 73, status: "merged_and_post_merge_verified", purpose: "only one dependency" }] }), "PR74");
  expectFailure(() => validateHistoricalCoverage({ owner_decision_contracts: [] }), "mandatory price > 0");
  expectFailure(() => {
    const bad = `${LEGACY_IDENTITY_MAP_TOKEN} required`;
    assert(!bad.includes(LEGACY_IDENTITY_MAP_TOKEN), "architecture review must not depend on legacy identity-map table");
  }, "must not depend on legacy identity-map table");
  expectFailure(() => {
    const badStorage = "listing image original\ncanonical source object";
    assert(!badStorage.includes("listing image original"), "storage policy must not include durable listing image original contract");
  }, "listing image original");
  expectFailure(() => {
    const badRls = "audit_logs read/write";
    assert(!badRls.includes("read/write"), "audit_logs must not be broad read/write");
  }, "audit_logs must not be broad read/write");

  console.log("P07 HISTORICAL DATABASE ARCHITECTURE EVIDENCE TEST PASS");
}());

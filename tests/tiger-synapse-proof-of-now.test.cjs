"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CONTROLLER = path.join(ROOT, "scripts/synapse/proof-of-now-controller.js");
const EDGE_FUNCTION = path.join(ROOT, "supabase/functions/tiger-proof-of-now/index.ts");
const MIGRATION_RELATIVE = "supabase/migrations/20260826120000_synapse_proof_of_now.sql";
const MIGRATION = path.join(ROOT, MIGRATION_RELATIVE);
const STEEL_SHIELD = path.join(ROOT, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const BEHAVIOR_SQL_RELATIVE = "tests/sql/tiger-synapse-proof-of-now.sql";
const BEHAVIOR_SQL = path.join(ROOT, BEHAVIOR_SQL_RELATIVE);
const CONCURRENCY_SETUP_RELATIVE = "tests/sql/tiger-synapse-proof-of-now-concurrency-setup.sql";
const CONCURRENCY_SETUP = path.join(ROOT, CONCURRENCY_SETUP_RELATIVE);
const CONCURRENCY_CONSUME_RELATIVE = "tests/sql/tiger-synapse-proof-of-now-concurrency-consume.sql";
const CONCURRENCY_CONSUME = path.join(ROOT, CONCURRENCY_CONSUME_RELATIVE);
const CONCURRENCY_VERIFY_RELATIVE = "tests/sql/tiger-synapse-proof-of-now-concurrency-verify.sql";
const CONCURRENCY_VERIFY = path.join(ROOT, CONCURRENCY_VERIFY_RELATIVE);
const DB_REHEARSAL = path.join(ROOT, ".github/workflows/tiger-social-db-rehearsal.yml");

function readRequired(file, code) {
  assert.equal(fs.existsSync(file), true, code);
  return fs.readFileSync(file, "utf8");
}

test("S4 client contract is actor-blind, metadata-minimal, bounded, and truthful", () => {
  readRequired(CONTROLLER, "PROOF_CONTROLLER_MISSING");
  const {
    PROOF_STATES,
    buildIssueRequest,
    buildConsumeRequest,
    proofStateCopy,
  } = require(CONTROLLER);

  const issue = buildIssueRequest({
    objectType: "listing",
    objectId: "11111111-1111-4111-8111-111111111111",
    purpose: "listing_freshness",
    policyVersion: "SYNAPSE-S4",
    actorSubject: "attacker",
    preciseLocation: { lat: 31.9, long: 35.9 },
    clientTimestamp: "2026-08-26T12:00:00Z",
  });
  assert.deepEqual(Object.keys(issue).sort(), ["action", "object_id", "object_type", "policy_version", "purpose"]);
  assert.equal(Object.hasOwn(issue, "actorSubject"), false);
  assert.equal(Object.hasOwn(issue, "actor_subject"), false);
  assert.equal(Object.hasOwn(issue, "preciseLocation"), false);
  assert.equal(Object.hasOwn(issue, "clientTimestamp"), false);

  const consume = buildConsumeRequest({
    challengeId: "22222222-2222-4222-8222-222222222222",
    nonce: "a".repeat(64),
    captureDigest: "b".repeat(64),
    filename: "secret-home-address.jpg",
    mime: "image/jpeg",
    coordinates: [31.9, 35.9],
    ownershipClaim: "I own it",
    clientTimestamp: "2026-08-26T12:00:00Z",
  });
  assert.deepEqual(Object.keys(consume).sort(), ["action", "capture_digest", "challenge_id", "nonce"]);

  assert.deepEqual(
    Object.values(PROOF_STATES).sort(),
    ["expired", "failed", "fresh", "not_verified"].sort(),
  );
  for (const state of Object.values(PROOF_STATES)) {
    const copy = proofStateCopy(state, "en");
    assert.equal(typeof copy, "string");
    assert.ok(copy.length > 0 && copy.length <= 180);
    assert.doesNotMatch(copy, /owner verified|ownership verified|condition guaranteed|authenticity guaranteed|fraud impossible|fraud[- ]proof/i);
  }
});

test("S4 Edge Function binds identity server-side and never trusts caller actor or sensitive capture metadata", () => {
  const source = readRequired(EDGE_FUNCTION, "PROOF_EDGE_FUNCTION_MISSING");

  assert.match(source, /Authorization/i);
  assert.match(source, /verifyIdentity|auth\.getUser|IDENTITY_VERIFIER/i);
  assert.match(source, /crypto\.getRandomValues|crypto\.randomUUID/);
  assert.match(source, /SHA-256/);
  assert.match(source, /Cache-Control[^\n]*no-store/i);
  assert.doesNotMatch(source, /body\.(?:actor|actorSubject|actor_subject)/);
  assert.doesNotMatch(source, /body\.(?:coordinates|preciseLocation|clientTimestamp|filename|ownershipClaim)/);
});

test("S4 database contract is service-only, digest-bound, expiring, and atomically single-use", () => {
  const sql = readRequired(MIGRATION, "PROOF_MIGRATION_MISSING");

  assert.match(sql, /vvip_synapse_proof_challenges/i);
  assert.match(sql, /vvip_synapse_proof_evidence/i);
  assert.match(sql, /nonce_digest/i);
  assert.match(sql, /capture_digest/i);
  assert.match(sql, /expires_at/i);
  assert.match(sql, /consumed_at/i);
  assert.match(sql, /revoke\s+all[\s\S]+authenticated/i);
  assert.match(sql, /grant\s+execute[\s\S]+service_role/i);
  assert.match(sql, /consumed_at\s+is\s+null/i);
  assert.match(sql, /expires_at\s*>\s*statement_timestamp\(\)/i);
  assert.match(sql, /update[\s\S]+returning/i);
  assert.equal(
    (sql.match(/security\s+definer\s+set\s+search_path\s*=\s*''/gi) || []).length,
    2,
    "PROOF_DEFINER_SEARCH_PATH_MUST_BE_EMPTY",
  );
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]+authenticated/i);
});

test("S4 migration review is byte-exact and automatically invalidated by SQL drift", () => {
  const sql = readRequired(MIGRATION, "PROOF_MIGRATION_MISSING");
  const shield = readRequired(STEEL_SHIELD, "STEEL_SHIELD_MISSING");
  const digest = crypto.createHash("sha256").update(sql, "utf8").digest("hex");
  const approval = `[\"${MIGRATION_RELATIVE}\"]=\"${digest}\"`;

  assert.equal(
    shield.includes(approval),
    true,
    `PROOF_MIGRATION_REVIEW_HASH_MISSING:${digest}`,
  );
});

test("S4 local DB rehearsal proves authorization, replay, expiry, digest privacy, and single-use evidence", () => {
  const proof = readRequired(BEHAVIOR_SQL, "PROOF_BEHAVIOR_SQL_MISSING");
  const workflow = readRequired(DB_REHEARSAL, "SOCIAL_DB_REHEARSAL_WORKFLOW_MISSING");

  for (const marker of [
    "PROOF_VALID_CONSUME=PASS",
    "PROOF_WRONG_ACTOR_DENIED=PASS",
    "PROOF_WRONG_NONCE_REJECTED=PASS",
    "PROOF_EXPIRED_REJECTED=PASS",
    "PROOF_REPLAY_REJECTED=PASS",
    "PROOF_RAW_NONCE_ABSENT=PASS",
    "PROOF_AUTHENTICATED_DIRECT_ACCESS_DENIED=PASS",
    "PROOF_EVIDENCE_BINDING=PASS",
    "PROOF_DOUBLE_CONSUME_AT_MOST_ONE=PASS",
    "TIGER_SYNAPSE_PROOF_OF_NOW_DB_BEHAVIOR=PASS",
  ]) {
    assert.match(proof, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const plpgsqlBlocks = proof.match(/\$proof\$[\s\S]*?\$proof\$/gi) || [];
  assert.ok(plpgsqlBlocks.length > 0, "PROOF_PLSQL_BLOCK_MISSING");
  for (const block of plpgsqlBlocks) {
    assert.doesNotMatch(
      block,
      /:'?[A-Za-z_][A-Za-z0-9_]*/,
      "PROOF_PSQL_VARIABLE_INSIDE_DOLLAR_QUOTED_BLOCK",
    );
  }
  assert.match(
    proof,
    /set_config\('tiger\.rehearsal\.intent_id',\s*:'intent_id',\s*true\)/i,
    "PROOF_PSQL_FIXTURE_GUC_WRITE_MISSING",
  );
  assert.match(
    proof,
    /current_setting\('tiger\.rehearsal\.intent_id'\)::uuid/i,
    "PROOF_PSQL_FIXTURE_GUC_READ_MISSING",
  );

  assert.match(workflow, /supabase\/migrations\/20260826120000_synapse_proof_of_now\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-synapse-proof-of-now\.sql/);
  assert.match(workflow, /Prove SYNAPSE S4 Proof-of-Now replay and authorization behavior/i);
});

test("S4 local DB rehearsal proves atomic single-use under two-session contention", () => {
  const setup = readRequired(CONCURRENCY_SETUP, "PROOF_CONCURRENCY_SETUP_SQL_MISSING");
  const consume = readRequired(CONCURRENCY_CONSUME, "PROOF_CONCURRENCY_CONSUME_SQL_MISSING");
  const verify = readRequired(CONCURRENCY_VERIFY, "PROOF_CONCURRENCY_VERIFY_SQL_MISSING");
  const workflow = readRequired(DB_REHEARSAL, "SOCIAL_DB_REHEARSAL_WORKFLOW_MISSING");

  assert.match(setup, /PROOF_CONCURRENCY_FIXTURE_READY=PASS/);
  assert.match(setup, /vvip_synapse_proof_issue/i);
  assert.match(consume, /vvip_synapse_proof_consume/i);
  assert.match(consume, /service_role/i);
  assert.match(verify, /PROOF_CONCURRENT_EVIDENCE_EXACTLY_ONE=PASS/);
  assert.match(verify, /PROOF_CONCURRENT_EVIDENCE_BINDING=PASS/);
  assert.match(verify, /TIGER_SYNAPSE_PROOF_OF_NOW_CONCURRENCY=PASS/);

  for (const relative of [
    CONCURRENCY_SETUP_RELATIVE,
    CONCURRENCY_CONSUME_RELATIVE,
    CONCURRENCY_VERIFY_RELATIVE,
  ]) {
    assert.match(workflow, new RegExp(relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(workflow, /Prove SYNAPSE S4 Proof-of-Now concurrent single-use behavior/i);
  assert.match(workflow, /PROOF_CONCURRENT_ACCEPTED_EXACTLY_ONE=PASS/);
  assert.match(workflow, /PROOF_CONCURRENT_REPLAY_EXACTLY_ONE=PASS/);
  assert.match(workflow, /pg_advisory_lock|for\s+update/i);
});

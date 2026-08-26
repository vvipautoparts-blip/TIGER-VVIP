"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CONTROLLER = path.join(ROOT, "scripts/synapse/proof-of-now-controller.js");
const EDGE_FUNCTION = path.join(ROOT, "supabase/functions/tiger-proof-of-now/index.ts");
const MIGRATION = path.join(ROOT, "supabase/migrations/20260826120000_synapse_proof_of_now.sql");

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
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]+authenticated/i);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CONTROLLER = path.join(ROOT, "scripts/synapse/proof-of-now-controller.js");
const EDGE = path.join(ROOT, "supabase/functions/tiger-proof-of-now/index.ts");
const MIGRATION = path.join(ROOT, "supabase/migrations/20260826120000_synapse_proof_of_now.sql");
const MEDIA_FINALIZER = path.join(ROOT, "services/media-finalizer/src/handler.js");

function readRequired(file, code) {
  assert.equal(fs.existsSync(file), true, code);
  return fs.readFileSync(file, "utf8");
}

test("S4 consume accepts only an opaque server capture receipt, never a client-authored media digest", () => {
  readRequired(CONTROLLER, "PROOF_CONTROLLER_MISSING");
  const { buildConsumeRequest } = require(CONTROLLER);

  const request = buildConsumeRequest({
    challengeId: "22222222-2222-4222-8222-222222222222",
    nonce: "a".repeat(64),
    captureReceiptId: "33333333-3333-4333-8333-333333333333",
    captureDigest: "b".repeat(64),
    actorSubject: "attacker-controlled",
    filename: "untrusted.jpg",
    clientTimestamp: "2026-08-26T12:00:00Z",
  });

  assert.deepEqual(
    Object.keys(request).sort(),
    ["action", "capture_receipt_id", "challenge_id", "nonce"],
  );
  assert.equal(Object.hasOwn(request, "capture_digest"), false, "CLIENT_CAPTURE_DIGEST_MUST_NOT_BE_AUTHORITATIVE");

  const edge = readRequired(EDGE, "PROOF_EDGE_FUNCTION_MISSING");
  assert.match(edge, /capture_receipt_id/i, "EDGE_CAPTURE_RECEIPT_REQUIRED");
  assert.match(edge, /p_capture_receipt_id/i, "EDGE_MUST_CONSUME_BY_RECEIPT_ID");
  assert.doesNotMatch(edge, /p_capture_digest\s*:/i, "EDGE_MUST_NOT_FORWARD_CLIENT_CAPTURE_DIGEST");
});

test("S4 database binds a service-only capture receipt to the exact challenge lineage before atomic consume", () => {
  const sql = readRequired(MIGRATION, "PROOF_MIGRATION_MISSING");

  assert.match(sql, /vvip_synapse_proof_capture_receipts/i, "PROOF_CAPTURE_RECEIPT_TABLE_MISSING");
  for (const field of [
    "receipt_id",
    "challenge_id",
    "actor_subject",
    "object_type",
    "object_id",
    "purpose",
    "policy_version",
    "canonical_digest",
    "verifier_id",
    "finalized_at",
    "expires_at",
    "consumed_at",
  ]) {
    assert.match(sql, new RegExp(`\\b${field}\\b`, "i"), `PROOF_CAPTURE_RECEIPT_FIELD_MISSING:${field}`);
  }

  assert.match(sql, /vvip_synapse_proof_capture_finalize/i, "PROOF_CAPTURE_FINALIZE_RPC_MISSING");
  assert.match(sql, /p_capture_receipt_id\s+uuid/i, "PROOF_CONSUME_RECEIPT_PARAMETER_MISSING");
  assert.match(sql, /receipt\.challenge_id\s*=\s*p_challenge_id/i, "PROOF_RECEIPT_CHALLENGE_BINDING_MISSING");
  assert.match(sql, /receipt\.actor_subject\s*=\s*p_actor_subject/i, "PROOF_RECEIPT_ACTOR_BINDING_MISSING");
  assert.match(sql, /receipt\.consumed_at\s+is\s+null/i, "PROOF_RECEIPT_SINGLE_USE_MISSING");
  assert.match(sql, /receipt\.expires_at\s*>\s*statement_timestamp\(\)/i, "PROOF_RECEIPT_EXPIRY_MISSING");
  assert.match(sql, /update\s+public\.vvip_synapse_proof_capture_receipts[\s\S]+returning/i, "PROOF_RECEIPT_ATOMIC_CONSUME_MISSING");
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]+authenticated/i);
});

test("S4 proof capture is finalized only through the hardened media pipeline and yields a server receipt", () => {
  const media = readRequired(MEDIA_FINALIZER, "MEDIA_FINALIZER_MISSING");

  assert.match(media, /canonicalize\(/, "PROOF_CAPTURE_MUST_REUSE_CANONICALIZER");
  assert.match(media, /claim_proof_capture/i, "PROOF_CAPTURE_CLAIM_BOUNDARY_MISSING");
  assert.match(media, /complete_proof_capture/i, "PROOF_CAPTURE_COMPLETE_BOUNDARY_MISSING");
  assert.match(media, /captureReceiptId|capture_receipt_id/i, "PROOF_CAPTURE_RECEIPT_OUTPUT_MISSING");
  assert.match(media, /canonicalSha256|canonical_digest/i, "PROOF_CAPTURE_CANONICAL_DIGEST_MISSING");
  assert.doesNotMatch(media, /clientTimestamp|preciseLocation|ownershipClaim/i, "PROOF_CAPTURE_MUST_NOT_ACCEPT_SENSITIVE_CLIENT_CLAIMS");
});

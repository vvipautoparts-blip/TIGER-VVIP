"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CONTROLLER = path.join(ROOT, "scripts/synapse/proof-of-now-controller.js");
const EDGE = path.join(ROOT, "supabase/functions/tiger-proof-of-now/index.ts");
const PREPARER = path.join(ROOT, "supabase/functions/tiger-proof-capture-prepare/index.ts");
const CONFIG = path.join(ROOT, "supabase/config.toml");
const MIGRATION = path.join(ROOT, "supabase/migrations/20260826120000_synapse_proof_of_now.sql");
const MEDIA_FINALIZER = path.join(ROOT, "services/media-finalizer/src/handler.js");
const REHEARSAL = path.join(ROOT, ".github/workflows/tiger-synapse-s4-proof-rehearsal.yml");

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

  assert.deepEqual(Object.keys(request).sort(), ["action", "capture_receipt_id", "challenge_id", "nonce"]);
  assert.equal(Object.hasOwn(request, "capture_digest"), false, "CLIENT_CAPTURE_DIGEST_MUST_NOT_BE_AUTHORITATIVE");

  const edge = readRequired(EDGE, "PROOF_EDGE_FUNCTION_MISSING");
  assert.match(edge, /capture_receipt_id/i, "EDGE_CAPTURE_RECEIPT_REQUIRED");
  assert.match(edge, /p_capture_receipt_id/i, "EDGE_MUST_CONSUME_BY_RECEIPT_ID");
  assert.doesNotMatch(edge, /p_capture_digest\s*:/i, "EDGE_MUST_NOT_FORWARD_CLIENT_CAPTURE_DIGEST");
});

test("S4 external identity verification is reachable because platform JWT verification is disabled only for the two proof functions", () => {
  const config = readRequired(CONFIG, "SUPABASE_CONFIG_MISSING");
  const edge = readRequired(EDGE, "PROOF_EDGE_FUNCTION_MISSING");
  const preparer = readRequired(PREPARER, "PROOF_CAPTURE_PREPARER_MISSING");

  for (const functionName of ["tiger-proof-of-now", "tiger-proof-capture-prepare"]) {
    const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      config,
      new RegExp(`\\[functions\\.${escaped}\\]\\s*\\nverify_jwt\\s*=\\s*false`, "i"),
      `PROOF_EXTERNAL_AUTH_CONFIG_MISSING:${functionName}`,
    );
  }
  for (const source of [edge, preparer]) {
    assert.match(source, /authorization/i, "PROOF_HANDLER_BEARER_BOUNDARY_MISSING");
    assert.match(source, /verifyIdentity|IDENTITY_VERIFIER/i, "PROOF_HANDLER_EXTERNAL_IDENTITY_MISSING");
  }
});

test("S4 capture preparation is server-authorized and uses private signed upload capability only", () => {
  const source = readRequired(PREPARER, "PROOF_CAPTURE_PREPARER_MISSING");
  assert.match(source, /verifyIdentity|IDENTITY_VERIFIER/i, "PROOF_CAPTURE_PREPARER_IDENTITY_MISSING");
  assert.match(source, /vvip_synapse_proof_capture_prepare/i, "PROOF_CAPTURE_PREPARE_RPC_MISSING");
  assert.match(source, /createSignedUploadUrl/i, "PROOF_CAPTURE_SIGNED_UPLOAD_MISSING");
  assert.match(source, /proof-capture-staging/i, "PROOF_CAPTURE_PRIVATE_BUCKET_MISSING");
  assert.match(source, /crypto\.getRandomValues|crypto\.randomUUID/i, "PROOF_CAPTURE_RANDOM_CAPABILITY_MISSING");
  assert.match(source, /Cache-Control[^\n]*no-store/i, "PROOF_CAPTURE_NO_STORE_MISSING");
  assert.doesNotMatch(source, /capture_digest|canonical_digest/i, "PREPARER_MUST_NOT_ACCEPT_OR_MINT_CAPTURE_DIGEST");
});

test("S4 database binds a service-only capture receipt to the exact challenge lineage before atomic consume", () => {
  const sql = readRequired(MIGRATION, "PROOF_MIGRATION_MISSING");

  assert.match(sql, /vvip_synapse_proof_capture_receipts/i, "PROOF_CAPTURE_RECEIPT_TABLE_MISSING");
  for (const field of [
    "receipt_id", "challenge_id", "actor_subject", "object_type", "object_id", "purpose",
    "policy_version", "canonical_digest", "verifier_id", "finalized_at", "expires_at", "consumed_at",
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

test("S4 has a dedicated deterministic local-only rehearsal instead of relying only on the broad social workflow", () => {
  const workflow = readRequired(REHEARSAL, "PROOF_S4_REHEARSAL_MISSING");
  assert.match(workflow, /runs-on:\s*ubuntu-24\.04/i, "PROOF_S4_RUNNER_MUST_BE_STABLE");
  assert.match(workflow, /workflow_dispatch:/i, "PROOF_S4_MANUAL_REPLAY_MISSING");
  assert.match(workflow, /SOURCE_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/i, "PROOF_S4_EXACT_SOURCE_MISSING");
  assert.match(workflow, /cancel-in-progress:\s*false/i, "PROOF_S4_EVIDENCE_MUST_NOT_BE_CANCELLED");
  assert.match(workflow, /tests\/tiger-synapse-proof-capture-origin\.test\.cjs/i, "PROOF_S4_CAPTURE_ORIGIN_TEST_NOT_WIRED");
  assert.match(workflow, /tests\/sql\/tiger-synapse-proof-of-now\.sql/i, "PROOF_S4_BEHAVIOR_NOT_WIRED");
  assert.match(workflow, /tests\/sql\/tiger-synapse-proof-of-now-concurrency-consume\.sql/i, "PROOF_S4_RACE_NOT_WIRED");
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/i, "PROOF_S4_LOCAL_ONLY_GUARD_MISSING");
});

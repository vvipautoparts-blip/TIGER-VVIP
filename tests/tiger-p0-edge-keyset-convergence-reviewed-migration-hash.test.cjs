"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const review = path.join(root, "docs/security/TIGER_P0_EDGE_KEYSET_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md");
const rel = "supabase/migrations/20260821133000_social_edge_keyset_convergence.sql";
const expected = "6a2195497edb441f4e0525d14c608e5934ae55e7b388937f189a777aeb6ba3cb";

test("P0-D keyset migration bytes match the exact reviewed hash", () => {
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, rel)))
    .digest("hex");
  assert.equal(actual, expected, `${rel} hash drift: expected=${expected} actual=${actual}`);

  const scannerText = fs.readFileSync(scanner, "utf8");
  assert.ok(
    scannerText.includes(`[\"${rel}\"]=\"${expected}\"`),
    `missing exact Steel Shield reviewed baseline for ${rel}`,
  );
});

test("P0-D security review records the exact hash and required boundaries", () => {
  assert.ok(fs.existsSync(review), "P0-D security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");

  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=2/);
  assert.match(reviewText, /profile_id/);
  assert.match(reviewText, /cross-profile/i);
  assert.match(reviewText, /block/i);
  assert.match(reviewText, /deactivated/i);
  assert.match(reviewText, /subject/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only the exact P0-D migration bytes as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.ok(output.includes(`REVIEWED_BASELINE:${rel}`), output);
});

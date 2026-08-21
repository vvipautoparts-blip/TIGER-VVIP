"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const review = path.join(root, "docs/security/TIGER_P0_MESSAGING_CONVERGENCE_MIGRATION_SECURITY_REVIEW.md");

const migrations = Object.freeze([
  Object.freeze({
    rel: "supabase/migrations/20260821123000_social_block_privacy_convergence.sql",
    expected: "122be6e0eab63bbf7453e1d4eca90a11740cc83ef6531aa9158381448f88895c",
  }),
  Object.freeze({
    rel: "supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql",
    expected: "3a0473da73370fbbb17f64204f7a5d6254e697309ec68fdf793efb0046806f25",
  }),
]);

test("P0 Messaging migration bytes match the exact reviewed hashes", () => {
  const scannerText = fs.readFileSync(scanner, "utf8");

  for (const item of migrations) {
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, item.rel)))
      .digest("hex");
    assert.equal(actual, item.expected, `${item.rel} hash drift: expected=${item.expected} actual=${actual}`);
    assert.ok(
      scannerText.includes(`[\"${item.rel}\"]=\"${item.expected}\"`),
      `missing exact Steel Shield reviewed baseline for ${item.rel}`,
    );
  }
});

test("P0 Messaging security review records both exact hashes and required boundaries", () => {
  assert.ok(fs.existsSync(review), "P0 Messaging security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");

  for (const item of migrations) {
    assert.match(reviewText, new RegExp(item.expected));
  }

  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=38/);
  assert.match(reviewText, /FORCE RLS/i);
  assert.match(reviewText, /sender_subject/);
  assert.match(reviewText, /member_subject/);
  assert.match(reviewText, /Broadcast INSERT/i);
  assert.match(reviewText, /block/i);
  assert.match(reviewText, /lifecycle/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only the exact P0 Messaging convergence migration bytes as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);

  for (const item of migrations) {
    assert.ok(
      output.includes(`REVIEWED_BASELINE:${item.rel}`),
      `missing exact reviewed-baseline marker for ${item.rel}\n${output}`,
    );
  }
});

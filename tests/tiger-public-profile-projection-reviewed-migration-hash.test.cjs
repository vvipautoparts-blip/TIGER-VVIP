"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260820220500_public_profile_projection.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_PUBLIC_PROFILE_PROJECTION_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "28ca8d105c318327b6f2dce95303c4147f3ae7e73d312367d28922e990ee0257";

test("Public Profile Projection reviewed bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Public Profile Projection hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=6/);
  assert.match(reviewText, /NOT_NULL_RISK = 5/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED = 1/);
});

test("Steel Shield recognizes only the exact Public Profile Projection migration bytes as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`
  );
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824133000_social_follow_preferences_surface.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_FOLLOW_PREFERENCES_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "13b133d39845be1f753348ea61b581acab0614eb58759664c85693a35d555ef8";

test("Follow preferences migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Follow preferences reviewed hash drift: expected=${expected} actual=${actual}`);

  assert.equal(fs.existsSync(review), true, "Follow preferences security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=13/);
  assert.match(reviewText, /NOT_NULL_RISK=6/);
  assert.match(reviewText, /UPDATE_WITHOUT_WHERE=1/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED=6/);
  assert.match(reviewText, /after target deactivation/i);
  assert.match(reviewText, /only after the server-authorized feed page/i);
  assert.match(reviewText, /both directional follows/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only exact Follow preferences migration bytes as reviewed", () => {
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

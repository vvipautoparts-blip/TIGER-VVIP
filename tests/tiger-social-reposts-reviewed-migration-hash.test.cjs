"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824111500_social_reposts.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_SOCIAL_REPOSTS_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "1b4694956de038c004e6cdc9d505e1ed59a5a528cd8e7b37622b8713803254e4";

test("Social Reposts reviewed migration bytes match the content-addressed review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Social Reposts reviewed hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=8/);
  assert.match(reviewText, /NOT_NULL_RISK = 5/);
  assert.match(reviewText, /UPDATE_WITHOUT_WHERE = 2/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED = 1/);
});

test("Steel Shield recognizes the exact Social Reposts migration as reviewed", () => {
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

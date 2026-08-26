"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260818143000_social_comments.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_SOCIAL_COMMENTS_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "ed40f4e4ed67ad5dee8c87181f90602cf8878593f55b05d041e3e7a1201ce5fb";

test("Social Comments reviewed migration bytes match the content-addressed review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Social Comments reviewed hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=11/);
  assert.match(reviewText, /NOT_NULL_RISK = 7/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED = 4/);
});

test("Steel Shield recognizes the exact Social Comments migration as reviewed", () => {
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

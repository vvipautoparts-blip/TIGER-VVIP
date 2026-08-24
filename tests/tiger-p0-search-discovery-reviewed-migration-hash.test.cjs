"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824140000_social_search_discovery_surface.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_SEARCH_DISCOVERY_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "520d5f3dc7bad2aae58d4f6f0aa2e62504e99ba6231971b63c4f861ea6d75a1b";

test("Search and discovery migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Search migration reviewed hash drift: expected=${expected} actual=${actual}`);

  assert.equal(fs.existsSync(review), true, "Search and discovery security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=2/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED=2/);
  assert.match(reviewText, /supplies only a trimmed search query/i);
  assert.match(reviewText, /Every candidate post/i);
  assert.match(reviewText, /neutral tombstone/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only exact Search migration bytes as reviewed", () => {
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

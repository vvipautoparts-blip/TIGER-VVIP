"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824143000_social_account_lifecycle_surface.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_ACCOUNT_LIFECYCLE_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "3616254febcc3ad53b8b71faaf428bfb4dca35dc369e280ffd86d3eb64c7b1bf";

test("Account lifecycle migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Account lifecycle migration reviewed hash drift: expected=${expected} actual=${actual}`);

  assert.equal(fs.existsSync(review), true, "Account lifecycle security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=1/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED=1/);
  assert.match(reviewText, /browser supplies no subject/i);
  assert.match(reviewText, /deactivated or terminally deleted/i);
  assert.match(reviewText, /service_role/);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only exact Account lifecycle migration bytes as reviewed", () => {
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

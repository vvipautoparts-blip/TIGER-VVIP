"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260820231500_profile_lifecycle_boundary.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_PROFILE_LIFECYCLE_BOUNDARY_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "5e23b0f296e3b447ce42cc4d7bb11b42fe4c6cbed43d654b065d911f40a07b68";

test("Profile Lifecycle Boundary reviewed bytes match the content-addressed review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Profile Lifecycle Boundary hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=2/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED/);
  assert.match(reviewText, /service_role/);
});

test("Steel Shield recognizes only the exact Profile Lifecycle Boundary migration bytes as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
  );
});

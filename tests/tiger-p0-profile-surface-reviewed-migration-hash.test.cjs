"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824123000_social_profile_surface.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_PROFILE_SURFACE_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "88c414e6a2b70e66784a96a1fe3d5930fc0900c2533c7ebce40a8ea4f789f0e4";

test("Profile surface migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Profile surface reviewed hash drift: expected=${expected} actual=${actual}`);

  assert.equal(fs.existsSync(review), true, "Profile surface security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=4/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED=3/);
  assert.match(reviewText, /NOT_NULL_RISK=1/);
  assert.match(reviewText, /actor profile UUID and target profile UUID/i);
  assert.match(reviewText, /continued pages after authorization changes/i);
  assert.match(reviewText, /legacy `vvip_get_public_profile/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only the exact Profile surface migration bytes as reviewed", () => {
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

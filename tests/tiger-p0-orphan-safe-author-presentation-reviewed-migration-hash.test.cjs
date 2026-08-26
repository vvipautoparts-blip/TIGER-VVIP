"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260821120000_orphan_safe_author_presentation.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_ORPHAN_SAFE_AUTHOR_PRESENTATION_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "a16eb9e91dd03b107c474a82362f3874c1de2112955c1d960262ce074a87a3a1";

test("P0-B orphan-safe reviewed bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `P0-B orphan-safe migration hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=12/);
  assert.match(reviewText, /NOT_NULL_RISK/);
  assert.match(reviewText, /UPDATE_WITHOUT_WHERE/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED/);
  assert.match(reviewText, /author_subject/);
});

test("Steel Shield recognizes only the exact P0-B orphan-safe migration bytes as reviewed", () => {
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

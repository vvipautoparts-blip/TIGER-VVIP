"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260818150000_synapse_intent_foundation.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_SYNAPSE_INTENT_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "c854a7ebf64d6710a9eb9351044108a10b97a5c35f5afc330288232fc7df5072";

test("SYNAPSE intent migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `SYNAPSE intent reviewed hash drift: expected=${expected} actual=${actual}`);

  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL = 0/);
  assert.match(reviewText, /HIGH = 21/);
  assert.match(reviewText, /NOT_NULL_RISK = 18/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED = 2/);
});

test("Steel Shield recognizes the exact SYNAPSE intent migration as reviewed", () => {
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

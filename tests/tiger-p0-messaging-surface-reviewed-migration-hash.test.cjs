"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260824120000_social_messaging_surface.sql";
const migration = path.join(root, migrationRel);
const review = path.join(root, "docs/security/TIGER_P0_MESSAGING_SURFACE_MIGRATION_SECURITY_REVIEW.md");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "769a1f9bc537f3b324d8fc4a51206f24bb0553a6487168c77d109a284d8be602";

test("Messaging surface migration bytes match the content-addressed security review", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `Messaging surface reviewed hash drift: expected=${expected} actual=${actual}`);

  assert.equal(fs.existsSync(review), true, "Messaging surface security review must exist");
  const reviewText = fs.readFileSync(review, "utf8");
  assert.match(reviewText, new RegExp(expected));
  assert.match(reviewText, /CRITICAL=0/);
  assert.match(reviewText, /HIGH=2/);
  assert.match(reviewText, /BROAD_GRANT_TO_AUTHENTICATED=2/);
  assert.match(reviewText, /list_conversations/i);
  assert.match(reviewText, /list_message_contacts/i);
  assert.match(reviewText, /malformed membership/i);
  assert.match(reviewText, /byte drift/i);
});

test("Steel Shield recognizes only the exact Messaging surface migration bytes as reviewed", () => {
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

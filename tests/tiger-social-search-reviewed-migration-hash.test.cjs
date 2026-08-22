"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const reviewed = new Map([
  [
    "supabase/migrations/20260821160000_social_search_convergence.sql",
    "cd9031ee26d709fada7d1a91828c02171c68fc791de02739df35f1cdcb77cb4f",
  ],
  [
    "supabase/migrations/20260821160100_social_search_budget_guard.sql",
    "01511711186643d423d510578abad280e6c3a732287ba70309166d327b67ed75",
  ],
  [
    "supabase/migrations/20260821160200_social_search_adaptive_30_shield.sql",
    "c2b8ccb13dedcd12f7b1c15610938c22d80f6a1b2e4c427cb085c7fdb7056b31",
  ],
]);

test("P0-C Social Search migration bytes match the exact security review", () => {
  for (const [relativePath, expected] of reviewed) {
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, relativePath)))
      .digest("hex");
    assert.equal(
      actual,
      expected,
      "reviewed hash drift: " + relativePath + " expected=" + expected + " actual=" + actual
    );
  }
});

test("Steel Shield recognizes every P0-C Social Search migration as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = (result.stdout || "") + "\n" + (result.stderr || "");
  assert.equal(result.status, 0, output);
  for (const relativePath of reviewed.keys()) {
    assert.match(output, new RegExp(
      "REVIEWED_BASELINE:" + relativePath.replace(/[.*+?^$()|[\\]\\]/g, "\\$&")
    ));
  }
});

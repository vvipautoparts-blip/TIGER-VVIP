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
    "d788463f7d8f5a71cc17d71128c963bfaf19e376fa59c193a2edcce182f9b145",
  ],
  [
    "supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql",
    "ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6",
  ],
  [
    "supabase/migrations/20260812063600_identity02_profile_resolver_minimum_truth.sql",
    "838ae0ede07292c0c645f1b967753fda97cde672a04de24e787cba21aa4c0ac5",
  ],
  [
    "supabase/migrations/20260812070600_lc07_legacy_otp_sequence_isolation.sql",
    "c2ff8704bd504bc9385613ba6276408d5f18ea27e3626f4f961720c5c2cffadc",
  ],
  [
    "supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql",
    "ac8b769352b88bcb457e28d667c5b947464d6a14c68fb166b524e07553bcfe5a",
  ],
  [
    "supabase/migrations/20260816105000_drop_legacy_profiles_table.sql",
    "206bc99d55ccb0828c4aa42a2ea1b62e0bbc97268e846df139baa85aa7a35974",
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

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
  ["supabase/migrations/20260818120000_federated_actor_authority_convergence.sql", "39a0e0e208443653bc452f56fc3df7f62903a544308276445282214505b12243"],
  ["supabase/migrations/20260819103000_social_production_backend_completion.sql", "4a9bbe3c6bb08b61d8f44585fd8cb15d278852de13beaae77a6e2769c5a6200e"],
  ["supabase/migrations/20260819103100_social_media_federated_owner_fix.sql", "147d008cced5a175197deb2de2ce216c5c46d4d39d393fc6b4e48af646dd02d7"],
  ["supabase/migrations/20260819110000_advertising_financial_authority.sql", "b039f7942f227496a18f5dd91f39c69f6361b6d25c4c50657f672d112241b53c"],
  ["supabase/migrations/20260819112000_country_legal_activation_authority.sql", "d0b80079a9cea8708e510c350f0a695337141ff5cbbb5180e610942568671724"],
]);

test("reviewed global-production migrations are byte exact", () => {
  for (const [rel, expected] of reviewed) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
    assert.equal(actual, expected, `${rel} review hash drift`);
  }
});

test("Steel Shield recognizes all reviewed global-production migrations", () => {
  const result = spawnSync("bash", [scanner], { cwd: root, encoding: "utf8", env: process.env });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  for (const rel of reviewed.keys()) {
    assert.ok(output.includes(`REVIEWED_BASELINE:${rel}`), `missing reviewed marker for ${rel}\n${output}`);
  }
});

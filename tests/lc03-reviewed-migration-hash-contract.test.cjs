"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const migrationRel = "supabase/migrations/20260808003000_lc03_supabase_security_hardening.sql";
const migration = path.join(root, migrationRel);
const scanner = path.join(root, "scripts/security/p08-steel-shield/scan-dangerous-sql.sh");
const expected = "15fed4de91331ceb252e359f6946de9b02d16d91286157177024141546963955";

test("LC-03 reviewed migration bytes match the content-addressed approval", () => {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(migration)).digest("hex");
  assert.equal(actual, expected, `LC-03 reviewed hash drift: expected=${expected} actual=${actual}`);
});

test("Steel Shield recognizes the exact LC-03 migration as reviewed", () => {
  const result = spawnSync("bash", [scanner], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, new RegExp(`\\[reviewed\\] ${migrationRel.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`), output);
});

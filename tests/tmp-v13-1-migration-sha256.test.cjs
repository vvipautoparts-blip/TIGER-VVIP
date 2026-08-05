"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.resolve(
  __dirname,
  "../supabase/migrations/20260805_v13_1_authorization_foundation.sql"
);

test("print exact V13.1 migration SHA-256 for reviewed baseline pinning", () => {
  const content = fs.readFileSync(migrationPath);
  const sha256 = crypto.createHash("sha256").update(content).digest("hex");
  assert.fail(`V13_1_MIGRATION_SHA256=${sha256}`);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260822023000_zero_brokerage_legacy_transaction_write_lock.sql"
);
const BOOTSTRAP = path.join(ROOT, "supabase-schema.sql");

function read(file) {
  assert.equal(fs.existsSync(file), true, `${path.relative(ROOT, file)} must exist`);
  return fs.readFileSync(file, "utf8");
}

function assertWriteLock(sql, label) {
  assert.match(sql, /vvip_reject_legacy_brokerage_write/i, `${label}: reject function`);
  assert.match(sql, /LEGACY_BROKERAGE_WRITE_RETIRED/i, `${label}: stable rejection code`);

  for (const table of ["orders", "commissions"]) {
    assert.match(
      sql,
      new RegExp(`revoke\\s+insert\\s*,\\s*update\\s*,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, "i"),
      `${label}: browser writes revoked for ${table}`
    );
    assert.match(
      sql,
      new RegExp(`create\\s+trigger\\s+[^\\s]+[\\s\\S]*before\\s+insert\\s+or\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${table}[\\s\\S]*vvip_reject_legacy_brokerage_write`, "i"),
      `${label}: mutation trigger for ${table}`
    );
  }
}

test("forward-only migration preserves legacy rows but makes brokerage tables immutable", () => {
  const sql = read(MIGRATION);

  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;/i);
  assertWriteLock(sql, "migration");

  assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(sql, /truncate\s+/i);
  assert.doesNotMatch(sql, /drop\s+(?:table|schema)\s+/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.(?:orders|commissions)/i);
});

test("fresh bootstrap cannot recreate writable legacy brokerage tables", () => {
  const sql = read(BOOTSTRAP);
  assertWriteLock(sql, "supabase-schema.sql");
});

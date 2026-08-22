"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const LOCK_NAME = "20260822023000_zero_brokerage_legacy_transaction_write_lock.sql";
const LOCK_PATH = path.join(MIGRATIONS, LOCK_NAME);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assertLegacyWriteLock(sql) {
  assert.match(sql, /vvip_reject_legacy_brokerage_write/i);
  assert.match(sql, /LEGACY_BROKERAGE_WRITE_RETIRED/i);

  for (const table of ["orders", "commissions"]) {
    assert.match(
      sql,
      new RegExp(`revoke\\s+insert\\s*,\\s*update\\s*,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, "i"),
      `browser writes must be revoked for ${table}`
    );
    assert.match(
      sql,
      new RegExp(`create\\s+trigger\\s+[^\\s]+[\\s\\S]*before\\s+insert\\s+or\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${table}[\\s\\S]*vvip_reject_legacy_brokerage_write`, "i"),
      `all mutations must fail closed for ${table}`
    );
  }
}

test("forward-only zero-brokerage migration locks legacy transaction tables without deleting history", () => {
  assert.equal(fs.existsSync(LOCK_PATH), true, `${LOCK_NAME} must exist`);
  const sql = read(LOCK_PATH);

  assert.match(sql, /\bbegin\s*;/i);
  assert.match(sql, /\bcommit\s*;/i);
  assertLegacyWriteLock(sql);
  assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(sql, /truncate\s+/i);
  assert.doesNotMatch(sql, /drop\s+(?:table|schema)\s+/i);
});

test("no later migration may silently reopen browser writes to retired brokerage tables", () => {
  const files = fs.readdirSync(MIGRATIONS)
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();
  const lockIndex = files.indexOf(LOCK_NAME);
  assert.notEqual(lockIndex, -1);

  for (const name of files.slice(lockIndex + 1)) {
    const sql = read(path.join(MIGRATIONS, name));
    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)[\s\S]{0,160}public\.(?:orders|commissions)[\s\S]{0,160}(?:anon|authenticated)/iu,
      `${name} must not reopen retired brokerage browser writes`
    );
    assert.doesNotMatch(
      sql,
      /drop\s+trigger[\s\S]{0,160}(?:orders|commissions)/iu,
      `${name} must not remove the brokerage write lock`
    );
  }
});

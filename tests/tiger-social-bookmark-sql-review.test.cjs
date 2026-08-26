"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260820205500_social_bookmarks.sql";
const scannerPath = "scripts/security/p08-steel-shield/scan-dangerous-sql.sh";

test("Social Bookmark migration keeps DELETE predicate scanner-visible and review byte-exact", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const scanner = fs.readFileSync(scannerPath, "utf8");

  const deleteLine = sql
    .split(/\r?\n/)
    .find((line) => /delete\s+from\s+public\.vvip_social_bookmarks\s+bookmark/i.test(line));

  assert.ok(deleteLine, "bookmark DELETE statement must exist");
  assert.match(
    deleteLine,
    /where\s+bookmark\.post_id\s*=\s*p_post_id/i,
    "DELETE predicate must stay on the scanner-visible DELETE line"
  );

  const digest = crypto.createHash("sha256").update(sql).digest("hex");
  assert.ok(
    scanner.includes(`[\"${migrationPath}\"]=\"${digest}\"`),
    "dangerous-SQL review must bind the exact reviewed Bookmark migration bytes"
  );
});

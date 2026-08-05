"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationRelativePath = "supabase/migrations/20260805_v13_1_authorization_foundation.sql";
const migrationPath = path.join(root, migrationRelativePath);
const rollbackPath = path.join(
  root,
  "docs/security/sql-review/v13.1/v13_1_authorization_foundation_rollback_review.sql"
);
const verifierPath = path.join(
  root,
  "scripts/authorization/verify-v13-authorization-migration-local.sh"
);
const scannerPath = path.join(
  root,
  "scripts/security/p08-steel-shield/scan-dangerous-sql.sh"
);

const protectedTables = [
  "vvip_authority_roles",
  "vvip_authority_permissions",
  "vvip_authority_principals",
  "vvip_authority_assignments",
  "vvip_authority_assignment_revisions",
  "vvip_country_authority_seals",
  "vvip_authorization_envelope_audit",
  "vvip_authorization_audit_events"
];

function readRequired(filePath) {
  assert.equal(fs.existsSync(filePath), true, `missing required artifact: ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, "utf8");
}

test("authorization foundation migration exists at the single canonical path", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const matching = fs.readdirSync(path.dirname(migrationPath))
    .filter((name) => /v13_1_authorization_foundation\.sql$/i.test(name));
  assert.deepEqual(matching, [path.basename(migrationPath)]);
});

test("migration creates exact empty security tables without collision-hiding syntax", () => {
  const sql = readRequired(migrationPath);
  for (const table of protectedTables) {
    assert.match(sql, new RegExp(`create\\s+table\\s+public\\.${table}\\s*\\(`, "i"));
  }
  assert.doesNotMatch(sql, /create\s+table\s+if\s+not\s+exists/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_authority_/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_country_authority_seals/i);
  assert.doesNotMatch(sql, /copy\s+public\.vvip_/i);
});

test("Clerk principals stay text while internal records use UUID", () => {
  const sql = readRequired(migrationPath);
  assert.match(sql, /principal_id\s+text\s+primary\s+key/i);
  assert.match(sql, /actor_id\s+text\s+not\s+null/i);
  assert.match(sql, /granted_by\s+text\s+not\s+null/i);
  assert.match(sql, /changed_by\s+text\s+not\s+null/i);
  assert.match(sql, /assignment_id\s+uuid\s+primary\s+key/i);
  assert.match(sql, /audit_id\s+uuid\s+primary\s+key/i);
  assert.match(sql, /vvip_current_actor_id\(\)[\s\S]{0,100}returns\s+text/i);
  assert.match(sql, /request\.jwt\.claim\.sub/);
  assert.doesNotMatch(sql, /claim_value::uuid/i);
  assert.doesNotMatch(sql, /principal_id\s+uuid/i);
});

test("all protected tables enable and force RLS with no browser policies", () => {
  const sql = readRequired(migrationPath);
  for (const table of protectedTables) {
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"));
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i"));
  }
  assert.doesNotMatch(sql, /create\s+policy/i);
});

test("browser roles receive no table sequence or function authority", () => {
  const sql = readRequired(migrationPath);
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(sql, new RegExp(`revoke\\s+all[\\s\\S]{0,500}from\\s+${role}`, "i"));
  }
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|execute|usage)[\s\S]{0,300}to\s+(public|anon|authenticated)/i);
});

test("foundation contains no privileged write RPC or production bootstrap data", () => {
  const sql = readRequired(migrationPath);
  assert.doesNotMatch(sql, /vvip_manage_partner_membership/i);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function[\s\S]{0,120}(create|update|delete|manage|grant|revoke)_(owner|partner|assignment|authority)/i);
  assert.doesNotMatch(sql, /OWNER_ROOT[^\n]*values/i);
  assert.doesNotMatch(sql, /PARTNER_GLOBAL_ADMIN[^\n]*values/i);
  assert.doesNotMatch(sql, /\bJO\b|\bJORDAN\b|\bAMMAN\b/i);
  assert.doesNotMatch(sql, /project[_-]?ref|supabase\.co|postgres(?:ql)?:\/\//i);
});

test("owner and audit defense-in-depth guards are present", () => {
  const sql = readRequired(migrationPath);
  assert.match(sql, /vvip_one_active_owner_root/i);
  assert.match(sql, /OWNER_ROOT_IMMUTABLE/);
  assert.match(sql, /CLIENT_AUTHORITY_FIELDS_DENIED/);
  assert.match(sql, /AUTHORIZATION_AUDIT_APPEND_ONLY/);
  assert.match(sql, /before\s+update\s+or\s+delete\s+on\s+public\.vvip_authorization_audit_events/i);
});

test("dangerous SQL review exception is bound to the exact migration bytes", () => {
  const migrationBytes = fs.readFileSync(migrationPath);
  const actualHash = crypto.createHash("sha256").update(migrationBytes).digest("hex");
  const scanner = readRequired(scannerPath);
  const expectedPrefix = `  [\"${migrationRelativePath}\"]=\"`;
  const reviewLines = scanner.split(/\r?\n/)
    .filter((line) => line.startsWith(expectedPrefix));

  assert.equal(reviewLines.length, 1, "migration must have exactly one content-addressed review entry");
  const reviewedHash = reviewLines[0].slice(expectedPrefix.length, -1);
  assert.match(reviewedHash, /^[a-f0-9]{64}$/);
  assert.equal(
    reviewedHash,
    actualHash,
    `migration review must pin exact SHA-256: ${actualHash}`
  );
  assert.match(scanner, /actual_hash="\$\(sha256sum "\$file" \| awk '\{print \$1\}'\)"/);
  assert.match(scanner, /\[\[ "\$actual_hash" == "\$expected_hash" \]\]/);
});

test("rollback artifact is review-only outside migrations and never remote", () => {
  const sql = readRequired(rollbackPath);
  assert.equal(rollbackPath.includes("supabase/migrations"), false);
  assert.match(sql, /REVIEW ONLY[^\n]*LOCAL ROLLBACK[^\n]*DO NOT APPLY REMOTELY/i);
  assert.match(sql, /drop\s+table/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+(push|reset)|project[_-]?ref|supabase\.co/i);
});

test("local rehearsal is explicit local-only and repeatable", () => {
  const script = readRequired(verifierPath);
  assert.match(script, /VVIP_ALLOW_LOCAL_SUPABASE_RESET/);
  assert.match(script, /supabase\s+db\s+reset\s+--local/g);
  assert.equal((script.match(/supabase\s+db\s+reset\s+--local/g) || []).length, 2);
  assert.match(script, /project-ref|linked/i);
  assert.doesNotMatch(script, /supabase\s+db\s+push|migration\s+up\s+--linked|--db-url|supabase\.co/i);
  assert.doesNotMatch(script, /v13_1_authorization_foundation_rollback_review\.sql/);
});

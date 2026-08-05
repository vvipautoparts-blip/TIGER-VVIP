"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sqlPath = path.resolve(
  __dirname,
  "../docs/security/sql-review/v13.1/v13_1_authorization_rls_review.sql"
);

function readSql() {
  return fs.readFileSync(sqlPath, "utf8");
}

test("authorization SQL is explicitly review-only and outside migrations", () => {
  assert.equal(sqlPath.includes("supabase/migrations"), false);
  const sql = readSql();
  assert.match(sql, /REVIEW ONLY[^\n]*DO NOT APPLY/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+(push|reset)/i);
  assert.doesNotMatch(sql, /production\s+(deploy|apply)/i);
});

test("Clerk subject identifiers remain text throughout the authority boundary", () => {
  const sql = readSql();
  assert.match(sql, /principal_id\s+text\s+primary\s+key/i);
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_current_actor_id\(\)\s+returns\s+text/i);
  assert.match(sql, /select\s+nullif\(current_setting\('request\.jwt\.claim\.sub',\s*true\),\s*''\)/i);
  assert.match(sql, /p_actor_id\s+text/i);
  assert.match(sql, /p_subject_id\s+text/i);
  assert.doesNotMatch(sql, /claim_value::uuid/i);
  assert.doesNotMatch(sql, /principal_id\s+uuid/i);
  assert.doesNotMatch(sql, /actor_id\s+uuid/i);
});

test("every protected authorization table enables and forces RLS", () => {
  const sql = readSql();
  for (const table of [
    "vvip_authority_principals",
    "vvip_authority_assignments",
    "vvip_authority_assignment_revisions",
    "vvip_authorization_envelope_audit",
    "vvip_country_authority_seals",
    "vvip_authorization_audit_events"
  ]) {
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"));
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i"));
  }
});

test("owner root and peer partner mutation guards are explicit", () => {
  const sql = readSql();
  assert.match(sql, /OWNER_ROOT_IMMUTABLE/);
  assert.match(sql, /PEER_PARTNER_MUTATION_DENIED/);
  assert.doesNotMatch(
    sql,
    /create\s+policy[\s\S]{0,300}on\s+public\.vvip_authority_principals[\s\S]{0,100}for\s+(insert|update|delete)/i
  );
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete)[\s\S]{0,200}to\s+(anon|authenticated)/i);
});

test("security definer RPCs fix search_path and revoke public execution", () => {
  const sql = readSql();
  const definitions = [...sql.matchAll(/create\s+or\s+replace\s+function[\s\S]*?\$function\$;/gi)];
  assert.ok(definitions.length >= 3);
  for (const definition of definitions) {
    if (/security\s+definer/i.test(definition[0])) {
      assert.match(definition[0], /set\s+search_path\s*=\s*pg_catalog,\s*public/i);
    }
  }
  assert.match(sql, /revoke\s+all\s+on\s+function[\s\S]*from\s+public/i);
});

test("audit records are append-only", () => {
  const sql = readSql();
  assert.match(sql, /vvip_reject_authorization_audit_mutation/i);
  assert.match(sql, /TG_OP\s+IN\s*\(\s*'UPDATE'\s*,\s*'DELETE'\s*\)/i);
  assert.match(sql, /AUTHORIZATION_AUDIT_APPEND_ONLY/);
});

test("country-local operations require active state valid status and exact seal version", () => {
  const sql = readSql();
  assert.match(sql, /activation_state\s*=\s*'ACTIVE'/i);
  assert.match(sql, /seal_status\s*=\s*'VALID'/i);
  assert.match(sql, /seal_version\s*=\s*p_seal_version/i);
  assert.match(sql, /COUNTRY_SEAL_REQUIRED/);
});

test("scope contract includes country ancestry and denies client authority writes", () => {
  const sql = readSql();
  for (const token of ["platform", "country", "sector", "region", "area", "team"]) {
    assert.match(sql, new RegExp(`'${token}'`, "i"));
  }
  for (const column of [
    "country_code",
    "sector_id",
    "region_id",
    "area_id",
    "team_id",
    "assignment_revision",
    "country_seal_version"
  ]) assert.match(sql, new RegExp(column, "i"));
  assert.match(sql, /CLIENT_AUTHORITY_FIELDS_DENIED/);
});

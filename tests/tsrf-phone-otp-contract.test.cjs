"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const edgePath = path.join(root, "supabase", "functions", "phone-verification", "index.ts");
const edge = fs.readFileSync(edgePath, "utf8");
const migrationDir = path.join(root, "supabase", "migrations");
const migrations = fs
  .readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, sql: fs.readFileSync(path.join(migrationDir, name), "utf8") }));
const otpMigration = migrations.find(({ sql }) => /\bphone_otp_challenges\b/i.test(sql));

test("sovereign OTP uses an explicit origin allowlist and never wildcard CORS", () => {
  assert.doesNotMatch(edge, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/i);
  assert.match(edge, /OTP_ALLOWED_ORIGINS/);
  assert.match(edge, /\bOrigin\b/);
});

test("OTP START is server-authoritative while VERIFY accepts only user-entered verification code", () => {
  assert.match(edge, /(?:action|operation)\??\s*:\s*(?:string|["']start["'])/i);
  assert.match(edge, /["']start["']/i);
  assert.match(edge, /["']verify["']/i);
  assert.match(edge, /challenge_id|challengeId/);
  assert.match(edge, /purpose/);
  assert.doesNotMatch(edge, /Expected phone and code/i);
});

test("OTP generation and verification are cryptographic and plaintext is not persisted", () => {
  assert.match(edge, /crypto\.getRandomValues/);
  assert.match(edge, /OTP_HMAC_SECRET/);
  assert.match(edge, /HMAC/i);
  assert.match(edge, /SHA-256/i);
  assert.doesNotMatch(edge, /insert\([^)]*\bcode\b/i);
  assert.doesNotMatch(edge, /console\.(?:log|info|debug)\([^)]*\bcode\b/i);
});

test("canonical phone_otp_challenges storage exists and is service-only fail-closed", () => {
  assert.ok(otpMigration, "expected a canonical phone_otp_challenges migration");
  const sql = otpMigration.sql;
  assert.match(sql, /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.phone_otp_challenges\b/i);
  assert.match(sql, /enable\s+row\s+level\s+security/i);
  assert.match(sql, /force\s+row\s+level\s+security/i);
  assert.match(sql, /revoke\s+all[\s\S]*?from\s+anon\s*,\s*authenticated/i);
  assert.match(sql, /grant[\s\S]*?to\s+service_role/i);
  assert.match(sql, /code_digest/i);
  assert.match(sql, /expires_at/i);
  assert.match(sql, /attempt/i);
  assert.match(sql, /consumed_at/i);
});

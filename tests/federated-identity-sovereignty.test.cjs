"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT, "project-control/security/federated-identity-policy.v1.json");
const ADR_PATH = path.join(ROOT, "docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md");
const GAP_PATH = path.join(ROOT, "docs/security/FEDERATED_IDENTITY_KNOWN_GAP_20260808.md");
const REMOVAL_PATH = path.join(ROOT, "docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md");

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const output = [];
  for (const name of fs.readdirSync(target)) {
    const full = path.join(target, name);
    const child = fs.statSync(full);
    if (child.isDirectory()) output.push(...collectFiles(full));
    else output.push(full);
  }
  return output;
}

test("federated identity policy is binding and passwordless by architecture", () => {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
  assert.equal(policy.schema, "VVIP-IDENTITY-1");
  assert.equal(policy.status, "BINDING");
  assert.equal(policy.authentication_model, "FEDERATED_IDENTITY_ONLY");
  assert.equal(policy.local_password_auth_allowed, false);
  assert.equal(policy.local_password_collection_allowed, false);
  assert.equal(policy.local_password_recovery_allowed, false);
  assert.equal(policy.local_password_hash_storage_allowed, false);
  assert.equal(policy.supabase_password_auth_allowed, false);
  assert.equal(policy.delegated_recovery_required, true);
  assert.equal(policy.identity_anchor.primary_key, "ISSUER_PLUS_EXTERNAL_SUBJECT");
  assert.equal(policy.identity_anchor.email_is_primary_key, false);
  assert.equal(policy.identity_anchor.auto_link_by_email_allowed, false);
  assert.deepEqual(policy.protocols.authentication, ["OIDC"]);
  assert.equal(policy.token_policy.browser_provider_secret_allowed, false);
  assert.equal(policy.token_policy.token_logging_allowed, false);
  assert.equal(policy.data_layer.rls_required, true);
  assert.equal(policy.data_layer.parallel_supabase_user_password_system_allowed, false);
});

test("binding ADR and known compatibility gap are recorded", () => {
  const adr = fs.readFileSync(ADR_PATH, "utf8");
  const gap = fs.readFileSync(GAP_PATH, "utf8");
  const removal = fs.readFileSync(REMOVAL_PATH, "utf8");
  assert.match(adr, /Status:\*\* ACCEPTED \/ BINDING/);
  assert.match(adr, /account_identity = \(issuer, subject\)/);
  assert.match(adr, /No automatic account linking by email/);
  assert.match(adr, /Supabase email\/password authentication must not become a second user credential system/);
  assert.match(gap, /legacy_profile_recovered/);
  assert.match(gap, /identity_migration_required/);
  assert.match(gap, /PRODUCTION_IDENTITY_LAUNCH=BLOCKED_ON_REMEDIATION/);
  assert.match(removal, /LEGACY_PASSWORD_RUNTIME=REMOVED/);
  assert.match(removal, /LOCAL_PASSWORD_RECOVERY=REMOVED/);
});

test("retired first-party password and recovery runtimes remain absent", () => {
  for (const relative of [
    "auth.js",
    "auth-supabase.js",
    "scripts/supabase-auth-bridge.js",
    "reset-password.js"
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, `${relative} must remain retired`);
  }
});

test("legacy reset URL is a provider-recovery compatibility redirect only", () => {
  const html = fs.readFileSync(path.join(ROOT, "reset-password.html"), "utf8");
  assert.match(html, /index\.html\?recovery=provider/);
  assert.doesNotMatch(html, /firebase/i);
  assert.doesNotMatch(html, /sendPasswordResetEmail/);
  assert.doesNotMatch(html, /id=["']reset-form["']/i);
  assert.doesNotMatch(html, /type=["']password["']/i);
});

test("legacy PWA cache cannot serve the retired recovery runtime", () => {
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.doesNotMatch(sw, /["']\/reset-password\.js["']/);
  assert.match(sw, /["']\/reset-password\.html["']/);
});

test("owned runtime code contains no first-party password authentication path", () => {
  const rootIdentityFiles = fs.readdirSync(ROOT)
    .filter((name) => /^(?:auth(?:[-.].*)?|reset-password)\.(?:js|html)$/i.test(name))
    .map((name) => path.join(ROOT, name));

  const candidates = [
    ...collectFiles(path.join(ROOT, "scripts")),
    ...collectFiles(path.join(ROOT, "app")),
    ...collectFiles(path.join(ROOT, "supabase/functions")),
    ...rootIdentityFiles
  ].filter((file) => /\.(?:c?js|mjs|ts|tsx|html)$/i.test(file));

  const forbidden = [
    { label: "Supabase password sign-in", re: /\.auth\.signInWithPassword\s*\(/ },
    { label: "Supabase password reset", re: /\.auth\.resetPasswordForEmail\s*\(/ },
    { label: "Supabase local sign-up", re: /\.auth\.signUp\s*\(/ },
    { label: "Firebase password sign-in", re: /signInWithEmailAndPassword\s*\(/ },
    { label: "Firebase password reset", re: /sendPasswordResetEmail\s*\(/ },
    { label: "password hash field", re: /\bpassword_hash\b/i },
    { label: "bcrypt credential hashing", re: /\bbcrypt\b/i },
    { label: "argon2 credential hashing", re: /\bargon2\b/i },
    { label: "first-party password input", re: /type\s*=\s*["']password["']/i }
  ];

  const violations = [];
  for (const file of candidates) {
    const text = fs.readFileSync(file, "utf8");
    for (const rule of forbidden) {
      if (rule.re.test(text)) {
        violations.push(`${path.relative(ROOT, file)}: ${rule.label}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("current browser identity bridge uses external session tokens without Supabase session persistence", () => {
  const loader = fs.readFileSync(path.join(ROOT, "scripts/runtime/vvip-runtime-loader.js"), "utf8");
  const profileIdentity = fs.readFileSync(path.join(ROOT, "scripts/vvip-p03-profile-identity.js"), "utf8");

  assert.match(loader, /root\.Clerk\.session/);
  assert.match(loader, /session\.getToken\(\)/);
  assert.match(loader, /persistSession: false/);
  assert.match(loader, /autoRefreshToken: false/);
  assert.match(profileIdentity, /session\.getToken\(\)/);
});

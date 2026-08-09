"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-authorization-envelope.js")
).href;

async function loadEnvelope() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const NOW = "2026-08-05T12:01:00.000Z";

function trustedInput(overrides = {}) {
  return {
    envelopeId: "authz_env_authorization_001",
    actorId: "user-owner-001",
    authorityClass: "OWNER_ROOT",
    roleIds: ["platform_admin", "owner"],
    permissionIds: ["country.operation.execute", "country.governance.read"],
    effectiveAssignmentIds: ["assignment-2", "assignment-1"],
    scope: { level: "platform" },
    activeMarketCountry: "JO",
    countrySealVersion: "seal-jo-v1",
    policyVersion: "V13.1",
    assignmentRevision: 1,
    sessionIssuedAt: "2026-08-05T12:00:00.000Z",
    issuedAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-08-05T12:05:00.000Z",
    correlationId: "corr_authorization_001",
    ...overrides
  };
}

function trustedState(overrides = {}) {
  return {
    actorId: "user-owner-001",
    accountState: "active",
    sessionValidAfter: "2026-08-05T11:59:00.000Z",
    assignmentRevision: 1,
    policyVersion: "V13.1",
    country: {
      code: "JO",
      state: "ACTIVE",
      sealStatus: "VALID",
      sealVersion: "seal-jo-v1"
    },
    ...overrides
  };
}

function validate(module, envelope, options = {}) {
  return module.validateAuthorizationEnvelope({
    envelope,
    trustedState: trustedState(options.trustedState),
    resource: options.resource || { scope: { level: "country", countryCode: "JO" }, countryCode: "JO" },
    operation: options.operation || { kind: "governance", permission: "country.governance.read" },
    now: options.now || NOW
  });
}

test("client-authored authority fields are denied", async () => {
  const { rejectClientAuthorityFields } = await loadEnvelope();
  assert.deepEqual(rejectClientAuthorityFields({ authorityClass: "OWNER_ROOT" }), {
    ok: false,
    code: "CLIENT_AUTHORITY_FIELDS_DENIED"
  });
  assert.deepEqual(rejectClientAuthorityFields({ title: "safe" }), { ok: true, code: "OK" });
});

test("trusted envelope creation sorts arrays and deeply freezes output", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput());
  assert.deepEqual([...envelope.roleIds], ["owner", "platform_admin"]);
  assert.deepEqual([...envelope.permissionIds], ["country.governance.read", "country.operation.execute"]);
  assert.deepEqual([...envelope.effectiveAssignmentIds], ["assignment-1", "assignment-2"]);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(Object.isFrozen(envelope.scope), true);
  assert.equal(Object.isFrozen(envelope.roleIds), true);
});

test("envelopes longer than five minutes are rejected", async () => {
  const { createAuthorizationEnvelope } = await loadEnvelope();
  assert.throws(
    () => createAuthorizationEnvelope(trustedInput({ expiresAt: "2026-08-05T12:05:01.000Z" })),
    (error) => error?.code === "MALFORMED_ENVELOPE"
  );
});

test("expired stale revision and stale policy envelopes fail closed", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput());
  assert.equal(validate(module, envelope, { now: "2026-08-05T12:05:00.000Z" }).code, "ENVELOPE_EXPIRED");
  assert.equal(validate(module, envelope, { trustedState: { assignmentRevision: 2 } }).code, "STALE_AUTHORIZATION_ENVELOPE");
  assert.equal(validate(module, envelope, { trustedState: { policyVersion: "V13.2" } }).code, "STALE_AUTHORIZATION_ENVELOPE");
});

test("an envelope carrying a non-V13.1 policy is stale rather than malformed", async () => {
  const module = await loadEnvelope();
  const envelope = { ...module.createAuthorizationEnvelope(trustedInput()), policyVersion: "V13.0" };
  assert.equal(validate(module, envelope).code, "STALE_AUTHORIZATION_ENVELOPE");
});

test("session invalidation and inactive identity are denied before permissions", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput());
  assert.equal(validate(module, envelope, { trustedState: { sessionValidAfter: "2026-08-05T12:00:01.000Z" } }).code, "SESSION_INVALIDATED");
  assert.equal(validate(module, envelope, { trustedState: { accountState: "suspended" } }).code, "IDENTITY_DENIED");
});

test("country-local resources require matching scope", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput({
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    scope: { level: "country", countryCode: "JO" }
  }));
  assert.equal(validate(module, envelope, {
    resource: { scope: { level: "country", countryCode: "AE" }, countryCode: "AE" }
  }).code, "COUNTRY_SCOPE_MISMATCH");
});

test("operational actions require active country and exact valid seal", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput());
  const operation = { kind: "operational", permission: "country.operation.execute" };
  assert.equal(validate(module, envelope, { operation, trustedState: { country: { code: "JO", state: "DRAFT", sealStatus: "VALID", sealVersion: "seal-jo-v1" } } }).code, "COUNTRY_SEAL_REQUIRED");
  assert.equal(validate(module, envelope, { operation, trustedState: { country: { code: "JO", state: "ACTIVE", sealStatus: "VALID", sealVersion: "seal-jo-v2" } } }).code, "COUNTRY_SEAL_REQUIRED");
  assert.equal(validate(module, envelope, { operation }).code, "AUTHORIZED");
});

test("missing permission is denied", async () => {
  const module = await loadEnvelope();
  const envelope = module.createAuthorizationEnvelope(trustedInput({ permissionIds: ["country.governance.read"] }));
  assert.equal(validate(module, envelope, {
    operation: { kind: "operational", permission: "country.operation.execute" }
  }).code, "PERMISSION_DENIED");
});

test("active market changes never grant authorization and decisions are deterministic", async () => {
  const module = await loadEnvelope();
  const base = module.createAuthorizationEnvelope(trustedInput({
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    scope: { level: "country", countryCode: "AE" },
    activeMarketCountry: "JO"
  }));
  const changed = module.createAuthorizationEnvelope(trustedInput({
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    scope: { level: "country", countryCode: "AE" },
    activeMarketCountry: "AE"
  }));
  const first = validate(module, base);
  const second = validate(module, changed);
  assert.equal(first.code, "COUNTRY_SCOPE_MISMATCH");
  assert.equal(second.code, "COUNTRY_SCOPE_MISMATCH");
  assert.deepEqual(validate(module, base), first);
});

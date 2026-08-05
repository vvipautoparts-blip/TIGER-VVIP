"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-authority-contracts.js")
).href;

async function loadContracts() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

test("authority catalogs are exact, unique, and frozen", async () => {
  const contracts = await loadContracts();

  assert.deepEqual(
    [...contracts.AUTHORITY_CLASSES],
    ["OWNER_ROOT", "PARTNER_GLOBAL_ADMIN", "DELEGATED"]
  );
  assert.deepEqual(
    [...contracts.SCOPE_LEVELS],
    ["platform", "country", "sector", "region", "area", "team"]
  );
  assert.equal(new Set(contracts.ROLE_IDS).size, contracts.ROLE_IDS.length);
  assert.equal(new Set(contracts.PERMISSION_IDS).size, contracts.PERMISSION_IDS.length);
  assert.equal(Object.isFrozen(contracts.AUTHORITY_CLASSES), true);
  assert.equal(Object.isFrozen(contracts.ROLE_IDS), true);
  assert.equal(Object.isFrozen(contracts.PERMISSION_IDS), true);
  assert.equal(Object.isFrozen(contracts.SCOPE_LEVELS), true);
  assert.equal(Object.isFrozen(contracts.ROLE_RANK), true);
  assert.equal(Object.isFrozen(contracts.ERROR_CODES), true);
  assert.equal(Object.isFrozen(contracts.LIMITS), true);
});

test("authority hierarchy preserves immutable owner and global partner order", async () => {
  const { ROLE_IDS, ROLE_RANK } = await loadContracts();

  assert.ok(ROLE_IDS.includes("owner"));
  assert.ok(ROLE_IDS.includes("partner"));
  assert.ok(ROLE_IDS.includes("country_admin"));
  assert.ok(ROLE_RANK.owner > ROLE_RANK.partner);
  assert.ok(ROLE_RANK.partner > ROLE_RANK.platform_admin);
  assert.ok(ROLE_RANK.platform_admin > ROLE_RANK.country_admin);
  assert.ok(ROLE_RANK.country_admin > ROLE_RANK.sector_manager);
});

test("canonical authority permissions are present", async () => {
  const { PERMISSION_IDS } = await loadContracts();

  for (const permission of [
    "authorization.assignment.read",
    "authorization.assignment.manage",
    "authorization.permission.delegate",
    "authorization.partner.manage",
    "authorization.audit.read",
    "country.governance.read",
    "country.governance.manage",
    "country.operation.execute"
  ]) {
    assert.ok(PERMISSION_IDS.includes(permission), permission);
  }
});

test("stable authorization errors are exported without aliases", async () => {
  const { ERROR_CODES } = await loadContracts();

  for (const code of [
    "OWNER_ROOT_IMMUTABLE",
    "PEER_PARTNER_MUTATION_DENIED",
    "CLIENT_AUTHORITY_FIELDS_DENIED",
    "STALE_AUTHORIZATION_ENVELOPE",
    "COUNTRY_SCOPE_MISMATCH",
    "COUNTRY_SEAL_REQUIRED",
    "SCOPE_ESCALATION_DENIED",
    "SELF_ELEVATION_DENIED",
    "UNOWNED_PERMISSION_DENIED",
    "DELEGATION_AUTHORITY_EXCEEDED",
    "CONFIGURATION_REQUIRED",
    "OFFLINE_PRIVILEGED_DENIED",
    "REMOTE_CONFIRMATION_REQUIRED",
    "REMOTE_ENFORCEMENT_FAILED"
  ]) {
    assert.equal(ERROR_CODES[code], code);
  }
});

test("identifier and TTL limits are deterministic", async () => {
  const { LIMITS, isStableIdentifier } = await loadContracts();

  assert.equal(LIMITS.ENVELOPE_TTL_SECONDS, 300);
  assert.equal(LIMITS.IDENTIFIER, 128);
  assert.equal(LIMITS.REASON, 500);
  assert.equal(isStableIdentifier("corr_authorization_001", "corr_"), true);
  assert.equal(isStableIdentifier("idem_authorization_001", "idem_"), true);
  assert.equal(isStableIdentifier("corr_bad space", "corr_"), false);
  assert.equal(isStableIdentifier("wrong_authorization_001", "corr_"), false);
});

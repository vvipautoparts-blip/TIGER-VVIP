"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-delegation-policy.js")
).href;

async function loadPolicy() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function partnerActor(overrides = {}) {
  return {
    id: "partner-1",
    accountState: "active",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    permissionIds: [
      "authorization.assignment.manage",
      "authorization.permission.delegate",
      "country.governance.read",
      "country.governance.manage",
      "country.operation.execute"
    ],
    effectiveAssignmentIds: ["partner-membership-1"],
    scope: { level: "platform" },
    ...overrides
  };
}

function ownerActor(overrides = {}) {
  return {
    id: "owner-1",
    accountState: "active",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: [
      "authorization.assignment.manage",
      "authorization.permission.delegate",
      "authorization.partner.manage",
      "country.governance.read",
      "country.governance.manage",
      "country.operation.execute"
    ],
    effectiveAssignmentIds: ["owner-root-1"],
    scope: { level: "platform" },
    ...overrides
  };
}

function request(overrides = {}) {
  return {
    actor: partnerActor(),
    target: { actorId: "staff-1", authorityClass: "DELEGATED", roleId: "country_admin" },
    requestedPermissionIds: ["country.governance.read"],
    requestedScope: { level: "country", countryCode: "AE" },
    ...overrides
  };
}

test("ordinary assignment APIs cannot target owner root", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  const decision = canDelegateAuthority(request({
    target: { actorId: "owner-1", authorityClass: "OWNER_ROOT", roleId: "owner" }
  }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "OWNER_ROOT_IMMUTABLE");
});

test("partners cannot create or mutate another partner", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  const decision = canDelegateAuthority(request({
    target: { actorId: "partner-2", authorityClass: "PARTNER_GLOBAL_ADMIN", roleId: "partner" }
  }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "PEER_PARTNER_MUTATION_DENIED");
});

test("self elevation is denied after immutable target checks", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  assert.equal(canDelegateAuthority(request({
    target: { actorId: "partner-1", authorityClass: "DELEGATED", roleId: "platform_admin" }
  })).code, "SELF_ELEVATION_DENIED");
});

test("delegated actors need explicit delegation permission", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  const actor = {
    id: "country-admin-1",
    accountState: "active",
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    permissionIds: ["country.governance.read"],
    effectiveAssignmentIds: ["assignment-country-admin-1"],
    scope: { level: "country", countryCode: "JO" }
  };
  const decision = canDelegateAuthority(request({
    actor,
    target: { actorId: "sector-manager-1", authorityClass: "DELEGATED", roleId: "sector_manager" },
    requestedPermissionIds: ["country.governance.read"],
    requestedScope: { level: "sector", countryCode: "JO", sectorId: "vehicles" }
  }));
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "PERMISSION_DENIED");
});

test("partner can manage lower roles globally across countries", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  const jordan = canDelegateAuthority(request({ requestedScope: { level: "country", countryCode: "JO" } }));
  const emirates = canDelegateAuthority(request({ requestedScope: { level: "country", countryCode: "AE" } }));
  assert.equal(jordan.code, "AUTHORIZED");
  assert.equal(emirates.code, "AUTHORIZED");
});

test("unowned permissions rank equality and scope escalation are denied", async () => {
  const { canDelegateAuthority } = await loadPolicy();
  assert.equal(canDelegateAuthority(request({ requestedPermissionIds: ["authorization.partner.manage"] })).code,
    "UNOWNED_PERMISSION_DENIED");
  assert.equal(canDelegateAuthority(request({
    target: { actorId: "staff-1", authorityClass: "DELEGATED", roleId: "partner" }
  })).code, "PEER_PARTNER_MUTATION_DENIED");
  assert.equal(canDelegateAuthority(request({
    actor: partnerActor({ authorityClass: "DELEGATED", roleIds: ["country_admin"], scope: { level: "country", countryCode: "JO" } }),
    target: { actorId: "staff-1", authorityClass: "DELEGATED", roleId: "sector_manager" },
    requestedScope: { level: "country", countryCode: "AE" }
  })).code, "SCOPE_ESCALATION_DENIED");
});

test("protected operations reuse envelope validation so partner governance is global but operations remain sealed", async () => {
  const { authorizeProtectedOperation } = await loadPolicy();
  const envelopeBase = {
    envelopeId: "authz_env_partner_001",
    actorId: "partner-1",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    permissionIds: ["country.governance.read", "country.operation.execute"],
    effectiveAssignmentIds: ["partner-membership-1"],
    scope: { level: "platform" },
    activeMarketCountry: "JO",
    countrySealVersion: "seal-ae-v1",
    policyVersion: "V13.1",
    assignmentRevision: 3,
    sessionIssuedAt: "2026-08-05T12:00:00.000Z",
    issuedAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-08-05T12:05:00.000Z",
    correlationId: "corr_partner_authz_001"
  };
  const trustedState = {
    actorId: "partner-1",
    accountState: "active",
    sessionValidAfter: "2026-08-05T11:59:00.000Z",
    assignmentRevision: 3,
    policyVersion: "V13.1",
    country: { code: "AE", state: "DRAFT", sealStatus: "VALID", sealVersion: "seal-ae-v1" }
  };
  const resource = { scope: { level: "country", countryCode: "AE" }, countryCode: "AE" };
  const governance = authorizeProtectedOperation({
    envelope: envelopeBase,
    trustedState,
    resource,
    operation: { kind: "governance", permission: "country.governance.read" },
    now: "2026-08-05T12:01:00.000Z"
  });
  const operation = authorizeProtectedOperation({
    envelope: envelopeBase,
    trustedState,
    resource,
    operation: { kind: "operational", permission: "country.operation.execute" },
    now: "2026-08-05T12:01:00.000Z"
  });
  assert.equal(governance.code, "AUTHORIZED");
  assert.equal(operation.code, "COUNTRY_SEAL_REQUIRED");
});

test("partner membership commands require owner root legal reference and trusted enforcement", async () => {
  const { validatePartnerMembershipCommand } = await loadPolicy();
  const command = {
    subjectId: "partner-2",
    reason: "Approved ownership governance change",
    legalDecisionReference: "legal-decision-2026-001"
  };
  const context = {
    actor: ownerActor(),
    online: true,
    trustedEnforcement: true,
    correlationKey: "corr_partner_membership_001",
    idempotencyKey: "idem_partner_membership_001"
  };
  assert.equal(validatePartnerMembershipCommand(command, context).code, "OK");
  assert.equal(validatePartnerMembershipCommand(command, { ...context, actor: partnerActor() }).code,
    "PEER_PARTNER_MUTATION_DENIED");
  assert.equal(validatePartnerMembershipCommand({ ...command, legalDecisionReference: "" }, context).code,
    "LEGAL_DECISION_REFERENCE_REQUIRED");
  assert.equal(validatePartnerMembershipCommand(command, { ...context, trustedEnforcement: false }).code,
    "TRUSTED_ENFORCEMENT_REQUIRED");
});

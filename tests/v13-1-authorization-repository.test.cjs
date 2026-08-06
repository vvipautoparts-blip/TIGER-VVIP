"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-authorization-repository.js")
).href;

async function loadRepository() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

const NOW = "2026-08-05T12:01:00.000Z";

function ownerActor(overrides = {}) {
  return {
    id: "owner-1",
    accountState: "active",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: [
      "authorization.assignment.read",
      "authorization.assignment.manage",
      "authorization.permission.delegate",
      "authorization.partner.manage",
      "authorization.audit.read",
      "country.governance.read",
      "country.governance.manage",
      "country.operation.execute"
    ],
    effectiveAssignmentIds: ["owner-root-1"],
    scope: { level: "platform" },
    ...overrides
  };
}

function partnerActor(overrides = {}) {
  return {
    id: "partner-1",
    accountState: "active",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    permissionIds: [
      "authorization.assignment.read",
      "authorization.assignment.manage",
      "authorization.permission.delegate",
      "authorization.audit.read",
      "country.governance.read",
      "country.governance.manage",
      "country.operation.execute"
    ],
    effectiveAssignmentIds: ["partner-membership-1"],
    scope: { level: "platform" },
    ...overrides
  };
}

function assignmentCommand(overrides = {}) {
  return {
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    startsAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-09-05T12:00:00.000Z",
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    actor: ownerActor(),
    now: NOW,
    reason: "Approved delegated administration",
    correlationKey: "corr_assignment_create_001",
    idempotencyKey: "idem_assignment_create_001",
    online: true,
    trustedEnforcement: true,
    ...overrides
  };
}

test("volatile repository labels persistence honestly and replays successful idempotent commands exactly", async () => {
  const { createVolatileAuthorizationRepository } = await loadRepository();
  const repository = createVolatileAuthorizationRepository({ clock: () => NOW });
  const first = await repository.createAssignment(assignmentCommand(), context());
  const second = await repository.createAssignment(assignmentCommand(), context());
  assert.equal(first.ok, true);
  assert.equal(first.receipt.persistence, "volatile");
  assert.deepEqual(second, first);
  const listed = await repository.listAssignments({}, { actor: ownerActor(), now: NOW });
  assert.equal(listed.items.length, 1);
});

test("idempotency key reuse with a different command is rejected", async () => {
  const { createVolatileAuthorizationRepository } = await loadRepository();
  const repository = createVolatileAuthorizationRepository({ clock: () => NOW });
  await repository.createAssignment(assignmentCommand(), context());
  const conflict = await repository.createAssignment(
    assignmentCommand({ subjectId: "staff-2" }),
    context()
  );
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
});

test("ordinary assignment methods cannot create owner or partner authority", async () => {
  const { createVolatileAuthorizationRepository } = await loadRepository();
  const repository = createVolatileAuthorizationRepository({ clock: () => NOW });
  const owner = await repository.createAssignment(assignmentCommand({
    subjectId: "owner-2",
    authorityClass: "OWNER_ROOT",
    roleId: "owner"
  }), context({ idempotencyKey: "idem_owner_create_001" }));
  const partner = await repository.createAssignment(assignmentCommand({
    subjectId: "partner-2",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleId: "partner"
  }), context({ idempotencyKey: "idem_partner_create_001" }));
  assert.equal(owner.code, "OWNER_ROOT_IMMUTABLE");
  assert.equal(partner.code, "PEER_PARTNER_MUTATION_DENIED");
});

test("authorization audits are append-only hash-linked frozen projections", async () => {
  const { createVolatileAuthorizationRepository } = await loadRepository();
  const repository = createVolatileAuthorizationRepository({ clock: () => NOW });
  await repository.createAssignment(assignmentCommand(), context());
  await repository.createAssignment(
    assignmentCommand({ subjectId: "staff-2" }),
    context({
      correlationKey: "corr_assignment_create_002",
      idempotencyKey: "idem_assignment_create_002"
    })
  );
  const audits = await repository.listAuditEvents({}, { actor: ownerActor(), now: NOW });
  assert.equal(audits.items.length, 2);
  assert.equal(audits.items[1].previousHash, audits.items[0].hash);
  assert.equal(Object.isFrozen(audits.items[0]), true);
  assert.equal("updateAuditEvent" in repository, false);
  assert.equal("deleteAuditEvent" in repository, false);
});

test("partner membership is available only through the dedicated owner-root command", async () => {
  const { createVolatileAuthorizationRepository } = await loadRepository();
  const repository = createVolatileAuthorizationRepository({ clock: () => NOW });
  const command = {
    subjectId: "partner-2",
    reason: "Approved ownership governance change",
    legalDecisionReference: "legal-decision-2026-001"
  };
  const ownerContext = context({
    reason: command.reason,
    correlationKey: "corr_partner_membership_001",
    idempotencyKey: "idem_partner_membership_001"
  });
  const created = await repository.createPartnerMembership(command, ownerContext);
  const denied = await repository.createPartnerMembership(command, {
    ...ownerContext,
    actor: partnerActor(),
    idempotencyKey: "idem_partner_membership_002"
  });
  assert.equal(created.code, "PARTNER_MEMBERSHIP_CREATED");
  assert.equal(created.data.authorityClass, "PARTNER_GLOBAL_ADMIN");
  assert.equal(denied.code, "PEER_PARTNER_MUTATION_DENIED");
});

test("remote repository fails closed for missing configuration offline state and unconfirmed writes", async () => {
  const { createRemoteAuthorizationRepository } = await loadRepository();
  const missing = createRemoteAuthorizationRepository();
  assert.equal((await missing.createAssignment({}, {})).code, "CONFIGURATION_REQUIRED");

  const offline = createRemoteAuthorizationRepository({
    verified: true,
    online: () => false,
    envelopeVerifier: () => ({ allowed: true, code: "AUTHORIZED" }),
    transport: async () => ({ ok: true, code: "ASSIGNMENT_CREATED", receipt: { confirmed: true } })
  });
  assert.equal((await offline.createAssignment({}, { envelope: {} })).code, "OFFLINE_PRIVILEGED_DENIED");

  const unconfirmed = createRemoteAuthorizationRepository({
    verified: true,
    online: () => true,
    envelopeVerifier: () => ({ allowed: true, code: "AUTHORIZED" }),
    transport: async () => ({ ok: true, code: "ASSIGNMENT_CREATED", receipt: { confirmed: false } })
  });
  assert.equal((await unconfirmed.createAssignment({}, { envelope: {} })).code, "REMOTE_CONFIRMATION_REQUIRED");
});

test("remote repository exposes success only after verified envelope and confirmed persistence", async () => {
  const { createRemoteAuthorizationRepository } = await loadRepository();
  let calls = 0;
  const repository = createRemoteAuthorizationRepository({
    verified: true,
    online: () => true,
    envelopeVerifier: () => ({ allowed: true, code: "AUTHORIZED" }),
    transport: async (request) => {
      calls += 1;
      assert.equal(request.operation, "createAssignment");
      return {
        ok: true,
        code: "ASSIGNMENT_CREATED",
        data: { id: "assignment-remote-1" },
        receipt: { confirmed: true, persistence: "remote" }
      };
    }
  });
  const result = await repository.createAssignment({ subjectId: "staff-1" }, { envelope: { envelopeId: "authz_env_remote_001" } });
  assert.equal(result.ok, true);
  assert.equal(result.receipt.persistence, "remote");
  assert.equal(calls, 1);
  assert.equal("queuedCommands" in repository, false);
});

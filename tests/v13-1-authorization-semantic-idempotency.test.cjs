"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-server-command-handler.js")
).href;
const NOW = "2026-08-05T12:01:00.000Z";

async function loadModule() {
  return import(`${moduleUrl}?semantic=${Date.now()}-${Math.random()}`);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function permissions() {
  return [
    "authorization.assignment.read",
    "authorization.assignment.manage",
    "authorization.permission.delegate",
    "authorization.partner.manage",
    "authorization.audit.read",
    "country.governance.read",
    "country.governance.manage",
    "country.operation.execute"
  ];
}

function envelope(overrides = {}) {
  return {
    envelopeId: "authz_env_semantic_0001",
    actorId: "owner-1",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: permissions(),
    effectiveAssignmentIds: ["owner-root-0001"],
    scope: { level: "platform" },
    activeMarketCountry: null,
    countrySealVersion: null,
    policyVersion: "V13.1",
    assignmentRevision: 3,
    sessionIssuedAt: "2026-08-05T11:59:00.000Z",
    issuedAt: "2026-08-05T12:00:00.000Z",
    expiresAt: "2026-08-05T12:05:00.000Z",
    correlationId: "corr_semantic_envelope_0001",
    ...overrides
  };
}

function trustedState() {
  return {
    actorId: "owner-1",
    accountState: "active",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: permissions(),
    effectiveAssignmentIds: ["owner-root-0001"],
    scope: { level: "platform" },
    sessionValidAfter: "2026-08-05T11:00:00.000Z",
    policyVersion: "V13.1",
    assignmentRevision: 3,
    country: null
  };
}

function mutationRequest(overrides = {}) {
  return {
    operation: "suspendAssignment",
    command: { assignmentId: "assignment-0001" },
    envelope: envelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_semantic_first_0001",
    idempotencyKey: "idem_semantic_mutation_0001",
    reason: "Suspend delegated authority after governance review",
    resource: {
      scope: { level: "country", countryCode: " jo " },
      countryCode: " jo "
    },
    ...overrides
  };
}

function createRequest(overrides = {}) {
  return {
    operation: "createAssignment",
    command: {
      subjectId: "staff-2",
      roleId: "country_admin",
      requestedPermissionIds: [
        "country.governance.manage",
        "country.governance.read"
      ],
      scope: { level: "country", countryCode: " jo " },
      startsAt: "2026-08-05T12:00:00.000Z",
      expiresAt: "2026-09-05T12:00:00.000Z"
    },
    envelope: envelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_semantic_create_first_0001",
    idempotencyKey: "idem_semantic_create_0001",
    reason: "Create delegated country administration",
    resource: {
      scope: { level: "country", countryCode: " jo " },
      countryCode: " jo "
    },
    ...overrides
  };
}

function trustedTarget(id = "assignment-0001") {
  return {
    id,
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active"
  };
}

function transactionHarness() {
  const calls = [];
  const receipts = new Map();
  const tx = {
    async findIdempotencyReceipt(idempotencyKey) {
      calls.push(`find:${idempotencyKey}`);
      return receipts.get(idempotencyKey) || null;
    },
    async loadAuthorizationTarget({ targetId }) {
      calls.push(`load:${targetId}`);
      return trustedTarget(targetId);
    },
    async persistAuthorizationCommand(input) {
      calls.push(`persist:${input.operation}`);
      return {
        id: input.operation === "createAssignment"
          ? "assignment-created-0002"
          : input.command.assignmentId,
        state: input.operation === "createAssignment" ? "active" : "suspended",
        authorityClass: "DELEGATED"
      };
    },
    async appendAuthorizationAudit(input) {
      calls.push(`audit:${input.operation}`);
      return { auditHash: "c".repeat(64) };
    },
    async storeIdempotencyReceipt(input) {
      calls.push(`store:${input.idempotencyKey}`);
      receipts.set(input.idempotencyKey, {
        requestHash: input.requestHash,
        result: input.result
      });
      return { stored: true };
    }
  };
  return {
    calls,
    runTransaction: async (work) => ({ committed: true, value: await work(tx) })
  };
}

async function createHandler(runTransaction, digestSha256 = sha256) {
  const { createAuthorizationServerCommandHandler } = await loadModule();
  return createAuthorizationServerCommandHandler({
    loadTrustedState: async () => trustedState(),
    runTransaction,
    clock: () => NOW,
    digestSha256
  });
}

test("semantic hash projection is versioned normalized and excludes transport keys", async () => {
  const transaction = transactionHarness();
  let projection = null;
  const handler = await createHandler(transaction.runTransaction, (canonicalJson) => {
    projection = JSON.parse(canonicalJson);
    return sha256(canonicalJson);
  });

  const result = await handler.execute(mutationRequest());
  assert.equal(result.ok, true);
  assert.deepEqual(projection.contract, {
    name: "V13.1_AUTHORIZATION_COMMAND",
    version: 1
  });
  assert.equal(projection.operationContractVersion, 1);
  assert.equal("correlationKey" in projection, false);
  assert.equal("idempotencyKey" in projection, false);
  assert.deepEqual(projection.resource, {
    countryCode: "JO",
    scope: { level: "country", countryCode: "JO" }
  });
  assert.deepEqual(projection.authorityContext, {
    assignmentRevision: 3,
    authorityClass: "OWNER_ROOT",
    countrySealVersion: null,
    effectiveAssignmentIds: ["owner-root-0001"],
    permissionIds: [...permissions()].sort(),
    policyVersion: "V13.1",
    roleIds: ["owner"],
    scope: { level: "platform" }
  });
});

test("tracking changes equivalent scope formatting and ignored mutation fields replay exactly", async () => {
  const transaction = transactionHarness();
  const handler = await createHandler(transaction.runTransaction);

  const first = await handler.execute(mutationRequest({
    command: {
      assignmentId: "assignment-0001",
      roleId: "owner",
      permissionIds: ["authorization.owner.manage"],
      scope: { level: "platform" }
    }
  }));
  const replay = await handler.execute(mutationRequest({
    correlationKey: "corr_semantic_second_0001",
    command: {
      assignmentId: "assignment-0001",
      roleId: "partner",
      permissionIds: ["authorization.partner.manage"],
      scope: { level: "team", countryCode: "US", teamId: "attacker-team" }
    },
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    }
  }));

  assert.equal(first.ok, true);
  assert.deepEqual(replay, first);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("persist:")).length, 1);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("audit:")).length, 1);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("load:")).length, 1);
});

test("create permission order and equivalent scope formatting share one semantic receipt", async () => {
  const transaction = transactionHarness();
  const handler = await createHandler(transaction.runTransaction);

  const first = await handler.execute(createRequest());
  const replay = await handler.execute(createRequest({
    correlationKey: "corr_semantic_create_second_0001",
    command: {
      subjectId: "staff-2",
      roleId: "country_admin",
      requestedPermissionIds: [
        "country.governance.read",
        "country.governance.manage"
      ],
      scope: { level: "country", countryCode: "JO" },
      startsAt: "2026-08-05T12:00:00.000Z",
      expiresAt: "2026-09-05T12:00:00.000Z"
    },
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    }
  }));

  assert.equal(first.ok, true);
  assert.deepEqual(replay, first);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("persist:")).length, 1);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("audit:")).length, 1);
});

test("changing the semantic reason or mutation target remains a conflict", async () => {
  const transaction = transactionHarness();
  const handler = await createHandler(transaction.runTransaction);

  const first = await handler.execute(mutationRequest());
  const reasonConflict = await handler.execute(mutationRequest({
    reason: "Suspend delegated authority for a different governance decision"
  }));
  const targetConflict = await handler.execute(mutationRequest({
    command: { assignmentId: "assignment-0002" }
  }));

  assert.equal(first.ok, true);
  assert.deepEqual(reasonConflict, { ok: false, code: "IDEMPOTENCY_CONFLICT" });
  assert.deepEqual(targetConflict, { ok: false, code: "IDEMPOTENCY_CONFLICT" });
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("persist:")).length, 1);
  assert.equal(transaction.calls.filter((entry) => entry.startsWith("audit:")).length, 1);
});

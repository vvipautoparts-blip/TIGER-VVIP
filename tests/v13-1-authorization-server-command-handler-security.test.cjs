"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const handlerPath = path.resolve(
  __dirname,
  "../scripts/authorization/v13-server-command-handler.js"
);
const moduleUrl = pathToFileURL(handlerPath).href;
const NOW = "2026-08-05T12:01:00.000Z";

async function loadModule() {
  return import(`${moduleUrl}?security=${Date.now()}-${Math.random()}`);
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

function envelope() {
  return {
    envelopeId: "authz_env_mutation_0001",
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
    correlationId: "corr_mutation_0001"
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

function suspendRequest(overrides = {}) {
  return {
    operation: "suspendAssignment",
    command: { assignmentId: "assignment-0001" },
    envelope: envelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_mutation_0001",
    idempotencyKey: "idem_mutation_0001",
    reason: "Suspend delegated authority after governance review",
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    },
    ...overrides
  };
}

function target(overrides = {}) {
  return {
    id: "assignment-0001",
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active",
    ...overrides
  };
}

async function createHandler(runTransaction) {
  const { createAuthorizationServerCommandHandler } = await loadModule();
  return createAuthorizationServerCommandHandler({
    loadTrustedState: async () => trustedState(),
    runTransaction,
    clock: () => NOW
  });
}

function transactionFor(trustedTarget, options = {}) {
  const calls = [];
  const tx = {
    async findIdempotencyReceipt() {
      calls.push("find");
      return null;
    },
    async loadAuthorizationTarget(input) {
      calls.push(`load:${input.targetId}`);
      return trustedTarget;
    },
    async persistAuthorizationCommand(input) {
      calls.push("persist");
      if (options.inspectPersist) options.inspectPersist(input);
      return {
        id: "assignment-0001",
        state: "suspended",
        authorityClass: "DELEGATED"
      };
    },
    async appendAuthorizationAudit() {
      calls.push("audit");
      return { auditHash: "b".repeat(64) };
    },
    async storeIdempotencyReceipt() {
      calls.push("store");
      return { stored: true };
    }
  };
  return {
    calls,
    runTransaction: async (work) => ({ committed: true, value: await work(tx) })
  };
}

test("mutation operations fail closed when the transaction cannot load a trusted target", async () => {
  const tx = transactionFor(target());
  delete tx.runTransaction;
  const runTransaction = async (work) => ({
    committed: true,
    value: await work({
      findIdempotencyReceipt: async () => null,
      persistAuthorizationCommand: async () => ({
        id: "assignment-0001",
        state: "suspended",
        authorityClass: "DELEGATED"
      }),
      appendAuthorizationAudit: async () => ({ auditHash: "b".repeat(64) }),
      storeIdempotencyReceipt: async () => ({ stored: true })
    })
  });
  const handler = await createHandler(runTransaction);
  assert.deepEqual(await handler.execute(suspendRequest()), {
    ok: false,
    code: "REMOTE_ENFORCEMENT_FAILED"
  });
});

test("trusted owner and partner targets are denied before persistence", async () => {
  const cases = [
    {
      trustedTarget: target({ authorityClass: "OWNER_ROOT", roleId: "owner" }),
      code: "OWNER_ROOT_IMMUTABLE"
    },
    {
      trustedTarget: target({ authorityClass: "PARTNER_GLOBAL_ADMIN", roleId: "partner" }),
      code: "PEER_PARTNER_MUTATION_DENIED"
    }
  ];

  for (const fixture of cases) {
    const transaction = transactionFor(fixture.trustedTarget);
    const handler = await createHandler(transaction.runTransaction);
    assert.deepEqual(await handler.execute(suspendRequest()), {
      ok: false,
      code: fixture.code
    });
    assert.deepEqual(transaction.calls, ["find", "load:assignment-0001"]);
  }
});

test("delegated mutation uses the trusted target loaded inside the same transaction", async () => {
  const trustedTarget = target();
  const transaction = transactionFor(trustedTarget, {
    inspectPersist(input) {
      assert.deepEqual(input.trustedTarget, trustedTarget);
      assert.equal(Object.isFrozen(input.trustedTarget), true);
    }
  });
  const handler = await createHandler(transaction.runTransaction);
  const result = await handler.execute(suspendRequest({
    command: {
      assignmentId: "assignment-0001",
      roleId: "owner",
      permissionIds: ["authorization.owner.manage"]
    }
  }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    id: "assignment-0001",
    state: "suspended",
    authorityClass: "DELEGATED"
  });
  assert.deepEqual(transaction.calls, [
    "find",
    "load:assignment-0001",
    "persist",
    "audit",
    "store"
  ]);
});

test("server handler contains no endpoint credential driver environment or browser dependency", () => {
  const source = fs.readFileSync(handlerPath, "utf8");
  assert.doesNotMatch(source,
    /https?:\/\/|supabase\.co|service[_-]?role|project[_-]?ref|postgres(?:ql)?:\/\/|createClient|db\s+push|--linked/i);
  assert.doesNotMatch(source,
    /process\.env|localStorage|sessionStorage|window\.|document\./);
});

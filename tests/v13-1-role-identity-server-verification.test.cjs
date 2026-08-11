"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-server-command-handler.js")
).href;

const NOW = "2026-08-11T20:30:00.000Z";

async function loadHandlerModule() {
  return import(`${moduleUrl}?role-identity-server=${Date.now()}-${Math.random()}`);
}

function digestSha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function permissions() {
  return [
    "authorization.assignment.read",
    "authorization.assignment.manage",
    "authorization.permission.delegate",
    "authorization.audit.read",
    "country.governance.read",
    "country.governance.manage"
  ];
}

function envelope() {
  return {
    envelopeId: "authz_env_role_identity_server_0001",
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
    sessionIssuedAt: "2026-08-11T20:20:00.000Z",
    issuedAt: "2026-08-11T20:25:00.000Z",
    expiresAt: "2026-08-11T20:35:00.000Z",
    correlationId: "corr_role_identity_server_envelope_0001"
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
    sessionValidAfter: "2026-08-11T20:00:00.000Z",
    policyVersion: "V13.1",
    assignmentRevision: 3,
    country: null
  };
}

function request(identityBinding = { type: "ACCOUNT_ID", value: "acct_staff_0001" }) {
  return {
    operation: "createAssignment",
    command: {
      subjectId: "staff-1",
      roleId: "country_admin",
      requestedPermissionIds: ["country.governance.read"],
      scope: { level: "country", countryCode: "JO" },
      startsAt: "2026-08-11T20:30:00.000Z",
      expiresAt: "2027-08-11T20:30:00.000Z",
      identityBinding
    },
    envelope: envelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_role_identity_server_0001",
    idempotencyKey: "idem_role_identity_server_0001",
    reason: "Activate role only after trusted identity-account verification",
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    }
  };
}

function transactionHarness(inspectPersist) {
  const calls = [];
  const tx = {
    async findIdempotencyReceipt() {
      calls.push("find");
      return null;
    },
    async persistAuthorizationCommand(input) {
      calls.push("persist");
      if (inspectPersist) inspectPersist(input);
      return {
        id: "assignment-role-identity-0001",
        state: "active",
        authorityClass: "DELEGATED"
      };
    },
    async appendAuthorizationAudit() {
      calls.push("audit");
      return { auditHash: "c".repeat(64) };
    },
    async storeIdempotencyReceipt() {
      calls.push("store");
      return { stored: true };
    }
  };
  return {
    calls,
    runTransaction: async (work) => {
      calls.push("tx:start");
      const value = await work(tx);
      calls.push("tx:end");
      return { committed: true, value };
    }
  };
}

async function createHandler({ resolveRoleIdentityBinding, inspectPersist } = {}) {
  const { createAuthorizationServerCommandHandler } = await loadHandlerModule();
  const transaction = transactionHarness(inspectPersist);
  const options = {
    loadTrustedState: async () => trustedState(),
    runTransaction: transaction.runTransaction,
    clock: () => NOW,
    digestSha256
  };
  if (resolveRoleIdentityBinding !== undefined) {
    options.resolveRoleIdentityBinding = resolveRoleIdentityBinding;
  }
  return {
    handler: createAuthorizationServerCommandHandler(options),
    transaction
  };
}

test("createAssignment fails closed when trusted role identity resolver is not configured", async () => {
  const { handler, transaction } = await createHandler();
  assert.deepEqual(await handler.execute(request()), {
    ok: false,
    code: "CONFIGURATION_REQUIRED"
  });
  assert.deepEqual(transaction.calls, []);
});

test("unresolved malformed or mismatched trusted role identity is denied before persistence", async () => {
  const deniedResolutions = [
    null,
    {},
    {
      verified: false,
      subjectId: "staff-1",
      accountId: "acct_staff_0001",
      clerkUserId: "user_staff_0001"
    },
    {
      verified: true,
      subjectId: "staff-other",
      accountId: "acct_staff_0001",
      clerkUserId: "user_staff_0001"
    },
    {
      verified: true,
      subjectId: "staff-1",
      accountId: "acct_other_0001",
      clerkUserId: "user_staff_0001"
    }
  ];

  for (const resolution of deniedResolutions) {
    const { handler, transaction } = await createHandler({
      resolveRoleIdentityBinding: async () => resolution
    });
    assert.deepEqual(await handler.execute(request()), {
      ok: false,
      code: "ROLE_IDENTITY_BINDING_DENIED"
    });
    assert.equal(transaction.calls.includes("persist"), false);
  }
});

test("Clerk binding must resolve to the exact Clerk user and same canonical account subject", async () => {
  const { handler, transaction } = await createHandler({
    resolveRoleIdentityBinding: async () => ({
      verified: true,
      subjectId: "staff-1",
      accountId: "acct_staff_0001",
      clerkUserId: "user_wrong_0001"
    })
  });

  assert.deepEqual(await handler.execute(request({
    type: "CLERK_USER_ID",
    value: "user_staff_0001"
  })), {
    ok: false,
    code: "ROLE_IDENTITY_BINDING_DENIED"
  });
  assert.equal(transaction.calls.includes("persist"), false);
});

test("verified Clerk-account-subject mapping is frozen and forwarded before active persistence", async () => {
  const resolverCalls = [];
  const expectedTrustedIdentity = {
    verified: true,
    subjectId: "staff-1",
    accountId: "acct_staff_0001",
    clerkUserId: "user_staff_0001"
  };

  const { handler, transaction } = await createHandler({
    resolveRoleIdentityBinding: async (input) => {
      resolverCalls.push(input);
      return expectedTrustedIdentity;
    },
    inspectPersist(input) {
      assert.deepEqual(input.trustedIdentity, expectedTrustedIdentity);
      assert.equal(Object.isFrozen(input.trustedIdentity), true);
      assert.equal(Object.isFrozen(input), true);
    }
  });

  const result = await handler.execute(request());
  assert.equal(result.ok, true);
  assert.deepEqual(resolverCalls, [{
    type: "ACCOUNT_ID",
    value: "acct_staff_0001",
    subjectId: "staff-1"
  }]);
  assert.equal(Object.isFrozen(resolverCalls[0]), true);
  assert.deepEqual(transaction.calls, ["tx:start", "find", "persist", "audit", "store", "tx:end"]);
});

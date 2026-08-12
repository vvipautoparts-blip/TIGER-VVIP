"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const boundaryPath = path.resolve(__dirname, "../scripts/authorization/v13-authorization-command-boundary.js");
const identityUiPath = path.resolve(__dirname, "../operations-console/role-identity-binding.js");
const consoleIndexPath = path.resolve(__dirname, "../operations-console/index.html");

async function loadBoundary() {
  return import(`${pathToFileURL(boundaryPath).href}?role-identity=${Date.now()}-${Math.random()}`);
}

function request(identityBinding, suffix = "0001") {
  const command = {
    subjectId: "staff-1",
    roleId: "country_admin",
    requestedPermissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    startsAt: "2026-08-11T00:00:00.000Z",
    expiresAt: "2027-08-11T00:00:00.000Z"
  };
  if (identityBinding !== undefined) command.identityBinding = identityBinding;
  return {
    operation: "createAssignment",
    command,
    envelopeRef: `authz_env_ref_role_identity_${suffix}`,
    correlationKey: `corr_role_identity_${suffix}`,
    idempotencyKey: `idem_role_identity_${suffix}`,
    reason: "Bind verified platform identity before role activation"
  };
}

function dependencies() {
  const calls = [];
  return {
    calls,
    options: {
      runtime: "server",
      sessionResolver: async () => ({
        actorId: "owner-1",
        accountState: "active",
        sessionIssuedAt: "2026-08-11T00:00:00.000Z"
      }),
      authorizationContextResolver: async () => ({
        envelope: { actorId: "owner-1" },
        resource: { scope: { level: "country", countryCode: "JO" } }
      }),
      commandHandler: {
        async execute(input) {
          calls.push(input);
          return {
            ok: true,
            code: "AUTHORIZATION_COMMAND_COMMITTED",
            data: { id: "assignment-identity-1", state: "active", authorityClass: "DELEGATED" },
            receipt: {
              confirmed: true,
              persisted: true,
              correlationKey: input.correlationKey,
              idempotencyKey: input.idempotencyKey,
              auditHash: "a".repeat(64)
            }
          };
        }
      }
    }
  };
}

test("new role assignment is rejected when trusted identity binding is missing", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.options);
  assert.deepEqual(await boundary.execute(request(undefined), {}), { ok: false, code: "INVALID_COMMAND" });
  assert.equal(fixture.calls.length, 0);
});

test("role assignment accepts ACCOUNT_ID and forwards a frozen normalized binding", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.options);
  const result = await boundary.execute(request({ type: "ACCOUNT_ID", value: "acct_staff_0001" }, "0002"), {});
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.calls[0].command.identityBinding, {
    type: "ACCOUNT_ID",
    value: "acct_staff_0001"
  });
  assert.equal(Object.isFrozen(fixture.calls[0].command.identityBinding), true);
});

test("role assignment accepts Clerk user id but rejects malformed or unsupported identity references", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();

  const accepted = dependencies();
  const acceptedBoundary = createAuthorizationCommandBoundary(accepted.options);
  const result = await acceptedBoundary.execute(request({ type: "CLERK_USER_ID", value: "user_2abcDEF123456789" }, "0003"), {});
  assert.equal(result.ok, true);

  const invalidBindings = [
    null,
    {},
    { type: "ACCOUNT_ID", value: "" },
    { type: "CLERK_USER_ID", value: "acct_not_clerk" },
    { type: "EMAIL", value: "person@example.com" },
    { type: "ACCOUNT_ID", value: "acct_staff_0001", extra: true }
  ];
  for (let index = 0; index < invalidBindings.length; index += 1) {
    const fixture = dependencies();
    const boundary = createAuthorizationCommandBoundary(fixture.options);
    const denied = await boundary.execute(request(invalidBindings[index], `10${index + 10}`), {});
    assert.deepEqual(denied, { ok: false, code: "INVALID_COMMAND" });
    assert.equal(fixture.calls.length, 0);
  }
});

test("role assignment accepts ACCOUNT_ID at the 200-character contract boundary", async () => {
  const { createAuthorizationCommandBoundary } = await loadBoundary();
  const fixture = dependencies();
  const boundary = createAuthorizationCommandBoundary(fixture.options);
  const reference = "a".repeat(200);
  const result = await boundary.execute(request({ type: "ACCOUNT_ID", value: reference }, "0200"), {});
  assert.equal(result.ok, true);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].command.identityBinding.value, reference);
});

test("operations console loads isolated role identity binding UI", () => {
  const source = fs.readFileSync(identityUiPath, "utf8");
  const index = fs.readFileSync(consoleIndexPath, "utf8");
  assert.match(index, /role-identity-binding\.js/);
  assert.match(source, /name\s*=\s*['"]identityType['"]/);
  assert.match(source, /value:\s*['"]ACCOUNT_ID['"]/);
  assert.match(source, /value:\s*['"]CLERK_USER_ID['"]/);
  assert.match(source, /name\s*=\s*['"]identityValue['"]/);
  assert.match(source, /رقم الحساب أو رقم Clerk|رقم \/ معرّف الحساب الداخلي/);
  assert.match(source, /Production.*يتحقق الخادم/);
  assert.match(source, /CLERK_USER_ID.*user_/s);
});

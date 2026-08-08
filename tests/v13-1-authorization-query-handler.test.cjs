"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const handlerPath = path.resolve(
  __dirname,
  "../scripts/authorization/v13-authorization-query-handler.js"
);
const moduleUrl = pathToFileURL(handlerPath).href;
const NOW = "2026-08-06T08:00:00.000Z";

async function loadModule() {
  return import(`${moduleUrl}?query=${Date.now()}-${Math.random()}`);
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

function ownerEnvelope(overrides = {}) {
  return {
    envelopeId: "authz_env_query_owner_0001",
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
    sessionIssuedAt: "2026-08-06T07:55:00.000Z",
    issuedAt: "2026-08-06T07:59:00.000Z",
    expiresAt: "2026-08-06T08:04:00.000Z",
    correlationId: "corr_query_envelope_0001",
    ...overrides
  };
}

function ownerState(overrides = {}) {
  return {
    actorId: "owner-1",
    accountState: "active",
    authorityClass: "OWNER_ROOT",
    roleIds: ["owner"],
    permissionIds: permissions(),
    effectiveAssignmentIds: ["owner-root-0001"],
    scope: { level: "platform" },
    sessionValidAfter: "2026-08-06T07:00:00.000Z",
    policyVersion: "V13.1",
    assignmentRevision: 3,
    country: null,
    ...overrides
  };
}

function delegatedEnvelope(overrides = {}) {
  return ownerEnvelope({
    envelopeId: "authz_env_query_delegated_0001",
    actorId: "manager-1",
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    permissionIds: ["authorization.assignment.read", "authorization.audit.read"],
    effectiveAssignmentIds: ["assignment-manager-0001"],
    scope: { level: "country", countryCode: "JO" },
    assignmentRevision: 7,
    correlationId: "corr_query_envelope_0002",
    ...overrides
  });
}

function delegatedState(overrides = {}) {
  return ownerState({
    actorId: "manager-1",
    authorityClass: "DELEGATED",
    roleIds: ["country_admin"],
    permissionIds: ["authorization.assignment.read", "authorization.audit.read"],
    effectiveAssignmentIds: ["assignment-manager-0001"],
    scope: { level: "country", countryCode: "JO" },
    assignmentRevision: 7,
    ...overrides
  });
}

function request(operation = "listAssignments", overrides = {}) {
  return {
    operation,
    query: {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: " jo " }
    },
    envelope: ownerEnvelope(),
    authenticatedActorId: "owner-1",
    correlationKey: "corr_query_request_0001",
    resource: {
      scope: { level: "country", countryCode: "JO" },
      countryCode: "JO"
    },
    ...overrides
  };
}

function assignment(overrides = {}) {
  return {
    id: "assignment-0001",
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    grantedBy: "owner-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    legalDecisionReference: "LEGAL-PRIVATE-0001",
    event_payload: { secret: true },
    idempotencyKey: "idem_secret_0001",
    token: "secret-token",
    ...overrides
  };
}

function audit(overrides = {}) {
  return {
    sequenceNo: 10,
    eventHash: "a".repeat(64),
    previousHash: "b".repeat(64),
    actorId: "owner-1",
    action: "assignment.create",
    targetType: "authority_assignment",
    targetId: "assignment-0001",
    reason: "Approved delegated authority",
    correlationKey: "corr_query_audit_0001",
    idempotencyKey: "idem_query_audit_secret_0001",
    scope: { level: "country", countryCode: "JO" },
    createdAt: "2026-08-06T07:30:00.000Z",
    event_payload: { secret: "raw" },
    legalEntityCountry: "JO",
    dataResidencyRegion: "hidden-region",
    ...overrides
  };
}

function cursorCodec() {
  const encoded = [];
  return {
    encoded,
    async encode(payload) {
      encoded.push(payload);
      return `cursor_${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
    },
    async decode(value) {
      if (typeof value !== "string" || !value.startsWith("cursor_")) {
        throw new Error("invalid cursor");
      }
      return JSON.parse(Buffer.from(value.slice(7), "base64url").toString("utf8"));
    }
  };
}

async function createHandler({
  state = ownerState(),
  page,
  codec = cursorCodec(),
  digestSha256 = sha256,
  clock = () => NOW,
  overrides = {}
} = {}) {
  const { createAuthorizationQueryHandler } = await loadModule();
  const calls = [];
  const handler = createAuthorizationQueryHandler({
    loadTrustedState: async (actorId) => {
      calls.push(["state", actorId]);
      return state;
    },
    readAuthorizationPage: async (input) => {
      calls.push(["page", input]);
      return page === undefined
        ? {
          items: [assignment()],
          nextPosition: null,
          snapshotRevision: "snapshot-authz-0001"
        }
        : page;
    },
    clock,
    digestSha256,
    cursorCodec: codec,
    ...overrides
  });
  return { handler, calls, codec };
}

test("missing dependencies and unknown operations fail before external calls", async () => {
  const { createAuthorizationQueryHandler } = await loadModule();
  const configs = [
    {},
    { loadTrustedState: async () => ownerState() },
    {
      loadTrustedState: async () => ownerState(),
      readAuthorizationPage: async () => ({})
    },
    {
      loadTrustedState: async () => ownerState(),
      readAuthorizationPage: async () => ({}),
      clock: () => NOW
    },
    {
      loadTrustedState: async () => ownerState(),
      readAuthorizationPage: async () => ({}),
      clock: () => NOW,
      digestSha256: sha256
    }
  ];
  for (const config of configs) {
    const handler = createAuthorizationQueryHandler(config);
    assert.deepEqual(await handler.execute(request()), {
      ok: false,
      code: "CONFIGURATION_REQUIRED"
    });
  }

  const fixture = await createHandler();
  for (const operation of ["getAssignment", "createAssignment", "listUsers", "arbitraryRpc"]) {
    assert.deepEqual(await fixture.handler.execute(request(operation)), {
      ok: false,
      code: "UNKNOWN_AUTHORIZATION_QUERY"
    });
  }
  assert.deepEqual(fixture.calls, []);
});

test("common and operation-specific queries are normalized exactly", async () => {
  const fixture = await createHandler();
  const result = await fixture.handler.execute(request("listAssignments", {
    query: {
      scope: { level: "country", countryCode: " jo " },
      states: ["suspended", "active", "active"],
      authorityClasses: ["DELEGATED"]
    }
  }));
  assert.equal(result.ok, true);
  const pageInput = fixture.calls.find(([name]) => name === "page")[1];
  assert.deepEqual(pageInput.query, {
    limit: 25,
    scope: { level: "country", countryCode: "JO" },
    states: ["active", "suspended"],
    authorityClasses: ["DELEGATED"]
  });
  assert.equal(pageInput.position, null);
  assert.equal(pageInput.snapshotRevision, null);

  const auditFixture = await createHandler({
    page: { items: [audit()], nextPosition: null, snapshotRevision: "snapshot-audit-0001" }
  });
  const auditResult = await auditFixture.handler.execute(request("listAuditEvents", {
    query: {
      limit: 50,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      actions: ["assignment.suspend", "assignment.create", "assignment.create"],
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z"
    }
  }));
  assert.equal(auditResult.ok, true);
  assert.deepEqual(auditFixture.calls.find(([name]) => name === "page")[1].query, {
    limit: 50,
    scope: { level: "country", countryCode: "JO" },
    actions: ["assignment.create", "assignment.suspend"],
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-08-01T00:00:00.000Z"
  });
});

test("invalid query structures limits cursors filters and time windows fail closed", async () => {
  const fixture = await createHandler();
  const cycle = { limit: 2, scope: { level: "country", countryCode: "JO" } };
  cycle.self = cycle;
  const invalidAssignmentQueries = [
    { limit: 0, cursor: null, scope: { level: "country", countryCode: "JO" } },
    { limit: 51, cursor: null, scope: { level: "country", countryCode: "JO" } },
    { limit: 2, cursor: 2, scope: { level: "country", countryCode: "JO" } },
    { limit: 2, cursor: "x".repeat(2049), scope: { level: "country", countryCode: "JO" } },
    { limit: 2, cursor: null, scope: { level: "country" } },
    { limit: 2, cursor: null, scope: { level: "country", countryCode: "JO" }, unknown: true },
    { limit: 2, cursor: null, scope: { level: "country", countryCode: "JO" }, states: ["unknown"] },
    { limit: 2, cursor: null, scope: { level: "country", countryCode: "JO" }, authorityClasses: ["ROOT"] },
    cycle,
    JSON.parse('{"limit":2,"cursor":null,"scope":{"level":"country","countryCode":"JO"},"__proto__":{"polluted":true}}')
  ];
  for (const query of invalidAssignmentQueries) {
    assert.deepEqual(await fixture.handler.execute(request("listAssignments", { query })), {
      ok: false,
      code: "INVALID_QUERY"
    });
  }

  const invalidAuditQueries = [
    {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      actions: Array.from({ length: 11 }, (_, index) => `action.${index}`)
    },
    {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      actions: ["bad action"]
    },
    {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      from: "bad",
      to: "2026-08-01T00:00:00.000Z"
    },
    {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      from: "2026-08-02T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z"
    },
    {
      limit: 2,
      cursor: null,
      scope: { level: "country", countryCode: "JO" },
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z"
    }
  ];
  for (const query of invalidAuditQueries) {
    assert.deepEqual(await fixture.handler.execute(request("listAuditEvents", { query })), {
      ok: false,
      code: "INVALID_QUERY"
    });
  }
  assert.equal({}.polluted, undefined);
});

test("fresh trusted state envelope permission and requested scope are mandatory", async () => {
  const cases = [
    {
      state: ownerState({ accountState: "suspended" }),
      expected: "ACCOUNT_SUSPENDED"
    },
    {
      state: delegatedState({ permissionIds: [] }),
      req: request("listAssignments", {
        authenticatedActorId: "manager-1",
        envelope: delegatedEnvelope({ permissionIds: [] })
      }),
      expected: "PERMISSION_DENIED"
    },
    {
      state: delegatedState(),
      req: request("listAssignments", {
        authenticatedActorId: "manager-1",
        envelope: delegatedEnvelope(),
        query: { limit: 2, cursor: null, scope: { level: "country", countryCode: "US" } },
        resource: { scope: { level: "country", countryCode: "US" }, countryCode: "US" }
      }),
      expected: "COUNTRY_SCOPE_MISMATCH"
    },
    {
      state: delegatedState(),
      req: request("listAssignments", {
        authenticatedActorId: "manager-2",
        envelope: delegatedEnvelope()
      }),
      expected: "IDENTITY_DENIED"
    }
  ];

  for (const fixtureCase of cases) {
    const fixture = await createHandler({ state: fixtureCase.state });
    const result = await fixture.handler.execute(fixtureCase.req || request());
    assert.equal(result.ok, false);
    assert.equal(result.code, fixtureCase.expected);
    assert.equal(fixture.calls.some(([name]) => name === "page"), false);
  }
});

test("semantic query hash is versioned normalized and exact SHA-256 is required", async () => {
  let projection;
  const fixture = await createHandler({
    digestSha256: (canonicalJson) => {
      projection = JSON.parse(canonicalJson);
      return sha256(canonicalJson);
    }
  });
  const result = await fixture.handler.execute(request());
  assert.equal(result.ok, true);
  assert.deepEqual(projection.contract, {
    name: "V13.1_AUTHORIZATION_QUERY",
    version: 1
  });
  assert.equal(projection.operationContractVersion, 1);
  assert.equal(projection.operation, "listAssignments");
  assert.equal(projection.actorId, "owner-1");
  assert.equal("cursor" in projection.query, false);
  assert.deepEqual(projection.query.scope, { level: "country", countryCode: "JO" });
  assert.deepEqual(projection.authorityContext.permissionIds, [...permissions()].sort());
  assert.equal("correlationKey" in projection, false);
  assert.equal("envelopeId" in projection, false);
  assert.equal("activeMarketCountry" in projection, false);

  for (const digest of ["deadbeef", "A".repeat(64), "a".repeat(65), null]) {
    const malformed = await createHandler({ digestSha256: async () => digest });
    assert.deepEqual(await malformed.handler.execute(request()), {
      ok: false,
      code: "REMOTE_ENFORCEMENT_FAILED"
    });
    assert.equal(malformed.calls.some(([name]) => name === "page"), false);
  }
});

test("opaque cursor is actor query operation version snapshot and time bound", async () => {
  const codec = cursorCodec();
  const first = await createHandler({
    codec,
    page: {
      items: [assignment()],
      nextPosition: "position-next-0001",
      snapshotRevision: "snapshot-authz-0001"
    }
  });
  const firstResult = await first.handler.execute(request());
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.page.hasMore, true);
  assert.match(firstResult.page.nextCursor, /^cursor_/);
  assert.equal(codec.encoded.length, 1);
  const payload = codec.encoded[0];
  assert.deepEqual(payload.contract, {
    name: "V13.1_AUTHORIZATION_QUERY_CURSOR",
    version: 1
  });
  assert.equal(payload.operation, "listAssignments");
  assert.equal(payload.operationContractVersion, 1);
  assert.equal(payload.actorId, "owner-1");
  assert.match(payload.queryHash, /^[a-f0-9]{64}$/);
  assert.equal(payload.snapshotRevision, "snapshot-authz-0001");
  assert.equal(payload.position, "position-next-0001");
  assert.equal(Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt), 300_000);

  const second = await createHandler({
    codec,
    page: {
      items: [assignment({ id: "assignment-0002" })],
      nextPosition: null,
      snapshotRevision: "snapshot-authz-0001"
    }
  });
  const secondResult = await second.handler.execute(request("listAssignments", {
    query: {
      limit: 2,
      cursor: firstResult.page.nextCursor,
      scope: { level: "country", countryCode: "JO" }
    }
  }));
  assert.equal(secondResult.ok, true);
  const input = second.calls.find(([name]) => name === "page")[1];
  assert.equal(input.position, "position-next-0001");
  assert.equal(input.snapshotRevision, "snapshot-authz-0001");

  const cursorCases = [
    [{ ...payload, actorId: "other" }, "CURSOR_CONTEXT_MISMATCH"],
    [{ ...payload, operation: "listAuditEvents" }, "CURSOR_CONTEXT_MISMATCH"],
    [{ ...payload, operationContractVersion: 2 }, "CURSOR_CONTEXT_MISMATCH"],
    [{ ...payload, queryHash: "c".repeat(64) }, "CURSOR_CONTEXT_MISMATCH"],
    [{ ...payload, expiresAt: "2026-08-06T07:59:59.000Z" }, "CURSOR_EXPIRED"],
    [{ ...payload, issuedAt: "2026-08-06T08:01:00.000Z" }, "INVALID_CURSOR"],
    [{ ...payload, expiresAt: "2026-08-06T08:10:00.000Z" }, "INVALID_CURSOR"],
    [{ ...payload, position: "" }, "INVALID_CURSOR"],
    [{ ...payload, snapshotRevision: "" }, "INVALID_CURSOR"]
  ];
  for (const [badPayload, code] of cursorCases) {
    const badCodec = {
      encode: codec.encode,
      decode: async () => badPayload
    };
    const bad = await createHandler({ codec: badCodec });
    const result = await bad.handler.execute(request("listAssignments", {
      query: {
        limit: 2,
        cursor: "cursor_bad_0001",
        scope: { level: "country", countryCode: "JO" }
      }
    }));
    assert.deepEqual(result, { ok: false, code });
    assert.equal(bad.calls.some(([name]) => name === "page"), false);
  }
});

test("backend over-return malformed rows scope escapes and snapshot drift fail the whole page", async () => {
  const delegatedRequest = request("listAssignments", {
    authenticatedActorId: "manager-1",
    envelope: delegatedEnvelope(),
    correlationKey: "corr_query_delegated_0001"
  });
  const cases = [
    null,
    { items: [assignment(), assignment({ id: "a2" }), assignment({ id: "a3" })], nextPosition: null, snapshotRevision: "snapshot-1" },
    { items: [null], nextPosition: null, snapshotRevision: "snapshot-1" },
    { items: [assignment({ scope: { level: "country", countryCode: "US" } })], nextPosition: null, snapshotRevision: "snapshot-1" },
    { items: [assignment({ authorityClass: "OWNER_ROOT", roleId: "owner" })], nextPosition: null, snapshotRevision: "snapshot-1" },
    { items: [assignment()], nextPosition: {}, snapshotRevision: "snapshot-1" },
    { items: [assignment()], nextPosition: null, snapshotRevision: "" }
  ];
  for (const page of cases) {
    const fixture = await createHandler({ state: delegatedState(), page });
    const result = await fixture.handler.execute(delegatedRequest);
    assert.equal(result.ok, false);
    assert.ok(["REMOTE_ENFORCEMENT_FAILED", "QUERY_SCOPE_DENIED"].includes(result.code));
  }

  const auditFixture = await createHandler({
    state: delegatedState(),
    page: { items: [audit({ scope: undefined })], nextPosition: null, snapshotRevision: "snapshot-audit-1" }
  });
  const auditResult = await auditFixture.handler.execute(request("listAuditEvents", {
    authenticatedActorId: "manager-1",
    envelope: delegatedEnvelope(),
    correlationKey: "corr_query_delegated_audit_0001"
  }));
  assert.deepEqual(auditResult, { ok: false, code: "QUERY_SCOPE_DENIED" });
});

test("assignment disclosure is exact for owner partner and delegated actors", async () => {
  const ownerFixture = await createHandler();
  const ownerResult = await ownerFixture.handler.execute(request());
  assert.deepEqual(ownerResult.items[0], {
    id: "assignment-0001",
    subjectId: "staff-1",
    authorityClass: "DELEGATED",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    grantedBy: "owner-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    legalDecisionReference: "LEGAL-PRIVATE-0001"
  });

  const partnerState = ownerState({
    actorId: "partner-1",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    effectiveAssignmentIds: ["partner-membership-1"]
  });
  const partnerEnvelope = ownerEnvelope({
    actorId: "partner-1",
    authorityClass: "PARTNER_GLOBAL_ADMIN",
    roleIds: ["partner"],
    effectiveAssignmentIds: ["partner-membership-1"]
  });
  const partnerFixture = await createHandler({ state: partnerState });
  const partnerResult = await partnerFixture.handler.execute(request("listAssignments", {
    authenticatedActorId: "partner-1",
    envelope: partnerEnvelope,
    correlationKey: "corr_query_partner_0001"
  }));
  assert.equal("legalDecisionReference" in partnerResult.items[0], false);
  assert.equal("grantedBy" in partnerResult.items[0], true);

  const delegatedFixture = await createHandler({ state: delegatedState() });
  const delegatedResult = await delegatedFixture.handler.execute(request("listAssignments", {
    authenticatedActorId: "manager-1",
    envelope: delegatedEnvelope(),
    correlationKey: "corr_query_delegated_0002"
  }));
  assert.deepEqual(delegatedResult.items[0], {
    id: "assignment-0001",
    subjectId: "staff-1",
    roleId: "country_admin",
    permissionIds: ["country.governance.read"],
    scope: { level: "country", countryCode: "JO" },
    state: "active",
    startsAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z"
  });
});

test("audit disclosure never returns raw payload or idempotency identifiers", async () => {
  const ownerFixture = await createHandler({
    page: { items: [audit()], nextPosition: null, snapshotRevision: "snapshot-audit-1" }
  });
  const ownerResult = await ownerFixture.handler.execute(request("listAuditEvents"));
  assert.deepEqual(ownerResult.items[0], {
    sequenceNo: 10,
    eventHash: "a".repeat(64),
    previousHash: "b".repeat(64),
    actorId: "owner-1",
    action: "assignment.create",
    targetType: "authority_assignment",
    targetId: "assignment-0001",
    reason: "Approved delegated authority",
    correlationKey: "corr_query_audit_0001",
    scope: { level: "country", countryCode: "JO" },
    createdAt: "2026-08-06T07:30:00.000Z"
  });

  const delegatedFixture = await createHandler({
    state: delegatedState(),
    page: { items: [audit()], nextPosition: null, snapshotRevision: "snapshot-audit-1" }
  });
  const delegatedResult = await delegatedFixture.handler.execute(request("listAuditEvents", {
    authenticatedActorId: "manager-1",
    envelope: delegatedEnvelope(),
    correlationKey: "corr_query_delegated_audit_0002"
  }));
  assert.deepEqual(delegatedResult.items[0], {
    sequenceNo: 10,
    eventHash: "a".repeat(64),
    previousHash: "b".repeat(64),
    action: "assignment.create",
    targetType: "authority_assignment",
    targetId: "assignment-0001",
    scope: { level: "country", countryCode: "JO" },
    createdAt: "2026-08-06T07:30:00.000Z"
  });
  for (const item of [ownerResult.items[0], delegatedResult.items[0]]) {
    assert.equal("event_payload" in item, false);
    assert.equal("idempotencyKey" in item, false);
    assert.equal("legalEntityCountry" in item, false);
    assert.equal("dataResidencyRegion" in item, false);
  }
});

test("success is bounded deeply frozen and source stays pure infrastructure-free", async () => {
  const fixture = await createHandler();
  const result = await fixture.handler.execute(request());
  assert.deepEqual(result.page, {
    nextCursor: null,
    snapshotRevision: "snapshot-authz-0001",
    hasMore: false
  });
  assert.equal(result.correlationKey, "corr_query_request_0001");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.items), true);
  assert.equal(Object.isFrozen(result.items[0]), true);
  assert.equal(Object.isFrozen(result.page), true);

  const source = fs.readFileSync(handlerPath, "utf8");
  assert.doesNotMatch(source,
    /https?:\/\/|supabase\.co|service[_-]?role|project[_-]?ref|postgres(?:ql)?:\/\/|createClient|db\s+push|--linked|process\.env|fetch\s*\(/i);
  assert.doesNotMatch(source,
    /localStorage|sessionStorage|window\.|document\.|Math\.imul|fallbackHash|globalThis\.crypto/);
});

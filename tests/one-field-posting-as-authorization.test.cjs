"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/one-field-posting-as.js")
).href;

async function loadPostingAs() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function activeActor(overrides = {}) {
  return Object.assign({
    id: "user_authorized_01",
    accountState: "active",
    authorityClass: "DELEGATED",
    roleIds: ["regular_user"]
  }, overrides);
}

function activeBinding(overrides = {}) {
  return Object.assign({
    actorId: "user_authorized_01",
    personaId: "persona_shop_01",
    status: "active",
    canActAs: true
  }, overrides);
}

test("browser-supplied persona authority fields are never proof of act_as_persona authority", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();
  const result = authorizeActAsPersona({
    actor: activeActor(),
    request: {
      personaId: "persona_shop_01",
      trustedPersonaBindings: [activeBinding()],
      canActAs: true
    },
    trustedPersonaBindings: []
  });

  assert.deepEqual(result, {
    allowed: false,
    code: "PERSONA_AUTHORITY_DENIED",
    operation: "act_as_persona",
    personaId: null
  });
});

test("authorized actor may act only as a matching active server-trusted persona binding", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();
  const result = authorizeActAsPersona({
    actor: activeActor(),
    request: { personaId: "persona_shop_01" },
    trustedPersonaBindings: [activeBinding()]
  });

  assert.deepEqual(result, {
    allowed: true,
    code: "AUTHORIZED",
    operation: "act_as_persona",
    personaId: "persona_shop_01"
  });
  assert.equal(Object.isFrozen(result), true);
});

test("posting-as fails closed for missing, inactive or mismatched trusted bindings", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();
  const cases = [
    [],
    [activeBinding({ status: "revoked" })],
    [activeBinding({ canActAs: false })],
    [activeBinding({ actorId: "user_other_01" })],
    [activeBinding({ personaId: "persona_other_01" })]
  ];

  for (const trustedPersonaBindings of cases) {
    const result = authorizeActAsPersona({
      actor: activeActor(),
      request: { personaId: "persona_shop_01" },
      trustedPersonaBindings
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "PERSONA_AUTHORITY_DENIED");
    assert.equal(result.personaId, null);
  }
});

test("owner and partner platform authority do not imply persona impersonation authority", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();

  for (const actor of [
    activeActor({ authorityClass: "OWNER_ROOT", roleIds: ["owner"] }),
    activeActor({ authorityClass: "PARTNER_GLOBAL_ADMIN", roleIds: ["partner"] })
  ]) {
    const result = authorizeActAsPersona({
      actor,
      request: { personaId: "persona_shop_01" },
      trustedPersonaBindings: []
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "PERSONA_AUTHORITY_DENIED");
  }
});

test("posting-as rejects untrusted identity state and malformed persona ids before membership evaluation", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();

  assert.equal(authorizeActAsPersona({
    actor: activeActor({ accountState: "suspended" }),
    request: { personaId: "persona_shop_01" },
    trustedPersonaBindings: [activeBinding()]
  }).code, "IDENTITY_DENIED");

  for (const personaId of [null, "", "shop_01", "persona bad", "persona_"]) {
    const result = authorizeActAsPersona({
      actor: activeActor(),
      request: { personaId },
      trustedPersonaBindings: [activeBinding()]
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "INVALID_PERSONA");
  }
});

test("persona authorization is domain-independent and does not require sector-owned persona metadata", async () => {
  const { authorizeActAsPersona } = await loadPostingAs();
  const trustedPersonaBindings = [activeBinding()];

  for (const viewId of ["view_automotive", "view_materials", "view_real_estate", "view_future_additive"]) {
    const result = authorizeActAsPersona({
      actor: activeActor(),
      request: { personaId: "persona_shop_01", viewId },
      trustedPersonaBindings
    });
    assert.equal(result.allowed, true, viewId);
    assert.equal(result.personaId, "persona_shop_01");
  }
});

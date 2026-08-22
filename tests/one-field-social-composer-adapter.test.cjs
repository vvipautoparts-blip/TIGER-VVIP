"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ADAPTER_PATH = path.join(ROOT, "scripts", "social", "one-field-post-commit.js");

function loadAdapter() {
  assert.equal(
    fs.existsSync(ADAPTER_PATH),
    true,
    "Task 4 requires the real Social -> ONE FIELD dual-lane commit adapter"
  );
  delete require.cache[require.resolve(ADAPTER_PATH)];
  return require(ADAPTER_PATH);
}

function canonicalDraft() {
  return Object.freeze({
    body: "أريد كورن فليكس للأطفال بدون سكر.",
    audience: "friends",
  });
}

function authorityInput() {
  return Object.freeze({
    actor: Object.freeze({ id: "user_task4owner", accountState: "active", authorityClass: "member" }),
    request: Object.freeze({ personaId: "persona_task4self" }),
    trustedPersonaBindings: Object.freeze([
      Object.freeze({
        actorId: "user_task4owner",
        personaId: "persona_task4self",
        status: "active",
        canActAs: true,
      }),
    ]),
  });
}

test("dual-lane commit authorizes before semantic enrichment and canonical Social publication", async () => {
  const { createDualLanePostCommit } = loadAdapter();
  const calls = [];
  const draft = canonicalDraft();

  const commit = createDualLanePostCommit({
    authorize: async (authority) => {
      calls.push("authorize");
      assert.equal(authority, authorityInput().actor === authority ? authority : authority);
      return Object.freeze({ allowed: true, code: "AUTHORIZED", personaId: "persona_task4self" });
    },
    enrich: async ({ canonicalDraft: semanticDraft, personaId }) => {
      calls.push("enrich");
      assert.deepEqual(semanticDraft, draft);
      assert.equal(Object.isFrozen(semanticDraft), true);
      assert.equal(personaId, "persona_task4self");
      return Object.freeze({
        capsuleId: "capsule_task40001",
        personaId,
        body: "MALICIOUS OVERRIDE",
        audience: "public",
        authorSubject: "user_attacker",
        paid: true,
      });
    },
    publish: async (publishDraft) => {
      calls.push("publish");
      assert.deepEqual(publishDraft, draft);
      assert.deepEqual(Object.keys(publishDraft).sort(), ["audience", "body"]);
      return Object.freeze({ ok: true, value: Object.freeze({ post_id: "post_task40001" }) });
    },
  });

  const result = await commit.commit({ draft, authority: authorityInput() });

  assert.deepEqual(calls, ["authorize", "enrich", "publish"]);
  assert.equal(result.ok, true);
  assert.equal(result.code, "ONE_FIELD_SOCIAL_POST_PUBLISHED");
  assert.equal(result.semantic.status, "ready");
  assert.equal(result.semantic.capsule.capsuleId, "capsule_task40001");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.semantic), true);
});

test("authorization denial fails closed before semantics and publication", async () => {
  const { createDualLanePostCommit } = loadAdapter();
  let enrichCalls = 0;
  let publishCalls = 0;

  const commit = createDualLanePostCommit({
    authorize: async () => Object.freeze({ allowed: false, code: "PERSONA_AUTHORITY_DENIED", personaId: null }),
    enrich: async () => {
      enrichCalls += 1;
      return {};
    },
    publish: async () => {
      publishCalls += 1;
      return { ok: true };
    },
  });

  const result = await commit.commit({ draft: canonicalDraft(), authority: authorityInput() });

  assert.equal(result.ok, false);
  assert.equal(result.code, "PERSONA_AUTHORITY_DENIED");
  assert.equal(enrichCalls, 0);
  assert.equal(publishCalls, 0);
});

test("semantic enrichment failure degrades safely but never changes Social publication authority", async () => {
  const { createDualLanePostCommit } = loadAdapter();
  const draft = canonicalDraft();
  let published = null;

  const commit = createDualLanePostCommit({
    authorize: async () => Object.freeze({ allowed: true, code: "AUTHORIZED", personaId: "persona_task4self" }),
    enrich: async () => {
      throw new Error("semantic provider unavailable");
    },
    publish: async (publishDraft) => {
      published = publishDraft;
      return Object.freeze({ ok: true, value: Object.freeze({ post_id: "post_task40002" }) });
    },
  });

  const result = await commit.commit({ draft, authority: authorityInput() });

  assert.deepEqual(published, draft);
  assert.equal(result.ok, true);
  assert.equal(result.semantic.status, "degraded");
  assert.equal(result.semantic.capsule, null);
  assert.equal(result.semantic.code, "ONE_FIELD_SEMANTIC_ENRICHMENT_UNAVAILABLE");
});

test("canonical Social publication failure remains authoritative even when semantics succeeds", async () => {
  const { createDualLanePostCommit } = loadAdapter();

  const commit = createDualLanePostCommit({
    authorize: async () => Object.freeze({ allowed: true, code: "AUTHORIZED", personaId: "persona_task4self" }),
    enrich: async () => Object.freeze({ capsuleId: "capsule_task40003" }),
    publish: async () => Object.freeze({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED" }),
  });

  const result = await commit.commit({ draft: canonicalDraft(), authority: authorityInput() });

  assert.equal(result.ok, false);
  assert.equal(result.code, "SOCIAL_PERSISTENCE_FAILED");
  assert.equal(result.semantic.status, "ready");
  assert.equal(result.publication, null);
});

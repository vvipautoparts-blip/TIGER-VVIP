"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACTIVATION_MODES,
  INTENT_STATUSES,
  normalizeIntentEnvelope,
  transitionIntent,
} = require("../scripts/synapse/intent-domain.js");
const { createIntentRuntimeAdapter } = require("../scripts/synapse/intent-runtime-adapters.js");

const NOW = new Date("2026-08-22T12:00:00.000Z");
const baseInput = {
  direction: "NEED",
  sector: "food",
  category: "cereal",
  summary: "corn flakes for children without sugar",
  requiredConstraints: { dietary: ["no_sugar"] },
  preferences: { packageSize: "family" },
  market: { countryCode: "JO", areaClass: "urban" },
  activationMode: "LIVE_NETWORK",
  visibilityClass: "MATCHING_NETWORK",
  expiresAt: "2026-08-23T12:00:00.000Z",
  sourceProvenance: "USER_DECLARED",
};
const actorContext = {
  actorSubject: "user_alice",
  now: NOW,
  schemaVersion: "S1",
  policyVersion: "SYNAPSE-S1",
};

test("intent envelope is bounded, frozen, actor-bound to trusted context, and does not silently activate", () => {
  const envelope = normalizeIntentEnvelope({ ...baseInput, actorSubject: "attacker" }, actorContext);

  assert.equal(envelope.actorSubject, "user_alice");
  assert.equal(envelope.status, INTENT_STATUSES.DRAFT_LOCAL);
  assert.equal(envelope.activationMode, ACTIVATION_MODES.LIVE_NETWORK);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(Object.isFrozen(envelope.requiredConstraints), true);
  assert.equal(envelope.revision, 0);
});

test("intent envelope rejects invalid identity, mode, direction, expiry, and unbounded text", () => {
  for (const [name, input, code] of [
    ["missing actor", baseInput, "INTENT_ACTOR_REQUIRED"],
    ["unknown mode", { ...baseInput, activationMode: "AUTO_NETWORK" }, "INTENT_MODE_INVALID"],
    ["invalid direction", { ...baseInput, direction: "BUY" }, "INTENT_DIRECTION_INVALID"],
    ["expired envelope", { ...baseInput, expiresAt: "2026-08-22T11:59:59.000Z" }, "INTENT_EXPIRY_INVALID"],
    ["oversized summary", { ...baseInput, summary: "x".repeat(501) }, "INTENT_SUMMARY_INVALID"],
  ]) {
    assert.throws(
      () => normalizeIntentEnvelope(input, name === "missing actor" ? { ...actorContext, actorSubject: "" } : actorContext),
      (error) => error.code === code,
      name,
    );
  }
});

test("intent lifecycle requires explicit confirmation, policy admission, and terminal immutability", () => {
  const draft = normalizeIntentEnvelope(baseInput, actorContext);
  assert.throws(
    () => transitionIntent(draft, "CONFIRMED", { now: NOW, explicitConfirmation: false }),
    (error) => error.code === "INTENT_CONFIRMATION_REQUIRED",
  );

  const confirmed = transitionIntent(draft, "CONFIRMED", { now: NOW, explicitConfirmation: true });
  assert.equal(confirmed.status, INTENT_STATUSES.CONFIRMED);
  assert.equal(confirmed.revision, 1);

  assert.throws(
    () => transitionIntent(confirmed, "MATCHING", { now: NOW, authenticated: false }),
    (error) => error.code === "INTENT_AUTH_REQUIRED",
  );
  const matching = transitionIntent(confirmed, "MATCHING", { now: NOW, authenticated: true });
  const active = transitionIntent(matching, "ACTIVE", { now: NOW, policyAdmitted: true });
  assert.equal(active.status, INTENT_STATUSES.ACTIVE);
  assert.equal(active.revision, 3);

  const cancelled = transitionIntent(active, "CANCELLED", { now: NOW, explicitConfirmation: true });
  assert.equal(cancelled.status, INTENT_STATUSES.CANCELLED);
  assert.throws(
    () => transitionIntent(cancelled, "ACTIVE", { now: NOW, authenticated: true, policyAdmitted: true }),
    (error) => error.code === "INTENT_TERMINAL",
  );
});

test("private and assisted modes remain local until explicit LIVE_NETWORK activation", async () => {
  const calls = [];
  const adapter = createIntentRuntimeAdapter({
    rpc: async (...args) => {
      calls.push(args);
      return { data: { ok: true }, error: null };
    },
  });

  const privateResult = await adapter.create(
    { ...baseInput, activationMode: "PRIVATE_LOCAL" },
    actorContext,
  );
  const assistedResult = await adapter.create(
    { ...baseInput, activationMode: "ASSISTED" },
    actorContext,
  );
  assert.equal(privateResult.localOnly, true);
  assert.equal(assistedResult.localOnly, true);
  assert.equal(calls.length, 0);

  await assert.rejects(
    () => adapter.create(baseInput, { ...actorContext, explicitConfirmation: false }),
    (error) => error.code === "INTENT_CONFIRMATION_REQUIRED",
  );
  const networkResult = await adapter.create(baseInput, { ...actorContext, explicitConfirmation: true });
  assert.equal(networkResult.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "vvip_synapse_intent_create");
  assert.equal(Object.hasOwn(calls[0][1], "p_actor_subject"), false);
  assert.equal(Object.hasOwn(calls[0][1], "actor_subject"), false);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.resolve(
  __dirname,
  "../scripts/discovery/one-field-hybrid-retrieval.js"
);

function loadRetrieval() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function capsule({
  capsuleId,
  sourceObjectId,
  concepts = ["cpt_breakfast_cereal"],
  attributes = { sugarFree: true, audience: "children" }
}) {
  return Object.freeze({
    capsuleId,
    sourceObjectId,
    sourceObjectType: "listing",
    canonicalConcepts: Object.freeze([...concepts]),
    structuredAttributes: Object.freeze({ ...attributes }),
    countryPolicyContext: Object.freeze({ countryCode: "JO" })
  });
}

function baseInput() {
  const first = capsule({
    capsuleId: "capsule_listing_a",
    sourceObjectId: "listing_cereal_a"
  });
  const second = capsule({
    capsuleId: "capsule_listing_b",
    sourceObjectId: "listing_cereal_b"
  });

  return {
    intent: {
      requiredConcepts: ["cpt_breakfast_cereal"],
      requiredAttributes: { sugarFree: true },
      countryCode: "JO"
    },
    capsules: [first, second],
    signals: {
      capsule_listing_a: {
        lexical: 0.7,
        semantic: 0.8,
        structured: 1,
        trust: 0.8,
        availability: 1
      },
      capsule_listing_b: {
        lexical: 0.9,
        semantic: 0.7,
        structured: 1,
        trust: 0.7,
        availability: 1
      }
    }
  };
}

test("hard semantic and structured constraints filter before organic ranking", () => {
  const { retrieveCandidates } = loadRetrieval();
  const input = baseInput();

  input.capsules.push(capsule({
    capsuleId: "capsule_listing_wrong",
    sourceObjectId: "listing_wrong",
    concepts: ["cpt_breakfast_cereal"],
    attributes: { sugarFree: false, audience: "children" }
  }));
  input.signals.capsule_listing_wrong = {
    lexical: 1,
    semantic: 1,
    structured: 1,
    graph: 1,
    geo: 1,
    time: 1,
    trust: 1,
    policy: 1,
    availability: 1
  };

  const result = retrieveCandidates(input);

  assert.deepEqual(
    result.items.map((item) => item.sourceObjectId),
    ["listing_cereal_a", "listing_cereal_b"]
  );
  assert.equal(result.items.some((item) => item.sourceObjectId === "listing_wrong"), false);
});

test("hybrid retrieval is deterministic and uses stable source id tie-breaking", () => {
  const { retrieveCandidates } = loadRetrieval();
  const input = baseInput();
  input.signals.capsule_listing_a = {
    lexical: 0.8,
    semantic: 0.8,
    structured: 1
  };
  input.signals.capsule_listing_b = {
    lexical: 0.8,
    semantic: 0.8,
    structured: 1
  };

  const first = retrieveCandidates(input);
  const second = retrieveCandidates(input);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.items.map((item) => item.sourceObjectId),
    ["listing_cereal_a", "listing_cereal_b"]
  );
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.items), true);
});

test("hybrid retrieval accepts only the approved organic signal vocabulary", () => {
  const { retrieveCandidates, ORGANIC_SIGNAL_NAMES } = loadRetrieval();

  assert.deepEqual(ORGANIC_SIGNAL_NAMES, [
    "lexical",
    "semantic",
    "structured",
    "graph",
    "geo",
    "time",
    "trust",
    "policy",
    "availability"
  ]);

  const input = baseInput();
  input.signals.capsule_listing_a.popularityBoost = 0.9;

  assert.throws(
    () => retrieveCandidates(input),
    /HYBRID_RETRIEVAL_SIGNAL_DENIED/
  );
});

test("hybrid retrieval rejects paid delivery metadata inside organic signals", () => {
  const { retrieveCandidates } = loadRetrieval();

  for (const paidField of [
    "sponsored",
    "campaignId",
    "budget",
    "bid",
    "paidRank",
    "deliveryPriority"
  ]) {
    const input = baseInput();
    input.signals.capsule_listing_a[paidField] = paidField === "sponsored" ? true : 1;
    assert.throws(
      () => retrieveCandidates(input),
      /HYBRID_RETRIEVAL_PAID_SIGNAL_DENIED/,
      paidField
    );
  }
});

test("hybrid retrieval rejects unbounded or non-finite organic signal values", () => {
  const { retrieveCandidates } = loadRetrieval();

  for (const invalidValue of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, "1"] ) {
    const input = baseInput();
    input.signals.capsule_listing_a.lexical = invalidValue;
    assert.throws(
      () => retrieveCandidates(input),
      /HYBRID_RETRIEVAL_INVALID_SIGNAL_VALUE/
    );
  }
});

test("retrieval output exposes evidence but never fusion weights or paid ranking fields", () => {
  const { retrieveCandidates } = loadRetrieval();
  const result = retrieveCandidates(baseInput());

  assert.equal(result.rankingVersion, "one_field_reference_v1");
  for (const item of result.items) {
    assert.equal(Object.hasOwn(item, "score"), false);
    assert.equal(Object.hasOwn(item, "weights"), false);
    assert.equal(Object.hasOwn(item, "sponsored"), false);
    assert.equal(Object.hasOwn(item, "campaignId"), false);
    assert.equal(Object.isFrozen(item.signalEvidence), true);
  }
});

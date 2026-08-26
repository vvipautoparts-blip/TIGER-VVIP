"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  eligible,
} = require("../scripts/synapse/match-eligibility.js");
const {
  rankCandidate,
  rankCandidates,
} = require("../scripts/synapse/match-ranking.js");
const {
  SAFE_REASON_CODES,
  explainMatch,
} = require("../scripts/synapse/match-explanations.js");
const fixture = require("./fixtures/synapse-match-golden.json");

const NOW = new Date(fixture.now);

function matchingContext(extra = {}) {
  return {
    now: NOW,
    activeMarketCountry: "JO",
    policyAdmitted: true,
    ...extra,
  };
}

test("S2 eligibility is a hard policy boundary before score, spend, or model output", () => {
  const intent = fixture.intent;
  const ineligible = fixture.candidates.find((candidate) => candidate.id === "ineligible-spend");
  assert.equal(eligible(ineligible, intent, matchingContext()), false);
  assert.deepEqual(
    rankCandidates({
      candidates: [ineligible],
      intent,
      now: NOW,
      policyVersion: fixture.policyVersion,
      policyContext: matchingContext(),
    }),
    [],
  );
});

test("S2 eligibility rejects expiry, self-owned, blocked, private, and market-ineligible objects", () => {
  const intent = fixture.intent;
  const base = fixture.candidates[0];
  for (const candidate of [
    { ...base, id: "expired", expiresAt: "2026-08-21T12:00:00.000Z" },
    { ...base, id: "self", ownerSubject: intent.actorSubject },
    { ...base, id: "blocked", ownerSubject: "user_blocked" },
    { ...base, id: "private", visibilityClass: "PRIVATE_LOCAL" },
    { ...base, id: "wrong-market", countryCode: "AE" },
  ]) {
    const context = candidate.id === "blocked" ? matchingContext({ blockedActorSubjects: ["user_blocked"] }) : matchingContext();
    assert.equal(eligible(candidate, intent, context), false, candidate.id);
  }
});

test("S2 ranking decays signal-specific timestamps and applies negative evidence", () => {
  const fresh = fixture.candidates[0];
  const stale = {
    ...fresh,
    id: "stale",
    signals: fresh.signals.map((signal) => ({ ...signal, at: "2026-07-01T12:00:00.000Z" })),
  };
  const hidden = {
    ...fresh,
    id: "hidden",
    negativeSignals: [{ kind: "hide", value: 1, at: NOW.toISOString() }],
  };
  assert.ok(rankCandidate(fresh, fixture.intent, NOW, fixture.policyVersion) > rankCandidate(stale, fixture.intent, NOW, fixture.policyVersion));
  assert.ok(rankCandidate(fresh, fixture.intent, NOW, fixture.policyVersion) > rankCandidate(hidden, fixture.intent, NOW, fixture.policyVersion));
});

test("golden fixture ordering is repeatable and bounded to the primary constellation", () => {
  const first = rankCandidates({
    candidates: fixture.candidates,
    intent: fixture.intent,
    now: NOW,
    policyVersion: fixture.policyVersion,
    policyContext: matchingContext(),
  });
  const second = rankCandidates({
    candidates: fixture.candidates,
    intent: fixture.intent,
    now: NOW,
    policyVersion: fixture.policyVersion,
    policyContext: matchingContext(),
  });
  assert.deepEqual(first.map((match) => match.candidate.id), fixture.expectedOrder);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.ok(first.length >= 3 && first.length <= 7);
  assert.equal(first.some((match) => fixture.rejectedIds.includes(match.candidate.id)), false);
  assert.equal(new Set(first.map((match) => match.candidate.contentType)).size, first.length);
  assert.ok(first.every((match) => match.calibrationVersion === fixture.policyVersion));
});

test("explanations are allowlisted and do not leak private constraints, spend, or risk features", () => {
  const match = {
    candidate: {
      category: "cereal",
      sector: "food",
      countryCode: "JO",
      availability: true,
      sponsored: true,
      privateConstraints: { budget: 1 },
      riskScore: 0.99,
      hiddenModelReason: "secret",
    },
  };
  const reasons = explainMatch(match, { intent: fixture.intent, now: NOW });
  assert.ok(reasons.includes("category_fit"));
  assert.ok(reasons.includes("market_fit"));
  assert.ok(reasons.includes("availability_current"));
  assert.ok(reasons.includes("sponsored"));
  assert.ok(reasons.every((reason) => SAFE_REASON_CODES.includes(reason)));
  assert.equal(reasons.some((reason) => /budget|risk|secret|private/i.test(reason)), false);
});

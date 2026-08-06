"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-decision-record.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-record=${Date.now()}-${Math.random()}`);
}

const HEAD = "a".repeat(40);

function digestSha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function validDecision(overrides = {}) {
  return {
    subjectHeadSha: HEAD,
    state: "REVIEW_ELIGIBLE",
    decisionCode: "RELEASE_DEPENDENCY_BLOCKED",
    requiredEvidence: ["QUALITY_GATE", "INDEPENDENT_REVIEW"],
    acceptedEvidence: ["INDEPENDENT_REVIEW", "QUALITY_GATE"],
    rejectedEvidence: [],
    missingEvidence: [],
    activeDeviations: ["deviation_00000002", "deviation_00000001"],
    blockingReasons: [
      "RELEASE_DEPENDENCY_BLOCKED:pr_131",
      "RELEASE_DEPENDENCY_BLOCKED:pr_130"
    ],
    nextEligibleState: "MERGE_ELIGIBLE",
    ...overrides
  };
}

test("release decision record is allowlisted canonical hashed bounded and deeply frozen", async () => {
  const module = await loadModule();
  let canonicalJson = null;
  const input = validDecision();

  const record = await module.createReleaseDecisionRecord(input, {
    digestSha256(value) {
      canonicalJson = value;
      return digestSha256(value);
    }
  });

  assert.deepEqual(record, {
    schemaVersion: 1,
    policyVersion: "V13.1_RELEASE_POLICY_1",
    subjectHeadSha: HEAD,
    state: "REVIEW_ELIGIBLE",
    decisionCode: "RELEASE_DEPENDENCY_BLOCKED",
    requiredEvidence: ["INDEPENDENT_REVIEW", "QUALITY_GATE"],
    acceptedEvidence: ["INDEPENDENT_REVIEW", "QUALITY_GATE"],
    rejectedEvidence: [],
    missingEvidence: [],
    activeDeviations: ["deviation_00000001", "deviation_00000002"],
    blockingReasons: [
      "RELEASE_DEPENDENCY_BLOCKED:pr_130",
      "RELEASE_DEPENDENCY_BLOCKED:pr_131"
    ],
    nextEligibleState: "MERGE_ELIGIBLE",
    decisionDigest: digestSha256(canonicalJson)
  });

  assert.equal(typeof canonicalJson, "string");
  assert.equal(canonicalJson.includes("decisionDigest"), false);
  assert.equal(Object.isFrozen(record), true);
  for (const key of [
    "requiredEvidence",
    "acceptedEvidence",
    "rejectedEvidence",
    "missingEvidence",
    "activeDeviations",
    "blockingReasons"
  ]) {
    assert.equal(Object.isFrozen(record[key]), true);
  }

  input.requiredEvidence.push("STATIC_ANALYSIS");
  assert.deepEqual(record.requiredEvidence, ["INDEPENDENT_REVIEW", "QUALITY_GATE"]);
});

test("semantic ordering and duplicate input do not change the decision digest", async () => {
  const module = await loadModule();
  const first = await module.createReleaseDecisionRecord(validDecision(), {
    digestSha256
  });
  const second = await module.createReleaseDecisionRecord(validDecision({
    requiredEvidence: ["QUALITY_GATE", "INDEPENDENT_REVIEW", "QUALITY_GATE"],
    acceptedEvidence: ["QUALITY_GATE", "INDEPENDENT_REVIEW", "QUALITY_GATE"],
    activeDeviations: ["deviation_00000001", "deviation_00000002"],
    blockingReasons: [
      "RELEASE_DEPENDENCY_BLOCKED:pr_130",
      "RELEASE_DEPENDENCY_BLOCKED:pr_131"
    ]
  }), {
    digestSha256
  });

  assert.deepEqual(first, second);
  assert.equal(first.decisionDigest, second.decisionDigest);
});

test("missing throwing and malformed SHA-256 dependencies fail closed", async () => {
  const module = await loadModule();

  await assert.rejects(
    module.createReleaseDecisionRecord(validDecision(), {}),
    /RELEASE_EVIDENCE_INVALID/
  );
  await assert.rejects(
    module.createReleaseDecisionRecord(validDecision(), {
      digestSha256: null
    }),
    /RELEASE_EVIDENCE_INVALID/
  );
  await assert.rejects(
    module.createReleaseDecisionRecord(validDecision(), {
      digestSha256() {
        throw new Error("do-not-echo-internal-digest-error");
      }
    }),
    (error) => {
      assert.match(error.message, /RELEASE_EVIDENCE_INVALID/);
      assert.doesNotMatch(error.message, /do-not-echo/);
      return true;
    }
  );

  for (const value of [
    "",
    "a".repeat(63),
    "a".repeat(65),
    "A".repeat(64),
    "g".repeat(64),
    null,
    undefined
  ]) {
    await assert.rejects(
      module.createReleaseDecisionRecord(validDecision(), {
        digestSha256() {
          return value;
        }
      }),
      /RELEASE_EVIDENCE_INVALID/
    );
  }
});

test("unknown forbidden malformed and oversized decision inputs fail closed without echo", async () => {
  const module = await loadModule();

  for (const field of [
    "token",
    "secret",
    "password",
    "rawLog",
    "event_payload",
    "envelope",
    "connectionString",
    "environmentValues"
  ]) {
    const attackerValue = `do-not-echo-${field}`;
    await assert.rejects(
      module.createReleaseDecisionRecord({
        ...validDecision(),
        [field]: attackerValue
      }, {
        digestSha256
      }),
      (error) => {
        assert.match(error.message, /RELEASE_CONTRACT_INVALID/);
        assert.doesNotMatch(error.message, new RegExp(attackerValue));
        return true;
      }
    );
  }

  for (const overrides of [
    { subjectHeadSha: "A".repeat(40) },
    { state: "UNKNOWN" },
    { decisionCode: "bad code" },
    { nextEligibleState: "UNKNOWN" },
    { requiredEvidence: "not-an-array" },
    { acceptedEvidence: ["UNKNOWN"] },
    { activeDeviations: ["bad deviation"] },
    { blockingReasons: [""] }
  ]) {
    await assert.rejects(
      module.createReleaseDecisionRecord(validDecision(overrides), {
        digestSha256
      }),
      /RELEASE_CONTRACT_INVALID/
    );
  }

  const longCode = (prefix, index) => `${prefix}_${String(index).padStart(3, "0")}_${"X".repeat(230)}`;
  const oversized = validDecision({
    requiredEvidence: Array.from({ length: 128 }, (_, index) => longCode("QUALITY_GATE", index)),
    acceptedEvidence: Array.from({ length: 128 }, (_, index) => longCode("PROJECT_CONTROL", index)),
    rejectedEvidence: Array.from({ length: 128 }, (_, index) => longCode("STATIC_ANALYSIS", index)),
    missingEvidence: Array.from({ length: 128 }, (_, index) => longCode("DEPENDENCY_REVIEW", index)),
    blockingReasons: Array.from({ length: 64 }, (_, index) => longCode("RELEASE_BLOCKED", index))
  });

  await assert.rejects(
    module.createReleaseDecisionRecord(oversized, { digestSha256 }),
    /RELEASE_BLOCKED/
  );
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-dependency-train.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-train=${Date.now()}-${Math.random()}`);
}

function node(id, overrides = {}) {
  const number = id.replace("pr_", "");
  return {
    id,
    headRef: `feat/pr-${number}`,
    headSha: number.padStart(40, "a").slice(-40),
    baseRef: "main",
    baseSha: "f".repeat(40),
    state: "closed",
    draft: false,
    merged: true,
    mergeSha: number.padStart(40, "b").slice(-40),
    requiredParentIds: [],
    verificationOnly: false,
    ...overrides
  };
}

function validTrain() {
  const parent = node("pr_130");
  const middle = node("pr_131", {
    baseRef: parent.headRef,
    baseSha: parent.headSha,
    requiredParentIds: [parent.id]
  });
  const candidate = node("pr_132", {
    state: "open",
    draft: true,
    merged: false,
    mergeSha: null,
    baseRef: middle.headRef,
    baseSha: middle.headSha,
    requiredParentIds: [middle.id]
  });
  return { parent, middle, candidate };
}

test("a valid merged dependency train is ordered parent-first and deeply frozen", async () => {
  const module = await loadModule();
  const { parent, middle, candidate } = validTrain();

  const result = module.validateDependencyTrain({
    candidate: candidate.id,
    nodes: [candidate, middle, parent]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.orderedDependencies, [parent.id, middle.id]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.orderedDependencies), true);
});

test("dependency cycles and missing parents fail closed with stable codes", async () => {
  const module = await loadModule();
  const first = node("pr_130", { requiredParentIds: ["pr_132"] });
  const second = node("pr_131", {
    baseRef: first.headRef,
    baseSha: first.headSha,
    requiredParentIds: [first.id]
  });
  const candidate = node("pr_132", {
    state: "open",
    merged: false,
    mergeSha: null,
    baseRef: second.headRef,
    baseSha: second.headSha,
    requiredParentIds: [second.id]
  });

  const cycle = module.validateDependencyTrain({
    candidate: candidate.id,
    nodes: [first, second, candidate]
  });
  assert.deepEqual(cycle, {
    ok: false,
    code: "RELEASE_DEPENDENCY_CYCLE",
    blockingNodeIds: ["pr_130", "pr_131", "pr_132"]
  });

  const missing = module.validateDependencyTrain({
    candidate: candidate.id,
    nodes: [candidate]
  });
  assert.deepEqual(missing, {
    ok: false,
    code: "RELEASE_DEPENDENCY_BLOCKED",
    blockingNodeIds: ["pr_131"]
  });
});

test("open closed-unmerged and verification-only required parents block eligibility", async () => {
  const module = await loadModule();
  const { parent, middle, candidate } = validTrain();

  const cases = [
    {
      parent: { ...middle, state: "open", merged: false, mergeSha: null },
      expected: middle.id
    },
    {
      parent: { ...middle, state: "closed", merged: false, mergeSha: null },
      expected: middle.id
    },
    {
      parent: { ...middle, verificationOnly: true },
      expected: middle.id
    },
    {
      parent: { ...middle, mergeSha: null },
      expected: middle.id
    }
  ];

  for (const entry of cases) {
    const result = module.validateDependencyTrain({
      candidate: candidate.id,
      nodes: [parent, entry.parent, candidate]
    });
    assert.deepEqual(result, {
      ok: false,
      code: "RELEASE_DEPENDENCY_BLOCKED",
      blockingNodeIds: [entry.expected]
    });
  }
});

test("a child is blocked when its declared base does not match the direct parent exact head", async () => {
  const module = await loadModule();
  const { parent, middle, candidate } = validTrain();

  for (const changedCandidate of [
    { ...candidate, baseRef: "main" },
    { ...candidate, baseSha: "e".repeat(40) }
  ]) {
    const result = module.validateDependencyTrain({
      candidate: changedCandidate.id,
      nodes: [parent, middle, changedCandidate]
    });
    assert.deepEqual(result, {
      ok: false,
      code: "RELEASE_BASE_CHANGED",
      blockingNodeIds: [middle.id]
    });
  }
});

test("node contracts are strict bounded unique and safe", async () => {
  const module = await loadModule();
  const { parent, middle, candidate } = validTrain();

  for (const input of [
    null,
    {},
    { candidate: "pr_missing", nodes: [parent] },
    { candidate: candidate.id, nodes: [] },
    { candidate: candidate.id, nodes: [candidate, candidate] },
    { candidate: candidate.id, nodes: [{ ...candidate, unexpected: true }] },
    { candidate: candidate.id, nodes: [{ ...candidate, headSha: "A".repeat(40) }] },
    { candidate: candidate.id, nodes: [{ ...candidate, requiredParentIds: ["bad parent"] }] },
    { candidate: candidate.id, nodes: Array.from({ length: 65 }, (_, index) => node(`pr_${200 + index}`)) }
  ]) {
    const result = module.validateDependencyTrain(input);
    assert.deepEqual(result, {
      ok: false,
      code: "RELEASE_CONTRACT_INVALID",
      blockingNodeIds: []
    });
  }

  const selfParent = module.validateDependencyTrain({
    candidate: candidate.id,
    nodes: [{ ...candidate, requiredParentIds: [candidate.id] }]
  });
  assert.deepEqual(selfParent, {
    ok: false,
    code: "RELEASE_DEPENDENCY_CYCLE",
    blockingNodeIds: [candidate.id]
  });
});

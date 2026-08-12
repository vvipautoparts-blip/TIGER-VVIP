"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const registryUrl = pathToFileURL(path.resolve(
  __dirname,
  "../project-control/value-governance/registry.mjs"
)).href;

async function loadRegistryModule() {
  return import(`${registryUrl}?test=${Date.now()}-${Math.random()}`);
}

function validPolicy() {
  return {
    policyVersion: "CVGE_REPOSITORY_V1",
    mode: "ANALYSIS_ONLY",
    automaticRemovalClasses: ["A"],
    automaticQuarantineClasses: ["B"],
    protectedClass: "C",
    minimumEvidenceConfidence: 1,
    staleEvidenceHours: 24,
    allowWorktreeMutation: false,
    allowNetwork: false,
    allowProduction: false
  };
}

function validAsset(overrides = {}) {
  return {
    assetId: "asset:project-control:quality-gate",
    type: "control",
    path: "scripts/quality-gate.sh",
    purpose: "Run isolated platform quality controls",
    accountableRole: "OWNER_ROOT",
    actionClass: "C",
    lifecycleState: "PROTECTED",
    protectedObligations: ["security", "audit", "recovery"],
    expectedEvidence: ["file_exists", "sha256"],
    canonicalReplacement: null,
    ...overrides
  };
}

function validRegistry(assets = [validAsset()]) {
  return {
    registryVersion: "CVGE_ASSET_REGISTRY_V1",
    policyVersion: "CVGE_REPOSITORY_V1",
    completeness: "INITIAL_CRITICAL_ASSETS_ONLY",
    assets
  };
}

test("policy and asset registry validation are strict and fail closed", async () => {
  const { validatePolicy, validateRegistry } = await loadRegistryModule();

  assert.deepEqual(validatePolicy(validPolicy()), { ok: true, code: "OK" });
  assert.deepEqual(validateRegistry(validRegistry(), validPolicy()), {
    ok: true,
    code: "OK"
  });

  assert.deepEqual(validateRegistry(validRegistry([
    validAsset({ purpose: "" })
  ]), validPolicy()), {
    ok: false,
    code: "ASSET_REGISTRY_INVALID"
  });

  assert.deepEqual(validateRegistry(validRegistry([
    validAsset(),
    validAsset({ path: "project-control/other.mjs" })
  ]), validPolicy()), {
    ok: false,
    code: "ASSET_ID_DUPLICATE"
  });

  assert.deepEqual(validateRegistry(validRegistry([
    validAsset(),
    validAsset({
      assetId: "asset:project-control:other",
      path: "scripts/quality-gate.sh"
    })
  ]), validPolicy()), {
    ok: false,
    code: "REGISTRY_PATH_DUPLICATE"
  });
});

test("registry rejects path escapes unknown fields and unsupported exceptions", async () => {
  const { validateRegistry } = await loadRegistryModule();
  const policy = validPolicy();
  const invalidAssets = [
    validAsset({ path: "../escape.sh" }),
    validAsset({ path: "/absolute/path" }),
    validAsset({ path: "scripts\\escape.sh" }),
    validAsset({ path: "scripts/quality-gate.sh\u0000hidden" }),
    validAsset({ unexpected: true }),
    validAsset({ exception: { reason: "forever" } })
  ];

  for (const asset of invalidAssets) {
    assert.deepEqual(validateRegistry(validRegistry([asset]), policy), {
      ok: false,
      code: "ASSET_REGISTRY_INVALID"
    });
  }
});

test("protected Class C assets cannot enter automatic cleanup states", async () => {
  const { validatePolicy, validateRegistry } = await loadRegistryModule();

  assert.deepEqual(validatePolicy({
    ...validPolicy(),
    automaticRemovalClasses: ["A", "C"]
  }), {
    ok: false,
    code: "ACTION_CLASS_DENIED"
  });

  assert.deepEqual(validateRegistry(validRegistry([
    validAsset({ lifecycleState: "REMOVAL_READY" })
  ]), validPolicy()), {
    ok: false,
    code: "ACTION_CLASS_DENIED"
  });
});

test("loaded governance inputs are deeply frozen and reject unknown top-level fields", async () => {
  const { validatePolicy, validateRegistry } = await loadRegistryModule();

  assert.deepEqual(validatePolicy({ ...validPolicy(), unknown: true }), {
    ok: false,
    code: "POLICY_VERSION_INVALID"
  });
  assert.deepEqual(validateRegistry({
    ...validRegistry(),
    unknown: true
  }, validPolicy()), {
    ok: false,
    code: "ASSET_REGISTRY_INVALID"
  });
});

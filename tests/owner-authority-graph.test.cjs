const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

async function loadValidator() {
  return import("../project-control/scripts/validate_authority_graph.mjs");
}

function record(overrides = {}) {
  return {
    authority_id: "authority.platform.v1",
    domain: "platform",
    version: 1,
    status: "CURRENT_ONLY",
    owner_decision_ref: "docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md",
    canonical_path: "docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md",
    supersedes: [],
    protected_boundaries: ["main", "production"],
    ...overrides,
  };
}

test("authority graph returns one current authority per domain with deterministic digest", async () => {
  const { validateAuthorityGraph } = await loadValidator();
  const result = validateAuthorityGraph({
    repositoryRoot: root,
    records: [
      record({ supersedes: ["authority.platform.legacy"] }),
      record({
        authority_id: "authority.platform.legacy",
        version: 0,
        status: "HISTORICAL_ONLY",
        canonical_path: "docs/MASTER_PROJECT_STATE.md",
        supersedes: [],
      }),
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.currentByDomain.platform, "authority.platform.v1");
  assert.deepEqual(result.retiredIds, ["authority.platform.legacy"]);
  assert.match(result.graphDigest, /^[a-f0-9]{64}$/);

  const reordered = validateAuthorityGraph({
    repositoryRoot: root,
    records: [
      record({
        authority_id: "authority.platform.legacy",
        version: 0,
        status: "HISTORICAL_ONLY",
        canonical_path: "docs/MASTER_PROJECT_STATE.md",
        supersedes: [],
      }),
      record({ supersedes: ["authority.platform.legacy"] }),
    ],
  });
  assert.equal(reordered.graphDigest, result.graphDigest);
});

test("authority graph rejects duplicate current domains", async () => {
  const { validateAuthorityGraph } = await loadValidator();
  assert.throws(
    () => validateAuthorityGraph({
      repositoryRoot: root,
      records: [record(), record({ authority_id: "authority.platform.v2", version: 2 })],
    }),
    (error) => error.code === "AUTHORITY_DUPLICATE_CURRENT",
  );
});

test("authority graph rejects supersedes cycles and broken references", async () => {
  const { validateAuthorityGraph } = await loadValidator();
  assert.throws(
    () => validateAuthorityGraph({
      repositoryRoot: root,
      records: [
        record({
          authority_id: "authority.platform.v1",
          supersedes: ["authority.platform.legacy"],
        }),
        record({
          authority_id: "authority.platform.legacy",
          version: 0,
          status: "HISTORICAL_ONLY",
          canonical_path: "docs/MASTER_PROJECT_STATE.md",
          supersedes: ["authority.platform.v1"],
        }),
      ],
    }),
    (error) => error.code === "AUTHORITY_SUPERSEDES_CYCLE",
  );

  assert.throws(
    () => validateAuthorityGraph({
      repositoryRoot: root,
      records: [record({ supersedes: ["authority.platform.missing"] })],
    }),
    (error) => error.code === "AUTHORITY_SUPERSEDES_UNKNOWN",
  );
});

test("authority graph rejects missing canonical paths and historical resurrection", async () => {
  const { validateAuthorityGraph } = await loadValidator();
  assert.throws(
    () => validateAuthorityGraph({
      repositoryRoot: root,
      records: [record({ canonical_path: "docs/does-not-exist.md" })],
    }),
    (error) => error.code === "AUTHORITY_CANONICAL_PATH_MISSING",
  );

  assert.throws(
    () => validateAuthorityGraph({
      repositoryRoot: root,
      records: [
        record({
          authority_id: "authority.platform.legacy",
          version: 0,
          status: "HISTORICAL_ONLY",
          canonical_path: "docs/MASTER_PROJECT_STATE.md",
          supersedes: ["authority.platform.v2"],
        }),
        record({
          authority_id: "authority.platform.v2",
          version: 2,
          status: "CURRENT_ONLY",
          supersedes: [],
        }),
      ],
    }),
    (error) => error.code === "AUTHORITY_HISTORICAL_RESURRECTION",
  );
});

test("repository registry is machine-readable and public release excludes authority records", () => {
  const registryPath = path.join(root, "project-control/authority/authority-registry.v1.json");
  const machineContract = JSON.parse(fs.readFileSync(path.join(root, "project-control/production-handover/current-authority.v1.json"), "utf8"));
  const releaseBuilder = fs.readFileSync(path.join(root, "tools/vvip_public_release.py"), "utf8");
  assert.equal(fs.existsSync(registryPath), true);
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  assert.equal(Array.isArray(registry.records), true);
  assert.ok(registry.records.length > 0);
  assert.deepEqual(machineContract.owner_authority_graph, {
    registry: "project-control/authority/authority-registry.v1.json",
    record_schema: "project-control/schemas/authority-record.schema.json",
    validator: "project-control/scripts/validate_authority_graph.mjs",
    fail_closed: true,
  });
  assert.doesNotMatch(releaseBuilder, /authority-registry\.v1\.json/);
  assert.doesNotMatch(releaseBuilder, /TIGER_OWNER_CURRENT_REFERENCE_AR\.md/);
});

test("TSN-26 is the single current sovereign-finance authority", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "project-control/authority/authority-registry.v1.json"), "utf8"));
  const currentFinance = registry.records.filter((item) => item.domain === "sovereign-finance" && item.status === "CURRENT_ONLY");
  assert.equal(currentFinance.length, 1);
  assert.deepEqual(currentFinance[0], {
    authority_id: "authority.sovereign-finance.tsn26.v1",
    domain: "sovereign-finance",
    version: 1,
    status: "CURRENT_ONLY",
    owner_decision_ref: "config/tsn26/financial-constitution.v1.json",
    canonical_path: "config/tsn26/financial-constitution.v1.json",
    supersedes: [],
    protected_boundaries: [
      "financial-constitution",
      "sales-attribution",
      "settlement",
      "payout",
      "treasury",
      "exposure",
      "superseded-finance-reentry"
    ]
  });
});

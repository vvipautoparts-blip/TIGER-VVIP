"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const inventoryPath = path.resolve(
  __dirname,
  "../project-control/value-governance/inventory.mjs"
);
const inventoryUrl = pathToFileURL(inventoryPath).href;
const FIXED_NOW = "2026-08-06T06:00:00.000Z";

async function loadInventoryModule() {
  return import(`${inventoryUrl}?test=${Date.now()}-${Math.random()}`);
}

function asset(assetId, relativePath) {
  return {
    assetId,
    type: "control",
    path: relativePath,
    purpose: "Fixture asset",
    accountableRole: "OWNER_ROOT",
    actionClass: "A",
    lifecycleState: "WATCH",
    protectedObligations: [],
    expectedEvidence: ["file_exists", "sha256", "reference_count"],
    canonicalReplacement: null
  };
}

function registry(assets) {
  return {
    registryVersion: "CVGE_ASSET_REGISTRY_V1",
    policyVersion: "CVGE_REPOSITORY_V1",
    completeness: "INITIAL_CRITICAL_ASSETS_ONLY",
    assets
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function snapshotTree(rootDir) {
  const rows = [];
  async function visit(relativeDir) {
    const absoluteDir = path.join(rootDir, relativeDir);
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.posix.join(
        relativeDir.split(path.sep).join("/"),
        entry.name
      ).replace(/^\//, "");
      const absolutePath = path.join(rootDir, relativePath);
      const metadata = await lstat(absolutePath);
      if (entry.isDirectory()) {
        rows.push({ path: relativePath, kind: "directory", mtimeMs: metadata.mtimeMs });
        await visit(relativePath);
      } else if (entry.isSymbolicLink()) {
        rows.push({ path: relativePath, kind: "symlink", mtimeMs: metadata.mtimeMs });
      } else {
        const bytes = await readFile(absolutePath);
        rows.push({
          path: relativePath,
          kind: "file",
          size: metadata.size,
          mtimeMs: metadata.mtimeMs,
          sha256: sha256(bytes)
        });
      }
    }
  }
  await visit("");
  return rows;
}

async function withFixture(run) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "cvge-inventory-"));
  try {
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test("collector returns deterministic SHA-256 and reference evidence without mutating the tree", async () => {
  await withFixture(async (rootDir) => {
    await mkdir(path.join(rootDir, "src"), { recursive: true });
    await mkdir(path.join(rootDir, "docs"), { recursive: true });
    const targetBytes = Buffer.from("export const value = 7;\n", "utf8");
    await writeFile(path.join(rootDir, "src/used.js"), targetBytes);
    await writeFile(
      path.join(rootDir, "docs/references.md"),
      "src/used.js\nThe governed file remains src/used.js.\n",
      "utf8"
    );

    const before = await snapshotTree(rootDir);
    const { collectRepositoryEvidence } = await loadInventoryModule();
    const evidence = await collectRepositoryEvidence({
      rootDir,
      registry: registry([asset("asset:test:used", "src/used.js")]),
      now: FIXED_NOW
    });
    const after = await snapshotTree(rootDir);

    assert.deepEqual(after, before);
    assert.equal(evidence.generatedAt, FIXED_NOW);
    assert.equal(Object.isFrozen(evidence), true);
    assert.equal(Object.isFrozen(evidence.assets), true);
    assert.deepEqual(evidence.assets, [{
      assetId: "asset:test:used",
      path: "src/used.js",
      exists: true,
      kind: "file",
      size: targetBytes.length,
      sha256: sha256(targetBytes),
      referenceCount: 2,
      evidenceCodes: [
        "FILE_EXISTS",
        "REFERENCE_COUNT_COLLECTED",
        "SHA256_COLLECTED"
      ]
    }]);
  });
});

test("missing assets and symlinks escaping the repository fail closed", async () => {
  await withFixture(async (rootDir) => {
    const outsideDir = await mkdtemp(path.join(os.tmpdir(), "cvge-outside-"));
    try {
      await writeFile(path.join(outsideDir, "outside.js"), "secret", "utf8");
      await symlink(path.join(outsideDir, "outside.js"), path.join(rootDir, "escape.js"));

      const { collectRepositoryEvidence } = await loadInventoryModule();
      const evidence = await collectRepositoryEvidence({
        rootDir,
        registry: registry([
          asset("asset:test:missing", "missing.js"),
          asset("asset:test:escape", "escape.js")
        ]),
        now: FIXED_NOW
      });

      assert.deepEqual(evidence.assets, [
        {
          assetId: "asset:test:escape",
          path: "escape.js",
          exists: false,
          kind: "denied",
          size: null,
          sha256: null,
          referenceCount: 0,
          evidenceCodes: ["PATH_ESCAPE_DENIED"]
        },
        {
          assetId: "asset:test:missing",
          path: "missing.js",
          exists: false,
          kind: "missing",
          size: null,
          sha256: null,
          referenceCount: 0,
          evidenceCodes: ["ASSET_MISSING"]
        }
      ]);
      assert.equal("decision" in evidence.assets[0], false);
      assert.equal("decision" in evidence.assets[1], false);
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});

test("binary and oversized files are hashed but never parsed for references", async () => {
  await withFixture(async (rootDir) => {
    const binaryBytes = Buffer.from([0, 1, 2, 3, 4, 5]);
    await writeFile(path.join(rootDir, "asset.bin"), binaryBytes);
    const oversized = Buffer.alloc((2 * 1024 * 1024) + 64, 0x61);
    Buffer.from("asset.bin", "utf8").copy(oversized, oversized.length - 32);
    await writeFile(path.join(rootDir, "oversized.md"), oversized);

    const { collectRepositoryEvidence } = await loadInventoryModule();
    const evidence = await collectRepositoryEvidence({
      rootDir,
      registry: registry([asset("asset:test:binary", "asset.bin")]),
      now: FIXED_NOW
    });

    assert.equal(evidence.assets[0].sha256, sha256(binaryBytes));
    assert.equal(evidence.assets[0].referenceCount, 0);
    assert.deepEqual(evidence.assets[0].evidenceCodes, [
      "FILE_EXISTS",
      "REFERENCE_COUNT_COLLECTED",
      "SHA256_COLLECTED"
    ]);
    assert.equal((await stat(path.join(rootDir, "oversized.md"))).size, oversized.length);
  });
});

test("governance registry declarations are evidence metadata, not live dependencies", async () => {
  await withFixture(async (rootDir) => {
    const candidate = asset("asset:test:dead", "generated/dead.tmp");
    const fixtureRegistry = registry([candidate]);
    await mkdir(path.join(rootDir, "generated"), { recursive: true });
    await mkdir(path.join(rootDir, "project-control/value-governance"), { recursive: true });
    await writeFile(path.join(rootDir, candidate.path), "disposable\n", "utf8");
    await writeFile(
      path.join(rootDir, "project-control/value-governance/registry.v1.json"),
      `${JSON.stringify(fixtureRegistry, null, 2)}\n`,
      "utf8"
    );

    const { collectRepositoryEvidence } = await loadInventoryModule();
    const evidence = await collectRepositoryEvidence({
      rootDir,
      registry: fixtureRegistry,
      now: FIXED_NOW
    });

    assert.equal(evidence.assets[0].referenceCount, 0);
  });
});

test("inventory implementation has no network or subprocess dependency", async () => {
  await loadInventoryModule();
  const source = await readFile(inventoryPath, "utf8");
  assert.doesNotMatch(source, /node:(?:http|https|net|tls|dns|child_process)|\bfetch\s*\(|\bexec(?:File)?\s*\(|\bspawn\s*\(/);
});
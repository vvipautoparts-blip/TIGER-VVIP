"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const cliPath = path.resolve(
  __dirname,
  "../project-control/value-governance/cli.mjs"
);
const cliUrl = pathToFileURL(cliPath).href;
const qualityGatePath = path.resolve(__dirname, "../scripts/quality-gate.sh");
const FIXED_NOW = "2026-08-06T06:00:00.000Z";

async function loadCliModule() {
  return import(`${cliUrl}?test=${Date.now()}-${Math.random()}`);
}

function policy(overrides = {}) {
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
    allowProduction: false,
    ...overrides
  };
}

function registry(overrides = {}) {
  return {
    registryVersion: "CVGE_ASSET_REGISTRY_V1",
    policyVersion: "CVGE_REPOSITORY_V1",
    completeness: "INITIAL_CRITICAL_ASSETS_ONLY",
    assets: [{
      assetId: "asset:test:protected-control",
      type: "control",
      path: "controls/protected.mjs",
      purpose: "Protect the test control plane",
      accountableRole: "OWNER_ROOT",
      actionClass: "C",
      lifecycleState: "PROTECTED",
      protectedObligations: ["security", "audit"],
      expectedEvidence: ["file_exists", "sha256"],
      canonicalReplacement: null
    }],
    ...overrides
  };
}

function createSink() {
  let value = "";
  return {
    write(chunk) {
      value += String(chunk);
    },
    read() {
      return value;
    }
  };
}

async function snapshotTree(rootDir) {
  const rows = [];
  async function visit(relativeDir) {
    const absoluteDir = relativeDir ? path.join(rootDir, relativeDir) : rootDir;
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = relativeDir
        ? path.posix.join(relativeDir.split(path.sep).join("/"), entry.name)
        : entry.name;
      const absolutePath = path.join(rootDir, ...relativePath.split("/"));
      if (entry.isDirectory()) {
        rows.push({ path: relativePath, type: "directory" });
        await visit(relativePath);
      } else {
        const metadata = await stat(absolutePath);
        const bytes = await readFile(absolutePath);
        rows.push({
          path: relativePath,
          type: "file",
          size: metadata.size,
          content: bytes.toString("base64")
        });
      }
    }
  }
  await visit("");
  return rows;
}

async function createFixture({ policyValue = policy(), registryValue = registry(), rawRegistry } = {}) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "cvge-cli-"));
  await mkdir(path.join(rootDir, "project-control/value-governance"), { recursive: true });
  await mkdir(path.join(rootDir, "controls"), { recursive: true });
  await writeFile(
    path.join(rootDir, "project-control/value-governance/policy.v1.json"),
    `${JSON.stringify(policyValue, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(rootDir, "project-control/value-governance/registry.v1.json"),
    rawRegistry ?? `${JSON.stringify(registryValue, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(rootDir, "controls/protected.mjs"),
    "export const protectedControl = true;\n",
    "utf8"
  );
  return rootDir;
}

async function runCli({ rootDir, argv }) {
  const { runValueGovernanceCli } = await loadCliModule();
  const stdout = createSink();
  const stderr = createSink();
  const exitCode = await runValueGovernanceCli({
    argv,
    rootDir,
    stdout,
    stderr,
    now: () => FIXED_NOW
  });
  return {
    exitCode,
    stdout: stdout.read(),
    stderr: stderr.read()
  };
}

test("--check emits stable summary and leaves the repository unchanged", async () => {
  const rootDir = await createFixture();
  try {
    const before = await snapshotTree(rootDir);
    const result = await runCli({ rootDir, argv: ["--check"] });
    const after = await snapshotTree(rootDir);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^CVGE_REPOSITORY_CHECK=PASS\n/);
    assert.match(result.stdout, /CVGE_POLICY_VERSION=CVGE_REPOSITORY_V1\n/);
    assert.match(result.stdout, /CVGE_ASSETS_TOTAL=1\n/);
    assert.match(result.stdout, /CVGE_PREPARE_REMOVAL=0\n/);
    assert.match(result.stdout, /CVGE_QUARANTINE=0\n/);
    assert.match(result.stdout, /CVGE_NO_ACTION=1\n/);
    assert.match(result.stdout, /CVGE_PLAN_HASH=[a-f0-9]{64}\n$/);
    assert.deepEqual(after, before);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("--report-json emits bounded portable JSON without absolute paths", async () => {
  const rootDir = await createFixture();
  try {
    const result = await runCli({ rootDir, argv: ["--report-json"] });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    const parsed = JSON.parse(result.stdout);
    assert.match(parsed.planHash, /^[a-f0-9]{64}$/);
    assert.equal(parsed.generatedAt, FIXED_NOW);
    assert.equal(parsed.summary.total, 1);
    assert.equal(parsed.decisions[0].path, "controls/protected.mjs");
    assert.equal(JSON.stringify(parsed).includes(rootDir), false);
    assert.equal(JSON.stringify(parsed).includes(os.tmpdir()), false);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("unsafe protected cleanup policy exits 3 without raw errors", async () => {
  const rootDir = await createFixture({
    policyValue: policy({ automaticRemovalClasses: ["A", "C"] })
  });
  try {
    const result = await runCli({ rootDir, argv: ["--check"] });
    assert.equal(result.exitCode, 3);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "CVGE_CHECK=FAIL CODE=ACTION_CLASS_DENIED\n");
    assert.doesNotMatch(result.stderr, /Error:| at |\/tmp\//);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("malformed registry and unknown flags exit 2 without stack traces", async () => {
  const malformedRoot = await createFixture({ rawRegistry: "{not-json\n" });
  const validRoot = await createFixture();
  try {
    const malformed = await runCli({ rootDir: malformedRoot, argv: ["--check"] });
    assert.equal(malformed.exitCode, 2);
    assert.equal(malformed.stderr, "CVGE_CHECK=FAIL CODE=ASSET_REGISTRY_INVALID\n");
    assert.doesNotMatch(malformed.stderr, /SyntaxError|Error:| at /);

    const unknown = await runCli({ rootDir: validRoot, argv: ["--delete"] });
    assert.equal(unknown.exitCode, 2);
    assert.equal(unknown.stdout, "");
    assert.equal(unknown.stderr, "CVGE_CHECK=FAIL CODE=CLI_ARGUMENT_INVALID\n");
  } finally {
    await rm(malformedRoot, { recursive: true, force: true });
    await rm(validRoot, { recursive: true, force: true });
  }
});

test("quality gate invokes continuous value governance exactly once", async () => {
  const source = await readFile(qualityGatePath, "utf8");
  assert.equal((source.match(/"continuous_value_governance"/g) || []).length, 1);
  assert.equal((source.match(/node project-control\/value-governance\/cli\.mjs --check/g) || []).length, 1);
  assert.doesNotMatch(source, /value-governance\/cli\.mjs\s+--(?:delete|execute|cleanup|production)/);
});

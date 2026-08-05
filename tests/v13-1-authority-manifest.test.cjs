const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const baselineRoot = path.join(repoRoot, 'project-control/v13.1');
const validatorPath = path.join(
  repoRoot,
  'project-control/scripts/validate_v13_1_authority.mjs'
);

function runValidator(root = baselineRoot) {
  return spawnSync(process.execPath, [validatorPath, '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function parseReport(result) {
  const output = result.status === 0 ? result.stdout : result.stderr;
  assert.ok(output.trim(), 'validator must emit a JSON report');
  return JSON.parse(output);
}

function assertFailureCode(result, expectedCode) {
  assert.notEqual(result.status, 0, result.stdout);
  const report = parseReport(result);
  assert.equal(report.status, 'FAIL');
  assert.ok(
    report.failures.some((failure) => failure.code === expectedCode),
    `expected ${expectedCode}; got ${JSON.stringify(report.failures)}`
  );
}

function withPackageCopy(action) {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'vvip-v13-1-manifest-'));
  const tempRoot = path.join(tempParent, 'v13.1');
  fs.cpSync(baselineRoot, tempRoot, { recursive: true });
  action(tempRoot);

  return {
    root: tempRoot,
    cleanup() {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  };
}

test('baseline authority package includes a complete conflict registry and signed manifest', () => {
  assert.ok(
    fs.existsSync(path.join(baselineRoot, 'contracts/conflict_registry.json')),
    'conflict_registry.json is required'
  );
  assert.ok(
    fs.existsSync(path.join(baselineRoot, 'authority-manifest.json')),
    'authority-manifest.json is required'
  );

  const result = runValidator();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = parseReport(result);
  assert.equal(report.conflict_count, 6);
  assert.equal(report.manifest_artifact_count, 2);
});

test('missing conflict registry fails closed', () => {
  const fixture = withPackageCopy((root) => {
    fs.rmSync(path.join(root, 'contracts/conflict_registry.json'), {
      force: true
    });
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_CONFLICT_REGISTRY_MISSING'
    );
  } finally {
    fixture.cleanup();
  }
});

test('missing manifest fails closed', () => {
  const fixture = withPackageCopy((root) => {
    fs.rmSync(path.join(root, 'authority-manifest.json'), { force: true });
  });

  try {
    assertFailureCode(runValidator(fixture.root), 'V13_MANIFEST_MISSING');
  } finally {
    fixture.cleanup();
  }
});

test('tampering with the owner constitution invalidates its manifest hash', () => {
  const fixture = withPackageCopy((root) => {
    const constitutionPath = path.join(
      root,
      'contracts/owner_constitution.json'
    );
    fs.appendFileSync(constitutionPath, '\n', 'utf8');
  });

  try {
    assertFailureCode(
      runValidator(fixture.root),
      'V13_MANIFEST_HASH_MISMATCH'
    );
  } finally {
    fixture.cleanup();
  }
});

test('conflict registry covers every required legacy override exactly once', () => {
  const registryPath = path.join(
    baselineRoot,
    'contracts/conflict_registry.json'
  );
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const ids = registry.conflicts.map((conflict) => conflict.legacy_rule_id);

  assert.deepEqual(ids, [
    'GLOBAL_IMAGE_LIMIT_10',
    'GLOBAL_FIXED_IMPRESSIONS_250',
    'GLOBAL_FIXED_IMPRESSIONS_400',
    'CHAT_FORBIDDEN',
    'DELIVERY_FORBIDDEN',
    'MEDIATION_FORBIDDEN'
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(
    registry.conflicts.every(
      (conflict) =>
        conflict.classification === 'SUPERSEDED_BY_V13_1_OWNER_FINAL' &&
        conflict.enforcement === 'BLOCK_LEGACY_RULE'
    )
  );
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const provenance = require('../scripts/ai/sovereign-release-provenance');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function fixtureManifest(overrides = {}) {
  return {
    schemaVersion: 'TIGER_RELEASE_PROVENANCE_MANIFEST_V1',
    groups: {
      frontend: ['frontend.html'],
      backend: ['backend.js'],
      aiPolicy: ['policy.md'],
      promptModel: ['model-contract.js'],
      toolRegistry: ['tool-registry.js'],
      rlsPolicy: ['supabase/migrations/001_init.sql'],
      securityConfig: ['security.yml'],
    },
    migrationsDirectory: 'supabase/migrations',
    ...overrides,
  };
}

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiger-provenance-'));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'ci@vvip.invalid']);
  git(root, ['config', 'user.name', 'VVIP CI']);

  write(root, 'frontend.html', '<main>VVIP</main>\n');
  write(root, 'backend.js', "module.exports = 'backend';\n");
  write(root, 'policy.md', '# Constitution\n');
  write(root, 'model-contract.js', "module.exports = 'contract';\n");
  write(root, 'tool-registry.js', "module.exports = 'tools';\n");
  write(root, 'security.yml', 'fail_closed: true\n');
  write(root, 'supabase/migrations/001_init.sql', 'create table if not exists public.proof(id bigint);\n');
  write(root, 'data/ai/sovereign-release-provenance.json', `${JSON.stringify(fixtureManifest(), null, 2)}\n`);

  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fixture']);
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('AI-17 exports the trusted provenance API', () => {
  assert.equal(typeof provenance.createTrustedRepositoryContext, 'function');
  assert.equal(typeof provenance.buildReleaseProvenance, 'function');
  assert.equal(typeof provenance.verifyReleaseProvenanceIntegrity, 'function');
});

test('AI-17 derives deterministic provenance from a clean Git checkout', () => {
  const root = createRepo();
  try {
    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    const first = provenance.buildReleaseProvenance({
      trustedContext,
      manifestPath: 'data/ai/sovereign-release-provenance.json',
    });
    const second = provenance.buildReleaseProvenance({
      trustedContext,
      manifestPath: 'data/ai/sovereign-release-provenance.json',
    });

    assert.equal(first.schemaVersion, 'TIGER_RELEASE_PROVENANCE_V1');
    assert.equal(first.provenanceClass, 'TRUSTED_GIT_CHECKOUT');
    assert.equal(first.repository.clean, true);
    assert.match(first.repository.commitSha, /^[0-9a-f]{40,64}$/);
    assert.match(first.repository.treeSha, /^[0-9a-f]{40,64}$/);
    assert.match(first.digest, /^[0-9a-f]{64}$/);
    assert.equal(first.digest, second.digest);
    assert.equal(first.buildArtifactAttested, false);
    assert.equal(first.deploymentAttested, false);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(provenance.verifyReleaseProvenanceIntegrity(first), true);
  } finally {
    cleanup(root);
  }
});

test('AI-17 rejects dirty worktrees before verified provenance exists', () => {
  const root = createRepo();
  try {
    write(root, 'backend.js', "module.exports = 'dirty';\n");
    assert.throws(
      () => provenance.createTrustedRepositoryContext({ repositoryRoot: root }),
      /PROVENANCE_WORKTREE_DIRTY/,
    );
  } finally {
    cleanup(root);
  }
});

test('AI-17 trusted repository context cannot be forged by JSON copying', () => {
  const root = createRepo();
  try {
    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    const forged = JSON.parse(JSON.stringify(trustedContext));
    assert.throws(
      () => provenance.buildReleaseProvenance({
        trustedContext: forged,
        manifestPath: 'data/ai/sovereign-release-provenance.json',
      }),
      /PROVENANCE_CONTEXT_UNTRUSTED/,
    );
  } finally {
    cleanup(root);
  }
});

test('AI-17 rejects caller-supplied component hashes and unknown build fields', () => {
  const root = createRepo();
  try {
    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    assert.throws(
      () => provenance.buildReleaseProvenance({
        trustedContext,
        manifestPath: 'data/ai/sovereign-release-provenance.json',
        componentHashes: { backend: '0'.repeat(64) },
      }),
      /PROVENANCE_BUILD_UNKNOWN_FIELD/,
    );
  } finally {
    cleanup(root);
  }
});

test('AI-17 rejects manifest path traversal', () => {
  const root = createRepo();
  try {
    const manifest = fixtureManifest();
    manifest.groups.backend = ['../outside.js'];
    write(root, 'data/ai/sovereign-release-provenance.json', `${JSON.stringify(manifest, null, 2)}\n`);
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'bad traversal manifest']);

    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    assert.throws(
      () => provenance.buildReleaseProvenance({
        trustedContext,
        manifestPath: 'data/ai/sovereign-release-provenance.json',
      }),
      /PROVENANCE_PATH_INVALID|PROVENANCE_PATH_ESCAPE/,
    );
  } finally {
    cleanup(root);
  }
});

test('AI-17 rejects measured symlinks even when they point inside the repository', () => {
  const root = createRepo();
  try {
    fs.symlinkSync(path.join(root, 'backend.js'), path.join(root, 'backend-link.js'));
    const manifest = fixtureManifest();
    manifest.groups.backend = ['backend-link.js'];
    write(root, 'data/ai/sovereign-release-provenance.json', `${JSON.stringify(manifest, null, 2)}\n`);
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'symlink fixture']);

    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    assert.throws(
      () => provenance.buildReleaseProvenance({
        trustedContext,
        manifestPath: 'data/ai/sovereign-release-provenance.json',
      }),
      /PROVENANCE_SYMLINK_REJECTED/,
    );
  } finally {
    cleanup(root);
  }
});

test('AI-17 changes provenance after a committed byte mutation', () => {
  const root = createRepo();
  try {
    const firstContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    const first = provenance.buildReleaseProvenance({
      trustedContext: firstContext,
      manifestPath: 'data/ai/sovereign-release-provenance.json',
    });

    write(root, 'backend.js', "module.exports = 'changed';\n");
    git(root, ['add', 'backend.js']);
    git(root, ['commit', '-m', 'change backend']);

    const secondContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    const second = provenance.buildReleaseProvenance({
      trustedContext: secondContext,
      manifestPath: 'data/ai/sovereign-release-provenance.json',
    });

    assert.notEqual(first.repository.commitSha, second.repository.commitSha);
    assert.notEqual(first.components.backend, second.components.backend);
    assert.notEqual(first.digest, second.digest);
  } finally {
    cleanup(root);
  }
});

test('AI-17 integrity verification rejects tampered provenance', () => {
  const root = createRepo();
  try {
    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    const built = provenance.buildReleaseProvenance({
      trustedContext,
      manifestPath: 'data/ai/sovereign-release-provenance.json',
    });
    const tampered = JSON.parse(JSON.stringify(built));
    tampered.components.backend = 'f'.repeat(64);
    assert.equal(provenance.verifyReleaseProvenanceIntegrity(tampered), false);
  } finally {
    cleanup(root);
  }
});

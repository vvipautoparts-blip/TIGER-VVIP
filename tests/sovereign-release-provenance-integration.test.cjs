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

function createFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiger-provenance-stale-'));
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
  write(root, 'data/ai/sovereign-release-provenance.json', `${JSON.stringify({
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
  }, null, 2)}\n`);

  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fixture']);
  return root;
}

test('AI-17 rejects a once-trusted context after HEAD changes', () => {
  const root = createFixtureRepo();
  try {
    const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot: root });
    write(root, 'backend.js', "module.exports = 'new-head';\n");
    git(root, ['add', 'backend.js']);
    git(root, ['commit', '-m', 'new head']);

    assert.throws(
      () => provenance.buildReleaseProvenance({
        trustedContext,
        manifestPath: 'data/ai/sovereign-release-provenance.json',
      }),
      /PROVENANCE_CONTEXT_STALE/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('AI-17 production manifest resolves against the actual checked-out repository', () => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const trustedContext = provenance.createTrustedRepositoryContext({ repositoryRoot });
  const built = provenance.buildReleaseProvenance({
    trustedContext,
    manifestPath: 'data/ai/sovereign-release-provenance.json',
  });

  assert.equal(provenance.verifyReleaseProvenanceIntegrity(built), true);
  assert.equal(built.repository.commitSha, trustedContext.commitSha);
  assert.equal(built.repository.treeSha, trustedContext.treeSha);
  assert.match(built.components.aiPolicy, /^[0-9a-f]{64}$/);
  assert.match(built.components.backend, /^[0-9a-f]{64}$/);
  assert.ok(built.migrationDigests.length >= 2);
  assert.ok(built.migrationDigests.every((entry) => entry.path.startsWith('supabase/migrations/')));
  assert.equal(built.buildArtifactAttested, false);
  assert.equal(built.deploymentAttested, false);
});

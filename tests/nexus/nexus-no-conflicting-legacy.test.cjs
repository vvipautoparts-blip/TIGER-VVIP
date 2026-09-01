'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const scanRoots = ['index.html', 'scripts', 'styles', 'config', 'docs/owner-control'];
const prohibited = [
  /PULSE_(3|25|35|80|120)\b/,
  /\b(?:3\s*\/\s*10\s*\/\s*25|10\s*\/\s*35\s*\/\s*80\s*\/\s*120)\b/,
  /duration_days/i,
  /timed activation card/i,
  /publishing entitlement card/i,
  /paid publishing slot/i,
  /requestPublication\s*\(/,
  /social-nav-item--inactive/,
  /mountCapabilityMenu\(null\s*,\s*document\)/
];
const excludedDirNames = new Set(['.git', 'node_modules', 'docs/superpowers/specs', 'docs/superpowers/plans']);

function walk(entry, output = []) {
  const stat = fs.statSync(entry);
  if (stat.isFile()) {
    output.push(entry);
    return output;
  }
  for (const name of fs.readdirSync(entry)) {
    const next = path.join(entry, name);
    const relative = path.relative(root, next).replaceAll('\\', '/');
    if ([...excludedDirNames].some((excluded) => relative === excluded || relative.startsWith(`${excluded}/`))) continue;
    walk(next, output);
  }
  return output;
}

test('current runtime and current authority tree contain no superseded NEXUS conflicts', () => {
  const files = scanRoots.flatMap((entry) => walk(path.join(root, entry)));
  const hits = [];
  for (const file of files) {
    if (!/\.(?:js|cjs|mjs|json|md|html|css|sql|yml|yaml)$/i.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of prohibited) {
      if (pattern.test(text)) hits.push(`${path.relative(root, file)} :: ${pattern}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('superseded Marketplace creation publication and parallel runtime surfaces are physically deleted', () => {
  const removed = [
    'scripts/fusion/progressive-composer.js',
    'styles/fusion/progressive-composer.css',
    'tests/fusion-progressive-composer.test.cjs',
    'tests/fusion-composer-integration.test.cjs',
    'scripts/vvip-pr31-create-listing-shell.js',
    'styles/vvip-pr31-create-listing-shell.css',
    'scripts/vvip-pr32-draft-preview.js',
    'styles/vvip-pr32-draft-preview.css',
    'scripts/vvip-pr33-publish-readiness.js',
    'styles/vvip-pr33-publish-readiness.css',
    'scripts/runtime/vvip-my-listings.js',
    'scripts/fusion/f02-feed.js',
    'scripts/fusion/runtime-adapters.js',
    'scripts/fusion/marketplace-context.js',
    'scripts/runtime/vvip-marketplace-repository.js',
    'scripts/vvip-production-marketplace.js',
    'styles/vvip-production-marketplace.css',
    'scripts/fusion/synapse.js',
    'styles/fusion/synapse.css'
  ];
  for (const relative of removed) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must stay physically deleted`);
  }
});

test('public release graph is NEXUS-only and cannot re-inject parallel Marketplace runtime', () => {
  const release = fs.readFileSync(path.join(root, 'tools/vvip_public_release.py'), 'utf8');
  assert.match(release, /scripts\/nexus\/sector-discovery\.js/);
  for (const marker of [
    'scripts/runtime/vvip-marketplace-repository.js',
    'scripts/fusion/runtime-adapters.js',
    'scripts/fusion/marketplace-context.js',
    'scripts/fusion/f02-feed.js',
    'href="#marketplace"'
  ]) {
    assert.equal(release.includes(marker), false, `${marker} must not exist in the sealed NEXUS release graph`);
  }
});

test('current index exposes one NEXUS creation entry and no parallel Marketplace product identity', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(index, /data-marketplace-listing-trigger/);
  assert.doesNotMatch(index, /data-fusion-composer-trigger/);
  assert.doesNotMatch(index, /data-nexus-create-context=["']marketplace["']/i);
  assert.doesNotMatch(index, /nexus-marketplace-create/i);
  assert.doesNotMatch(index, /VVIP\s+TIGER\s+MARKETPLACE/i);
  assert.doesNotMatch(index, /المنشورات والإعلانات التجارية/);
  const createTriggers = index.match(/data-social-post-trigger/g) || [];
  assert.equal(createTriggers.length, 1, 'NEXUS must expose one creation trigger only');
});

test('superseded client Pulse vault model is physically deleted with no fallback globals', () => {
  for (const relative of [
    'scripts/nexus/pulse-vault.js',
    'tests/nexus/pulse-vault.test.cjs'
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must stay physically deleted`);
  }
  const bootstrap = fs.readFileSync(path.join(root, 'scripts/nexus/bootstrap.js'), 'utf8');
  const surface = fs.readFileSync(path.join(root, 'scripts/nexus/pulse-surface.js'), 'utf8');
  for (const source of [bootstrap, surface]) {
    assert.doesNotMatch(source, /TIGERPulseVaultCurrent|VVIPPulseVaultCurrent|TIGERNexusPulseVault|TIGERNexusPulseCommands|derivePulseVault/);
  }
});

test('no current-tree archive trash or legacy directory preserves superseded product behavior', () => {
  const suspicious = [];
  function scanDirs(entry) {
    if (!fs.existsSync(entry) || !fs.statSync(entry).isDirectory()) return;
    for (const name of fs.readdirSync(entry)) {
      const next = path.join(entry, name);
      if (!fs.statSync(next).isDirectory()) continue;
      if (/^(?:archive|trash|legacy)$/i.test(name)) suspicious.push(path.relative(root, next));
      if (name !== '.git' && name !== 'node_modules') scanDirs(next);
    }
  }
  scanDirs(root);
  assert.deepEqual(suspicious, []);
});

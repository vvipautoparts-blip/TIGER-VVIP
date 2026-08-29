'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const scanRoots = ['index.html', 'scripts', 'styles', 'config', 'docs/owner-control'];
const prohibited = [
  /PULSE_(3|20|35|80|120)\b/,
  /\b(?:3\s*\/\s*10\s*\/\s*20|10\s*\/\s*35\s*\/\s*80\s*\/\s*120)\b/,
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

test('superseded Marketplace wizard is deleted, not hidden or retained as a second creation path', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const removed = [
    'scripts/fusion/progressive-composer.js',
    'styles/fusion/progressive-composer.css',
    'tests/fusion-progressive-composer.test.cjs',
    'tests/fusion-composer-integration.test.cjs'
  ];
  for (const relative of removed) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must stay physically deleted`);
  }
  assert.doesNotMatch(index, /data-marketplace-listing-trigger/);
  assert.doesNotMatch(index, /data-fusion-composer-trigger/);
  assert.doesNotMatch(index, /scripts\/fusion\/progressive-composer\.js/);
  assert.doesNotMatch(index, /styles\/fusion\/progressive-composer\.css/);
  assert.match(index, /data-nexus-create-context="marketplace"[^>]*data-social-post-trigger|data-social-post-trigger[^>]*data-nexus-create-context="marketplace"/);
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

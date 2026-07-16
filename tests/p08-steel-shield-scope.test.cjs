#!/usr/bin/env node
const assert = require('assert');
const { execSync } = require('child_process');

const output = execSync(
  "find docs/security/p08-steel-shield scripts/security/p08-steel-shield tests -maxdepth 3 -type f | grep -E '^docs/security/p08-steel-shield/|^scripts/security/p08-steel-shield/|^tests/p08-steel-shield-.*\\.test\\.cjs$'",
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean);

assert.strictEqual(output.length, 21, `Expected 21 files, got ${output.length}`);

for (const p of output) {
  const allowed =
    p.startsWith('docs/security/p08-steel-shield/') ||
    p.startsWith('scripts/security/p08-steel-shield/') ||
    /^tests\/p08-steel-shield-.*\.test\.cjs$/.test(p);
  assert.ok(allowed, `Out-of-scope path detected: ${p}`);
}

console.log('PASS: scope is restricted and filesystem file count is 21');

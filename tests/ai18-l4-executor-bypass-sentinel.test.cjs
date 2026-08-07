'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PRODUCTION_ROOTS = [
  path.join(ROOT, 'scripts', 'ai'),
  path.join(ROOT, 'supabase', 'functions'),
];
const ALLOWED = new Set([
  path.normalize(path.join(ROOT, 'scripts', 'ai', 'sovereign-tool-registry.js')),
  path.normalize(path.join(ROOT, 'scripts', 'ai', 'sovereign-protected-tool-executor.js')),
]);

function walk(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.isFile() && /\.(?:js|cjs|mjs|ts|tsx)$/.test(entry.name)) output.push(full);
  }
  return output;
}

test('AI-18 production code cannot bypass the protected L4 executor', () => {
  const offenders = [];
  for (const file of PRODUCTION_ROOTS.flatMap((root) => walk(root))) {
    const normalized = path.normalize(file);
    if (ALLOWED.has(normalized)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/\bexecuteRegisteredTool\b/.test(source)) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `L4 executor primitive may only be used inside sovereign-protected-tool-executor.js: ${offenders.join(', ')}`,
  );
});

test('AI-18 protected executor documents mandatory L4 routing', () => {
  const protectedPath = path.join(ROOT, 'scripts', 'ai', 'sovereign-protected-tool-executor.js');
  const source = fs.readFileSync(protectedPath, 'utf8');
  assert.match(source, /All L4 production call sites are required/);
  assert.match(source, /consumeVerifiedStepUp/);
  assert.match(source, /STEPUP_PERSISTENCE_CONSUMER_UNTRUSTED/);
});

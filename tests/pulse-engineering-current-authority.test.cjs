'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const relative = 'docs/owner-control/TIGER_PULSE_ENGINEERING_EXECUTION_REFERENCE.md';
const source = fs.readFileSync(path.join(root, relative), 'utf8');

test('Pulse engineering reference is subordinate to current owner and NEXUS/Pulse authorities', () => {
  assert.match(source, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(source, /TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(source, /TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.doesNotMatch(source, /OWNER_BINDING_DECISIONS_2026-08-12\.md/);
  assert.match(source, /2\s*\/\s*10\s*\/\s*20\s*\/\s*45/);
  assert.match(source, /NOW\s*\/\s*SMART\s*\/\s*PRECISE/);
});

test('Pulse engineering reference matches current ProofView and zero-burn runtime', () => {
  assert.match(source, /50%/);
  assert.match(source, /2000\s*ms/i);
  assert.match(source, /RESERVE\s*→\s*SERVE\s*→\s*VERIFY\s*→\s*CONSUME/);
  assert.match(source, /ZERO-BURN|zero burn/i);
  assert.doesNotMatch(source, />=60%/);
  assert.doesNotMatch(source, />=1000ms/);
  assert.doesNotMatch(source, /24h dedupe/i);
});

test('Pulse engineering reference cannot restore money-wallet subscriptions or a parallel execution program', () => {
  assert.doesNotMatch(source, /wallet\/top-up funding/i);
  assert.doesNotMatch(source, /pulse\.wallet\./i);
  assert.doesNotMatch(source, /subscriptions;/i);
  assert.doesNotMatch(source, /PULSE-A|PULSE-B|PULSE-C|PULSE-D|PULSE-E|PULSE-F|PULSE-G|PULSE-H/);
  assert.match(source, /Pulse Vault/i);
  assert.match(source, /not money|not a money wallet/i);
  assert.match(source, /PR #349/);
});

test('Pulse engineering reference preserves current finance fail-closed boundary', () => {
  assert.match(source, /TAX_RESERVE[\s\S]{0,100}(?:CANCELLED|cancelled)/i);
  assert.match(source, /84%/);
  assert.match(source, /16%[\s\S]{0,120}pending/i);
  assert.match(source, /CSR[\s\S]{0,80}3%/i);
  assert.match(source, /distribution[\s\S]{0,120}fail-closed/i);
});

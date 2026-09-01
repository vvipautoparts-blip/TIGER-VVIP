'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const ownerRefPath = path.join(root, 'docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
const nexusAuthorityPath = path.join(root, 'docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md');
const authorityConfigPath = path.join(root, 'config/fusion/current-authority.json');

function readText(filePath) { return fs.readFileSync(filePath, 'utf8'); }
function readJson(filePath) { return JSON.parse(readText(filePath)); }

test('current owner reference declares TIGER NEXUS 2026 as social-first sector-specialized authority', () => {
  const text = readText(ownerRefPath);
  assert.match(text, /TIGER NEXUS/i);
  assert.match(text, /SOCIAL_NETWORK_FIRST/);
  assert.match(text, /قطاع|sector/i);
  assert.match(text, /ماذا تعرض أو تحتاج/);
});

test('NEXUS owner authority forbids parallel products and compatibility fallbacks', () => {
  const text = readText(nexusAuthorityPath);
  assert.match(text, /NO_PARALLEL_PRODUCT/);
  assert.match(text, /one canonical|واحد|only product creation entry/i);
  assert.match(text, /parallel Marketplace product/i);
  assert.match(text, /compatibility composer/i);
  assert.match(text, /Git history/i);
});

test('current authority machine config declares non-expiring Pulse Vault and NEXUS delivery modes', () => {
  const config = readJson(authorityConfigPath);
  const serialized = JSON.stringify(config);
  assert.match(serialized, /NEXUS/i);
  assert.match(serialized, /PULSE_VAULT/i);
  assert.match(serialized, /NOW/);
  assert.match(serialized, /SMART/);
  assert.match(serialized, /PRECISE/);
  assert.doesNotMatch(serialized, /duration_days|product_expiry|expires_in_days/i);
});

test('current authority keeps latest-only deletion semantics with no archive trash or fallback preservation', () => {
  const text = readText(ownerRefPath);
  assert.match(text, /NO_FALLBACK/);
  assert.match(text, /Git history/i);
  assert.match(text, /حذف|delete/i);
  assert.match(text, /archive|أرشيف/i);
  assert.match(text, /trash|تراش/i);
});

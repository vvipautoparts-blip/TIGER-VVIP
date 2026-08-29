'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../scripts/nexus/pulse-surface.js'), 'utf8');

test('Pulse surface installs the server-backed vault and owner-object entry point', () => {
  assert.match(source, /export\s+async\s+function\s+installPulseSurface/);
  assert.match(source, /createPulseRuntime/);
  assert.match(source, /data-nexus-pulse-vault/);
  assert.match(source, /data-nexus-pulse-trigger/);
  assert.match(source, /ownedPostIds/);
});

test('Pulse surface renders Opportunity Radar and Auto-Freeze copy from the dedicated contract', () => {
  assert.match(source, /deriveOpportunityState/);
  assert.match(source, /opportunityState/);
  assert.match(source, /AUTO_FREEZE_MESSAGE_AR/);
});

test('Pulse surface re-enhances asynchronously rendered feed objects without inventing ownership', () => {
  assert.match(source, /MutationObserver/);
  assert.match(source, /data-social-post-id/);
  assert.match(source, /ownedPostIds\.has\(postId\)/);
  assert.doesNotMatch(source, /getAttribute\(['"]data-nexus-sector|getAttribute\(['"]data-nexus-intent/);
});

test('legacy client snapshot fallback names are absent', () => {
  assert.doesNotMatch(source, /TIGERPulseVaultCurrent|VVIPPulseVaultCurrent|TIGERNexusPulseVault|TIGERNexusPulseCommands/);
});

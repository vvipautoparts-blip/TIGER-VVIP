'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync(path.resolve(__dirname, '../../scripts/nexus/bootstrap.js'), 'utf8');

test('bootstrap hydrates server-enabled sectors into the canonical static NEXUS select', () => {
  assert.match(source, /function hydrateSectorOptions\s*\(/);
  assert.match(source, /querySelector\('\[data-nexus-sector\]'\)/);
  assert.match(source, /enabledSectors\(root\)/);
  assert.match(source, /NEXUS_CANONICAL_DOM_REQUIRED/);
  assert.doesNotMatch(source, /createElement\(['"]select['"]\)/);
  assert.doesNotMatch(source, /insertBefore\(/);
});

test('bootstrap delegates Pulse to the server-backed Pulse surface only', () => {
  assert.match(source, /import \{ installPulseSurface \} from '\.\/pulse-surface\.js'/);
  assert.match(source, /void installPulseSurface\(root\)/);
  assert.doesNotMatch(source, /derivePulseVault|candidateVaultSnapshot|TIGERPulseVaultCurrent|VVIPPulseVaultCurrent|TIGERNexusPulseVault|TIGERNexusPulseCommands/);
});

test('bootstrap contains no compatibility cleanup for absent superseded navigation', () => {
  assert.doesNotMatch(source, /social-nav-item--inactive/);
  assert.doesNotMatch(source, /querySelectorAll\([^)]*inactive/);
});

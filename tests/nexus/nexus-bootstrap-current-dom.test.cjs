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
});

test('bootstrap delegates Pulse to the latest-only server-backed Pulse surface', () => {
  assert.match(source, /import \{ installPulseSurface \} from '\.\/pulse-surface\.js'/);
  assert.match(source, /void installPulseSurface\(root\)/);
  assert.doesNotMatch(source, /derivePulseVault|candidateVaultSnapshot|TIGERPulseVaultCurrent|VVIPPulseVaultCurrent|TIGERNexusPulseVault|TIGERNexusPulseCommands/);
});

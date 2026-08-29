'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const gate = fs.readFileSync('scripts/quality-gate.sh', 'utf8');

test('quality gate explicitly runs nested NEXUS contracts', () => {
  assert.match(gate, /tests\/nexus\/\*\.test\.cjs|find\s+tests\/nexus[\s\S]*\.test\.cjs/);
  assert.match(gate, /node_nexus_contracts/);
});

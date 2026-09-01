'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../styles/nexus/nexus.css'), 'utf8');

test('NEXUS CSS styles the current Pulse object, allocation, group, status and opportunity surfaces', () => {
  for (const selector of [
    '.nexus-pulse-object-trigger',
    '.nexus-pulse-allocation',
    '.nexus-pulse-group',
    '.nexus-pulse-status',
    '.nexus-opportunity',
    '[data-nexus-auto-freeze="true"]',
  ]) assert.match(source, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const capability = fs.readFileSync(path.join(root, 'scripts/fusion/f03-capability-menu.js'), 'utf8');
const accountPath = path.join(root, 'scripts/fusion/account-surface.js');
const retiredPrivateProfilePath = path.join(root, 'private-profile-p03.html');

test('account and settings live inside the authoritative Single Surface', () => {
  assert.match(index, /data-fusion-account-trigger/);
  assert.match(index, /data-fusion-account-sheet/);
  assert.match(index, /data-fusion-profile-host/);
  assert.match(index, /data-fusion-settings-host/);
  assert.match(index, /scripts\/fusion\/account-surface\.js/);
});

test('account surface protects account entry through the existing auth authority', () => {
  const source = fs.readFileSync(accountPath, 'utf8');
  assert.match(source, /VVIP_AUTH/);
  assert.match(source, /requireAuth/);
  assert.match(source, /OPEN_ACCOUNT/);
  assert.doesNotMatch(source, /localStorage[^\n]*(admin|owner|super_admin)/i);
});

test('retired standalone private profile route is physically absent and cannot be linked from NEXUS', () => {
  assert.equal(fs.existsSync(retiredPrivateProfilePath), false);
  assert.doesNotMatch(index, /private-profile-p03\.html/i);
  assert.doesNotMatch(index, /data-fusion-profile-migration-bridge/);
  assert.match(index, /data-vvip-fusion-authoritative/);
});

test('capability menu fails closed and never infers privilege from browser roles', () => {
  assert.match(capability, /deriveCapabilityMenuEntries/);
  assert.match(capability, /if\s*\(!isValidatedView\(view\)\)\s*return\s+EMPTY_ENTRIES/);
  assert.doesNotMatch(capability, /localStorage/);
  assert.doesNotMatch(capability, /super_admin/);
});

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/fusion/f03-capability-menu.js')).href;

async function loadSubject() {
  return import(moduleUrl);
}

test('validated capability view derives a human-readable passport', async () => {
  const { deriveCapabilityPassport } = await loadSubject();
  const view = Object.freeze({
    ok: true,
    code: 'OK',
    actor: Object.freeze({
      id: 'actor:owner:0001',
      authorityClass: 'OWNER_ROOT',
      scope: Object.freeze({ level: 'platform', country: null }),
      policyVersion: 'V13.1',
      assignmentRevision: 7
    }),
    entries: Object.freeze([
      Object.freeze({ id: 'my-capabilities', label: 'My capabilities' }),
      Object.freeze({ id: 'countries', label: 'Countries' })
    ])
  });

  assert.deepEqual(deriveCapabilityPassport(view), {
    ok: true,
    title: 'صلاحياتي',
    authorityClass: 'OWNER_ROOT',
    scopeLabel: 'المنصة العالمية',
    status: 'نشطة',
    actions: [
      { id: 'my-capabilities', label: 'My capabilities' },
      { id: 'countries', label: 'Countries' }
    ]
  });
});

test('invalid or null capability state fails closed and exposes no privileged actions', async () => {
  const { deriveCapabilityPassport } = await loadSubject();
  assert.deepEqual(deriveCapabilityPassport(null), {
    ok: false,
    title: 'صلاحياتي',
    authorityClass: null,
    scopeLabel: null,
    status: 'غير متاحة',
    actions: []
  });
});

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/living-sector-object.js')).href;

async function loadSubject() {
  return import(moduleUrl);
}

test('accepts only current NEXUS intent classes', async () => {
  const { normalizeNexusIntent } = await loadSubject();
  assert.equal(normalizeNexusIntent('offer'), 'OFFER');
  assert.equal(normalizeNexusIntent(' NEED '), 'NEED');
  assert.equal(normalizeNexusIntent('service'), 'SERVICE');
  assert.equal(normalizeNexusIntent('opportunity'), 'OPPORTUNITY');
  assert.equal(normalizeNexusIntent('chat'), null);
});

test('rejects a Living Sector draft without an activated sector or intent', async () => {
  const { validateLivingSectorDraft } = await loadSubject();
  assert.deepEqual(validateLivingSectorDraft({ sectorId: '', intent: 'OFFER', text: 'سيارة للبيع' }), {
    ok: false,
    code: 'NEXUS_SECTOR_REQUIRED'
  });
  assert.deepEqual(validateLivingSectorDraft({ sectorId: 'vehicles', intent: '', text: 'سيارة للبيع' }), {
    ok: false,
    code: 'NEXUS_INTENT_REQUIRED'
  });
});

test('accepts a sector-bound purposeful draft', async () => {
  const { validateLivingSectorDraft } = await loadSubject();
  assert.deepEqual(validateLivingSectorDraft({ sectorId: 'vehicles', intent: 'offer', text: 'هيونداي كونا 2020' }), {
    ok: true,
    code: 'OK',
    value: {
      sectorId: 'vehicles',
      intent: 'OFFER',
      text: 'هيونداي كونا 2020'
    }
  });
});

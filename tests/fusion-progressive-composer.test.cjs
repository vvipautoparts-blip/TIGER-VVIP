'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COMPOSER = path.join(ROOT, 'scripts/fusion/progressive-composer.js');
const CONTEXT = path.join(ROOT, 'scripts/fusion/marketplace-context.js');

test('FUSION composer uses trusted server draft/publication path and no local publication truth', () => {
  const source = fs.readFileSync(COMPOSER, 'utf8');
  assert.doesNotMatch(source, /LOCAL_DRAFT_ONLY/);
  assert.doesNotMatch(source, /localStorage\.(?:setItem|getItem)/);
  assert.doesNotMatch(source, /vvip\.fusion\.composer\.draft/i);
  assert.match(source, /VVIPFusionMarketplaceContext/);
  assert.match(source, /createDraftWithMedia/);
  assert.match(source, /prepareForPublication/);
  assert.match(source, /entitlementReceipt/);
  assert.match(source, /planId/);
  assert.match(source, /mediaSession\.previewSnapshot/);
  assert.match(source, /mediaSession\.displaySnapshot/);
  assert.match(source, /fetch\(preview\.url\)/);
  assert.match(source, /Math\.min\([^\n]*7\)/);
  assert.doesNotMatch(source, /status\s*:\s*['"]ACTIVE['"]/);
});

test('FUSION marketplace context creates one repository from trusted runtime only', () => {
  const source = fs.readFileSync(CONTEXT, 'utf8');
  assert.match(source, /VVIPRuntimeReady/);
  assert.match(source, /VVIP_MARKETPLACE_REPOSITORY/);
  assert.match(source, /createMarketplaceRepository/);
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /service_role|secret/i);
});

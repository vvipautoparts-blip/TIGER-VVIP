'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const read = (path) => fs.readFileSync(path, 'utf8');

const index = read('index.html');
const manifest = read('manifest.webmanifest');
const auth = read('auth-clerk-index.js');
const capabilityMenu = read('scripts/fusion/f03-capability-menu.js');
const releaseBuilder = read('tools/vvip_public_release.py');
const promotion = read('.github/workflows/pages.yml');

const retiredPublicMarkers = [
  'VVIP TIGER MARKETPLACE',
  'data-social-marketplace-surface',
  'data-vvip-marketplace-feed',
  'private-profile-p03.html',
  'fusion-home-f02.html',
  'vvip-pr29-home-marketplace.css',
  'raw.githack.com',
  'vvipautoparts-blip.github.io/TIGER-VVIP',
];

test('current public NEXUS entry points contain no retired product links or preview routes', () => {
  for (const [name, source] of [
    ['index', index],
    ['auth', auth],
    ['capability menu', capabilityMenu],
    ['manifest', manifest],
  ]) {
    for (const marker of retiredPublicMarkers) {
      assert.equal(source.includes(marker), false, `${name} must not contain retired public marker: ${marker}`);
    }
  }

  assert.equal(fs.existsSync('private-profile-p03.html'), false,
    'retired standalone private profile route must live only in Git history');
});

test('TIGER Command routes sector discovery only to the canonical NEXUS sectors destination', () => {
  assert.match(capabilityMenu, /data-social-nav["']:\s*["']sectors["']/);
  assert.doesNotMatch(capabilityMenu, /data-social-nav["']:\s*["']marketplace["']/);
});

test('PWA identity describes TIGER NEXUS rather than the retired classifieds product', () => {
  const parsed = JSON.parse(manifest);
  assert.match(parsed.description, /TIGER NEXUS/i);
  assert.doesNotMatch(parsed.description, /إعلانات مبوبة|المركبات والمواد والعقارات/);
  assert.equal(parsed.start_url, './index.html');
});

test('sealed public artifact and Production smoke require the renamed current social base asset only', () => {
  const currentStyle = 'styles/tiger-social/base.css';
  const retiredStyle = 'styles/vvip-pr29-home-marketplace.css';
  assert.equal(fs.existsSync(currentStyle), true, `${currentStyle} must exist`);
  assert.equal(fs.existsSync(retiredStyle), false, `${retiredStyle} must stay deleted`);
  assert.match(index, new RegExp(currentStyle.replaceAll('/', '\\/').replaceAll('.', '\\.')));
  assert.match(releaseBuilder, new RegExp(currentStyle.replaceAll('/', '\\/').replaceAll('.', '\\.')));
  assert.match(promotion, new RegExp(currentStyle.replaceAll('/', '\\/').replaceAll('.', '\\.')));
  assert.doesNotMatch(index, /vvip-pr29-home-marketplace\.css/);
  assert.doesNotMatch(releaseBuilder, /vvip-pr29-home-marketplace\.css/);
  assert.doesNotMatch(promotion, /vvip-pr29-home-marketplace\.css/);
});

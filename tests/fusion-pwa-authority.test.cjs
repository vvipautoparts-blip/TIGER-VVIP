'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sw = require('../sw-vvip-static.js');
const fs = require('node:fs');
const path = require('node:path');

const preview = fs.readFileSync(path.resolve(__dirname, '../fusion-home-f02.html'), 'utf8');

test('migration preview is explicit and never becomes service-worker navigation authority', () => {
  assert.match(preview, /data-vvip-fusion-migration-preview/);
  assert.equal(sw.shouldHandleRequest({
    method: 'GET', mode: 'navigate', destination: 'document', url: 'https://example.com/fusion-home-f02.html'
  }, 'https://example.com', '/'), false);
  assert.equal(sw.shouldHandleRequest({
    method: 'GET', mode: 'navigate', destination: 'document', url: 'https://example.com/index.html'
  }, 'https://example.com', '/'), false);
});

test('current NEXUS/FUSION runtime assets are eligible for bounded same-origin static caching', () => {
  for (const asset of [
    '/scripts/fusion/runtime-adapters.js',
    '/scripts/fusion/single-surface-controller.js',
    '/scripts/fusion/account-surface.js',
    '/scripts/nexus/living-sector-object.js',
    '/scripts/nexus/pulse-vault.js',
    '/scripts/nexus/bootstrap.js',
    '/styles/fusion/f02-single-surface.css',
    '/styles/nexus/nexus.css'
  ]) {
    assert.equal(sw.shouldHandleRequest({ method: 'GET', mode: 'cors', destination: 'script', url: `https://example.com${asset}` }, 'https://example.com', '/'), true, asset);
  }
});

test('retired Marketplace wizard is not a current PWA asset', () => {
  assert.equal(fs.existsSync(path.resolve(__dirname, '../scripts/fusion/progressive-composer.js')), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../styles/fusion/progressive-composer.css')), false);
});

test('FUSION integration rotates the static cache namespace', () => {
  assert.equal(sw.CACHE_NAME, 'vvip-static-v2');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sw = require('../sw-vvip-static.js');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('superseded migration preview and parallel runtime assets are physically absent', () => {
  for (const relative of [
    'fusion-home-f02.html',
    'scripts/fusion/f02-feed.js',
    'scripts/fusion/runtime-adapters.js',
    'scripts/fusion/marketplace-context.js',
    'scripts/runtime/vvip-marketplace-repository.js',
    'scripts/nexus/pulse-vault.js'
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, relative);
  }
});

test('current NEXUS runtime assets are eligible for bounded same-origin static caching', () => {
  for (const asset of [
    '/scripts/fusion/single-surface-controller.js',
    '/scripts/fusion/account-surface.js',
    '/scripts/nexus/living-sector-object.js',
    '/scripts/nexus/sector-discovery.js',
    '/scripts/nexus/pulse-runtime.js',
    '/scripts/nexus/pulse-surface.js',
    '/scripts/nexus/bootstrap.js',
    '/scripts/social/core-shell.js',
    '/styles/nexus/nexus.css'
  ]) {
    assert.equal(sw.shouldHandleRequest({ method: 'GET', mode: 'cors', destination: 'script', url: `https://example.com${asset}` }, 'https://example.com', '/'), true, asset);
  }
});

test('service worker never owns document navigation', () => {
  assert.equal(sw.shouldHandleRequest({
    method: 'GET', mode: 'navigate', destination: 'document', url: 'https://example.com/index.html'
  }, 'https://example.com', '/'), false);
});

test('NEXUS rotates the static cache namespace so superseded cached assets are purged', () => {
  assert.equal(sw.CACHE_NAME, 'vvip-static-nexus-v3');
});

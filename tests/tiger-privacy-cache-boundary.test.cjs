'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sw = require('../sw-vvip-static.js');

function request(url, overrides = {}) {
  return {
    method: 'GET',
    mode: 'cors',
    destination: 'script',
    url,
    ...overrides,
  };
}

function response(headers = {}, overrides = {}) {
  return {
    status: 200,
    type: 'basic',
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] ?? null;
      },
    },
    ...overrides,
  };
}

test('static service worker refuses documents, navigations and social/API request paths', () => {
  const origin = 'https://preview.example.test';

  assert.equal(sw.shouldHandleRequest(
    request(`${origin}/index.html`, { mode: 'navigate', destination: 'document' }),
    origin,
    '/'
  ), false);

  assert.equal(sw.shouldHandleRequest(
    request(`${origin}/rest/v1/vvip_social_posts`, { destination: '' }),
    origin,
    '/'
  ), false);

  assert.equal(sw.shouldHandleRequest(
    request(`${origin}/api/social/feed`, { destination: '' }),
    origin,
    '/'
  ), false);

  assert.equal(sw.shouldHandleRequest(
    request('https://backend.example.test/rest/v1/vvip_social_posts', { destination: '' }),
    origin,
    '/'
  ), false);
});

test('static service worker accepts approved immutable/static asset paths only', () => {
  const origin = 'https://preview.example.test';
  assert.equal(sw.shouldHandleRequest(request(`${origin}/scripts/social/core-shell.js`), origin, '/'), true);
  assert.equal(sw.shouldHandleRequest(request(`${origin}/styles/tiger-social/core-shell.css`, { destination: 'style' }), origin, '/'), true);
  assert.equal(sw.shouldHandleRequest(request(`${origin}/icons/icon-192.png`, { destination: 'image' }), origin, '/'), true);
});

test('private, no-store and no-cache responses are never cacheable', () => {
  for (const value of ['private, max-age=60', 'no-store', 'no-cache', 'public, no-store']) {
    assert.equal(sw.isResponseCacheable(response({ 'cache-control': value })), false, value);
  }
});

test('only successful basic responses without private cache directives are cacheable', () => {
  assert.equal(sw.isResponseCacheable(response({ 'cache-control': 'public, max-age=3600' })), true);
  assert.equal(sw.isResponseCacheable(response({}, { status: 401 })), false);
  assert.equal(sw.isResponseCacheable(response({}, { type: 'cors' })), false);
});

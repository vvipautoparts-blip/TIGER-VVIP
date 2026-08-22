const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('authoritative entrypoint declares Social Core as the primary product shell', () => {
  const html = read('index.html');

  assert.match(html, /data-tiger-social-app/);
  assert.match(html, /data-tiger-social-feed/);
  assert.match(html, /styles\/tiger-one\/tokens\.css/);
  assert.match(html, /styles\/tiger-one\/type\.css/);
  assert.match(html, /styles\/tiger-social\/core-shell\.css/);
});

test('global navigation exposes only implemented Social Core destinations while Marketplace remains a module', () => {
  const html = read('index.html');

  for (const destination of ['home', 'friends', 'profile', 'marketplace']) {
    assert.match(html, new RegExp(`data-social-nav="${destination}"`));
  }

  for (const unavailableDestination of ['messages', 'notifications']) {
    assert.doesNotMatch(html, new RegExp(`data-social-nav="${unavailableDestination}"`));
    assert.doesNotMatch(html, new RegExp(`data-social-module-placeholder="${unavailableDestination}"`));
  }

  assert.match(html, /data-social-nav="home"[^>]*aria-current="page"|aria-current="page"[^>]*data-social-nav="home"/);
  assert.match(html, /data-vvip-marketplace-feed/);
});

test('normal social posting and Marketplace listing creation are separate actions', () => {
  const html = read('index.html');

  assert.match(html, /data-social-post-composer/);
  assert.match(html, /data-social-post-trigger/);
  assert.match(html, /data-marketplace-listing-trigger/);
  assert.match(html, /data-fusion-composer-trigger/);
});

test('Social Core shell remains TIGER-branded and does not introduce Facebook asset authority', () => {
  const html = read('index.html');
  const lower = html.toLowerCase();

  assert.match(html, /VVIP TIGER/);
  assert.doesNotMatch(lower, /facebook\.com\/tr|connect\.facebook\.net|static\.xx\.fbcdn\.net/);
  assert.doesNotMatch(html, /data-facebook-authority/);
});
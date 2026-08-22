const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/tiger-social/core-shell.css'), 'utf8');
const feedController = fs.readFileSync(path.join(root, 'scripts/social/feed-controller.js'), 'utf8');

test('mobile social home exposes a familiar social-network shell instead of dashboard intro cards', () => {
  assert.match(index, /data-social-mobile-header/);
  assert.match(index, /data-social-mobile-tabs/);
  assert.match(index, /data-social-story-strip/);
  assert.doesNotMatch(index, /class="social-feed-placeholder social-feed-intro"/);
});

test('mobile social home uses a light neutral canvas and white content surfaces', () => {
  assert.match(css, /--tiger-social-canvas:\s*#[0-9a-fA-F]{6}/);
  assert.match(css, /--tiger-social-surface:\s*#fff(?:fff)?/i);
  assert.match(css, /background:\s*var\(--tiger-social-canvas\)/);
});

test('each rendered post exposes only implemented comment and reaction actions', () => {
  assert.match(feedController, /data-social-post-actions/);
  assert.match(feedController, /data-social-reactions-host/);
  assert.match(feedController, /data-social-comment-trigger/);
  assert.match(feedController, /تعليق/);
  assert.doesNotMatch(feedController, /المشاركة غير متاحة حاليًا/);
  assert.doesNotMatch(feedController, /خيارات المنشور غير متاحة حاليًا/);
  assert.doesNotMatch(feedController, /data\.socialShareTrigger\s*=/);
});

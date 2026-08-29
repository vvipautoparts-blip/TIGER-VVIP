'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('scripts/fusion/f02-feed.js', 'utf8');
const auth = fs.readFileSync('auth-clerk-index.js', 'utf8');
const fusionRuntime = fs.readFileSync('scripts/fusion/runtime-adapters.js', 'utf8');

test('sector discovery reads the canonical Social/Living Object feed instead of a parallel listing store', () => {
  assert.match(source, /TIGERSocialRuntime/);
  assert.match(source, /createCurrentSocialRuntime/);
  assert.match(source, /TIGERSocialFeed/);
  assert.match(source, /createSocialFeedReadModel/);
  assert.match(source, /sectorKey/);
  assert.match(source, /intentClass/);

  assert.doesNotMatch(source, /F02_PREVIEW_LISTINGS/);
  assert.doesNotMatch(source, /VVIP_FUSION_PUBLIC_LISTINGS/);
  assert.doesNotMatch(source, /syntheticDemo/);
  assert.doesNotMatch(source, /sector\s*:\s*["']general["']/);
  assert.doesNotMatch(source, /previewAllowed/);
});

test('current auth and fusion runtime expose no second creation or local-draft path', () => {
  assert.doesNotMatch(auth, /CREATE_LISTING/);
  assert.doesNotMatch(auth, /VVIP_PR29/);
  assert.doesNotMatch(fusionRuntime, /openComposer/);
  assert.doesNotMatch(fusionRuntime, /readLocal/);
  assert.doesNotMatch(fusionRuntime, /\bdrafts\b/);
});

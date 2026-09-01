'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const discovery = fs.readFileSync('scripts/nexus/sector-discovery.js', 'utf8');
const auth = fs.readFileSync('auth-clerk-index.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const shell = fs.readFileSync('scripts/social/core-shell.js', 'utf8');

test('sector discovery reads the canonical Social/Living Object feed instead of a parallel listing store', () => {
  assert.match(discovery, /TIGERSocialRuntime/);
  assert.match(discovery, /createCurrentSocialRuntime/);
  assert.match(discovery, /TIGERSocialFeed/);
  assert.match(discovery, /createSocialFeedReadModel/);
  assert.match(discovery, /sectorKey/);
  assert.match(discovery, /intentClass/);

  assert.doesNotMatch(discovery, /F02_PREVIEW_LISTINGS/);
  assert.doesNotMatch(discovery, /VVIP_FUSION_PUBLIC_LISTINGS/);
  assert.doesNotMatch(discovery, /syntheticDemo/);
  assert.doesNotMatch(discovery, /sector\s*:\s*["']general["']/);
  assert.doesNotMatch(discovery, /previewAllowed/);
});

test('current surface exposes one canonical create path and no parallel Synapse or Marketplace creation identity', () => {
  assert.equal((index.match(/data-social-post-trigger/g) || []).length, 1);
  assert.match(index, /data-social-nav="sectors"/);
  assert.match(index, /data-nexus-sector-discovery/);
  assert.doesNotMatch(index, /data-social-nav="marketplace"/);
  assert.doesNotMatch(index, /data-social-marketplace-surface/);
  assert.doesNotMatch(index, /data-synapse-intent-entry/);
  assert.doesNotMatch(index, /data-synapse-marketplace-rescue/);
  assert.doesNotMatch(index, /scripts\/synapse\//);
});

test('auth and social shell contain no second creation or Synapse compatibility hook', () => {
  assert.doesNotMatch(auth, /CREATE_LISTING/);
  assert.doesNotMatch(auth, /VVIP_PR29/);
  assert.doesNotMatch(shell, /TIGERSynapseLivingSurfaceCurrent/);
  assert.doesNotMatch(shell, /refreshSynapse/);
});

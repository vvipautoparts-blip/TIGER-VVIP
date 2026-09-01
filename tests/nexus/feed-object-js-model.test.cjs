'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const feed = require('../../scripts/social/feed-read-model.js');

const base = {
  post_id: '123e4567-e89b-42d3-a456-426614174000',
  author_available: true,
  author_profile_id: '223e4567-e89b-42d3-a456-426614174000',
  author_display_name: 'مالك العرض',
  author_avatar_url: null,
  body: 'سيارة كهربائية للبيع',
  audience: 'public',
  created_at: '2026-08-29T10:00:00Z',
  updated_at: '2026-08-29T10:00:00Z'
};

test('feed normalization preserves canonical NEXUS sector and intent', () => {
  const result = feed.normalizeFeedPost({ ...base, sector_key: 'automotive', intent_class: 'OFFER' });
  assert.equal(result.ok, true);
  assert.equal(result.value.sectorKey, 'automotive');
  assert.equal(result.value.intentClass, 'OFFER');
});

test('historical unclassified rows remain null without generic fallback', () => {
  const result = feed.normalizeFeedPost({ ...base, sector_key: null, intent_class: null });
  assert.equal(result.ok, true);
  assert.equal(result.value.sectorKey, null);
  assert.equal(result.value.intentClass, null);
});

test('half-classified or malformed NEXUS rows fail closed', () => {
  assert.equal(feed.normalizeFeedPost({ ...base, sector_key: 'automotive', intent_class: null }).ok, false);
  assert.equal(feed.normalizeFeedPost({ ...base, sector_key: null, intent_class: 'OFFER' }).ok, false);
  assert.equal(feed.normalizeFeedPost({ ...base, sector_key: 'bad sector', intent_class: 'OFFER' }).ok, false);
  assert.equal(feed.normalizeFeedPost({ ...base, sector_key: 'automotive', intent_class: 'GENERAL' }).ok, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { searchListings } from '../scripts/fusion/f04-search-fabric.js';

function listing(id, countryCode = 'JO') {
  return {
    id,
    title: `car ${id}`,
    countryCode,
    searchEligible: true,
    policyEligible: true
  };
}

test('Marketplace search uses deterministic bounded pages with an opaque cursor', () => {
  const listings = [listing('listing-c'), listing('listing-a'), listing('listing-b')];
  const first = searchListings({ query: 'car', listings, activeMarketCountry: 'JO', limit: 2 });

  assert.deepEqual(first.results.map((item) => item.id), ['listing-a', 'listing-b']);
  assert.equal(typeof first.nextCursor, 'string');
  assert.ok(first.nextCursor.length > 8);

  const second = searchListings({
    query: 'car',
    listings,
    activeMarketCountry: 'JO',
    limit: 2,
    cursor: first.nextCursor
  });
  assert.deepEqual(second.results.map((item) => item.id), ['listing-c']);
  assert.equal(second.nextCursor, null);
});

test('Marketplace cursor cannot be reused with a different query or country context', () => {
  const listings = [listing('listing-a'), listing('listing-b')];
  const first = searchListings({ query: 'car', listings, activeMarketCountry: 'JO', limit: 1 });

  const differentQuery = searchListings({
    query: 'truck',
    listings,
    activeMarketCountry: 'JO',
    limit: 1,
    cursor: first.nextCursor
  });
  assert.deepEqual(differentQuery, { ok: false, code: 'SEARCH_CURSOR_CONTEXT_MISMATCH' });

  const differentCountry = searchListings({
    query: 'car',
    listings,
    activeMarketCountry: 'SA',
    limit: 1,
    cursor: first.nextCursor
  });
  assert.deepEqual(differentCountry, { ok: false, code: 'SEARCH_CURSOR_CONTEXT_MISMATCH' });
});

test('Marketplace cursor carries the complete canonical context instead of a short hash', () => {
  const listings = [listing('listing-a'), listing('listing-b')];
  const first = searchListings({ query: 'car', listings, activeMarketCountry: 'JO', limit: 1 });
  const base64 = first.nextCursor.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))));

  assert.deepEqual(decoded.context, {
    query: 'car',
    filters: {},
    country: 'JO'
  });
});

test('Marketplace rejects malformed cursors and invalid limits without partial results', () => {
  const listings = [listing('listing-a')];
  assert.deepEqual(searchListings({ listings, cursor: '../../cursor' }), {
    ok: false,
    code: 'SEARCH_CURSOR_INVALID'
  });
  assert.deepEqual(searchListings({ listings, limit: 101 }), {
    ok: false,
    code: 'SEARCH_LIMIT_INVALID'
  });
});
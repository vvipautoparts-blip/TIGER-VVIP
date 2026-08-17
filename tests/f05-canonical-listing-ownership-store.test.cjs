'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  createMarketplaceListingOwnershipStore,
} = require('../scripts/media/server/aws/f05-marketplace-listing-ownership-store.js');

const LISTING_ID = '11111111-1111-4111-8111-111111111111';
const OWNER = 'user_2abcDEF_123';

function fakeClient(result) {
  const calls = [];
  const query = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve(result); },
  };
  return {
    calls,
    client: {
      from(table) { calls.push(['from', table]); return query; },
    },
  };
}

test('ownership store is read-only and fails closed on invalid dependencies or scope', async () => {
  assert.throws(
    () => createMarketplaceListingOwnershipStore(),
    /listing_ownership_store_unavailable/
  );

  const fake = fakeClient({ data: null, error: null });
  const store = createMarketplaceListingOwnershipStore({ client: fake.client });
  assert.equal(typeof store.create, 'undefined');
  assert.equal(typeof store.update, 'undefined');
  assert.equal(typeof store.list, 'undefined');
  assert.equal(typeof store.delete, 'undefined');

  await assert.rejects(
    store.getById('not-a-uuid', { ownerClerkUserId: OWNER }),
    /listing_ownership_scope_invalid/
  );
  await assert.rejects(
    store.getById(LISTING_ID, { ownerClerkUserId: 'bad owner!' }),
    /listing_ownership_scope_invalid/
  );
  assert.deepEqual(fake.calls, []);
});

test('ownership lookup uses only canonical marketplace authority and exact dual filters', async () => {
  const fake = fakeClient({
    data: { listing_id: LISTING_ID, owner_subject: OWNER },
    error: null,
  });
  const store = createMarketplaceListingOwnershipStore({ client: fake.client });

  assert.deepEqual(
    await store.getById(LISTING_ID, { ownerClerkUserId: OWNER }),
    { listingId: LISTING_ID, ownerClerkUserId: OWNER }
  );
  assert.deepEqual(fake.calls, [
    ['from', 'vvip_marketplace_listings'],
    ['select', 'listing_id,owner_subject'],
    ['eq', 'listing_id', LISTING_ID],
    ['eq', 'owner_subject', OWNER],
    ['maybeSingle'],
  ]);
});

test('not-found is null while query errors and malformed rows fail closed', async () => {
  const missing = fakeClient({ data: null, error: null });
  const missingStore = createMarketplaceListingOwnershipStore({ client: missing.client });
  assert.equal(await missingStore.getById(LISTING_ID, { ownerClerkUserId: OWNER }), null);

  const failed = fakeClient({ data: null, error: new Error('network') });
  const failedStore = createMarketplaceListingOwnershipStore({ client: failed.client });
  await assert.rejects(
    failedStore.getById(LISTING_ID, { ownerClerkUserId: OWNER }),
    /listing_ownership_store_unavailable/
  );

  const malformed = fakeClient({ data: { listing_id: LISTING_ID, owner_subject: 'other_user' }, error: null });
  const malformedStore = createMarketplaceListingOwnershipStore({ client: malformed.client });
  await assert.rejects(
    malformedStore.getById(LISTING_ID, { ownerClerkUserId: OWNER }),
    /listing_ownership_store_unavailable/
  );
});

test('source contract forbids legacy listing authority or embedded credentials', () => {
  const modulePath = path.join(
    process.cwd(),
    'scripts', 'media', 'server', 'aws', 'f05-marketplace-listing-ownership-store.js'
  );
  const source = fs.readFileSync(modulePath, 'utf8');
  assert.match(source, /vvip_marketplace_listings/);
  assert.doesNotMatch(source, /\bvvip_listings\b|SupabaseListingRepository|service[_-]?role|SUPABASE_(URL|KEY)|process\.env/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});

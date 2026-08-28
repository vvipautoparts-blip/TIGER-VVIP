'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const marketplace = require('../scripts/runtime/vvip-marketplace-repository.js');

const ROOT = path.resolve(__dirname, '..');
const CURRENT_MIGRATION = path.join(ROOT, 'supabase/migrations/20260828203000_latest_only_publication_authority.sql');
const REPOSITORY = path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js');
const LISTING_ID = '123e4567-e89b-12d3-a456-426614174000';

function rpcClient(handler) {
  return {
    storage: {},
    from() { throw new Error('table mutation is not allowed in publication transport test'); },
    rpc(name, args) { return handler(name, args); }
  };
}

function authenticatedClerk() {
  return { user: { id: 'user_2abc123' } };
}

test('submitForReview delegates only to the current sovereign review-submission RPC', async () => {
  const calls = [];
  const client = rpcClient(async (name, args) => {
    calls.push({ name, args });
    return { data: { listing_id: LISTING_ID, status: 'PENDING_REVIEW' }, error: null };
  });
  const repository = marketplace.createMarketplaceRepository({
    client,
    clerk: authenticatedClerk(),
    config: { defaultCountryCode: 'JO' }
  });

  assert.equal(repository.requestPublication, undefined);
  assert.equal(repository.prepareForPublication, undefined);
  assert.equal(typeof repository.submitForReview, 'function');

  const result = await repository.submitForReview(LISTING_ID);
  assert.deepEqual(calls, [{
    name: 'vvip_marketplace_submit_for_review',
    args: { target_listing: LISTING_ID }
  }]);
  assert.equal(result.status, 'PENDING_REVIEW');
});

test('review-submission transport propagates trusted server failure and never mints entitlement locally', async () => {
  const client = rpcClient(async () => ({ data: null, error: { message: 'SERVER_REVIEW_GATE_FAILED' } }));
  const repository = marketplace.createMarketplaceRepository({
    client,
    clerk: authenticatedClerk(),
    config: { defaultCountryCode: 'JO' }
  });

  await assert.rejects(() => repository.submitForReview(LISTING_ID), { code: 'LISTING_SUBMIT_FAILED' });

  const source = fs.readFileSync(REPOSITORY, 'utf8');
  assert.doesNotMatch(source, /insert\([^\n]*(entitlement|visibility_plan|activation)/i);
  assert.doesNotMatch(source, /status\s*:\s*["']ACTIVE["']/);
  assert.doesNotMatch(source, /requestPublication|vvip_marketplace_request_publication|entitlementReceipt|entitlement_receipt/);
  assert.match(source, /function\s+submitForReview\b/);
});

test('latest-only migration exposes one browser-to-review gate and retires the paid publication RPC', () => {
  const sql = fs.readFileSync(CURRENT_MIGRATION, 'utf8');

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_submit_for_review\s*\(\s*target_listing\s+uuid\s*\)/is);
  assert.match(sql, /security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*extensions/is);
  assert.match(sql, /MARKETPLACE_MEDIA_COUNT_INVALID/);
  assert.match(sql, /MEDIA_SERVER_FINALIZATION_REQUIRED/);
  assert.match(sql, /set\s+status\s*=\s*'PENDING_REVIEW'/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_submit_for_review\s*\(uuid\)[\s\S]*to\s+authenticated/i);

  assert.match(sql, /drop\s+column\s+if\s+exists\s+expires_at/i);
  assert.match(sql, /drop\s+function\s+if\s+exists\s+public\.vvip_marketplace_request_publication\s*\(uuid,\s*text,\s*text\)/i);
  assert.doesNotMatch(sql, /grant\s+execute[\s\S]*vvip_marketplace_request_publication[\s\S]*to\s+authenticated/i);

  const source = fs.readFileSync(REPOSITORY, 'utf8');
  assert.match(source, /client\.rpc\(["']vvip_marketplace_submit_for_review["']/);
  assert.doesNotMatch(source, /client\.rpc\(["']vvip_marketplace_(?:request|prepare)_publication["']/);
});

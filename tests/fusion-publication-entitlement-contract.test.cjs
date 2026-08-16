'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const marketplace = require('../scripts/runtime/vvip-marketplace-repository.js');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816090000_fusion_publication_entitlement.sql');

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

test('requestPublication delegates only to the trusted publication RPC', async () => {
  const calls = [];
  const client = rpcClient(async (name, args) => {
    calls.push({ name, args });
    return {
      data: {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PENDING_REVIEW',
        plan_id: 'pulse-standard',
        entitlement_state: 'CONSUMED'
      },
      error: null
    };
  });
  const repository = marketplace.createMarketplaceRepository({
    client,
    clerk: authenticatedClerk(),
    config: { defaultCountryCode: 'JO' }
  });

  const result = await repository.requestPublication(
    '123e4567-e89b-12d3-a456-426614174000',
    { planId: 'pulse-standard', entitlementReceipt: 'receipt_01HZX8Q7WJ9VJ0R0W0T6SR8XYA' }
  );

  assert.deepEqual(calls, [{
    name: 'vvip_marketplace_request_publication',
    args: {
      target_listing: '123e4567-e89b-12d3-a456-426614174000',
      target_plan_id: 'pulse-standard',
      entitlement_receipt: 'receipt_01HZX8Q7WJ9VJ0R0W0T6SR8XYA'
    }
  }]);
  assert.equal(result.status, 'PENDING_REVIEW');
  assert.equal(result.entitlement_state, 'CONSUMED');
});

test('publication transport propagates trusted server failure and never mints entitlement locally', async () => {
  const client = rpcClient(async () => ({ data: null, error: { message: 'ENTITLEMENT_REQUIRED' } }));
  const repository = marketplace.createMarketplaceRepository({
    client,
    clerk: authenticatedClerk(),
    config: { defaultCountryCode: 'JO' }
  });

  await assert.rejects(
    () => repository.requestPublication(
      '123e4567-e89b-12d3-a456-426614174000',
      { planId: 'pulse-standard', entitlementReceipt: 'receipt_missing' }
    ),
    { code: 'PUBLICATION_REQUEST_FAILED' }
  );

  const source = fs.readFileSync(path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js'), 'utf8');
  assert.doesNotMatch(source, /insert\([^\n]*(entitlement|visibility_plan|activation)/i);
  assert.doesNotMatch(source, /status\s*:\s*["']ACTIVE["']/);
});

test('trusted publication schema remains the exclusive browser-to-review gate during forward convergence', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'trusted publication migration must exist');
  const sql = fs.readFileSync(MIGRATION, 'utf8');

  for (const token of [
    'create table public.vvip_visibility_plans',
    'create table public.vvip_listing_activation_entitlements',
    'create function public.vvip_marketplace_prepare_publication',
    'MARKETPLACE_PUBLICATION_RPC_REQUIRED',
    'MARKETPLACE_MEDIA_COUNT_INVALID',
    'MARKETPLACE_MEDIA_NOT_SANITIZED',
    "mime_type not in ('image/jpeg', 'image/webp')",
    'PENDING_REVIEW',
    'ISSUED',
    'CONSUMED',
    'pulse_impressions',
    'activation_starts_at',
    'activation_expires_at',
    'force row level security',
    'revoke all privileges',
    'entitlement_receipt_hash'
  ]) {
    assert.ok(sql.toLowerCase().includes(token.toLowerCase()), `migration contract missing: ${token}`);
  }

  assert.match(sql, /revoke\s+all[^;]+vvip_listing_activation_entitlements[^;]+from\s+(?:public|anon|authenticated)/is);
  assert.doesNotMatch(sql, /grant\s+insert[^;]+vvip_listing_activation_entitlements[^;]+to\s+authenticated/is);
  assert.doesNotMatch(sql, /update\s+public\.vvip_marketplace_listings[\s\S]{0,400}status\s*=\s*'ACTIVE'/i);
  assert.match(sql, /current_user\s+in\s*\('anon',\s*'authenticated'\)[\s\S]{0,1200}NEW\.status\s*=\s*'PENDING_REVIEW'[\s\S]{0,300}MARKETPLACE_PUBLICATION_RPC_REQUIRED/i);
});

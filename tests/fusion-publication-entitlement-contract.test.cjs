'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const marketplace = require('../scripts/runtime/vvip-marketplace-repository.js');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL = path.join(ROOT, 'supabase/migrations/20260816093000_sovereign_publication_authority.sql');
const LEGACY_FOUNDATION = path.join(ROOT, 'supabase/migrations/20260816090000_fusion_publication_entitlement.sql');
const FORWARD_CONVERGENCE = path.join(ROOT, 'supabase/migrations/20260816170000_sovereign_publication_authority_convergence.sql');
const POST_STACK_HARDENING = path.join(ROOT, 'supabase/migrations/20260816171000_sovereign_publication_rpc_hardening.sql');

function readIfPresent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function effectivePublicationSql() {
  const canonical = readIfPresent(CANONICAL);
  const legacy = readIfPresent(LEGACY_FOUNDATION);
  const convergence = readIfPresent(FORWARD_CONVERGENCE);
  const hardening = readIfPresent(POST_STACK_HARDENING);

  assert.ok(hardening, 'post-stack sovereign publication hardening must exist');
  if (canonical) return `${canonical}\n${hardening}`;
  assert.ok(legacy, 'publication foundation must exist when canonical replacement is absent');
  assert.ok(convergence, 'forward convergence must exist when canonical replacement is absent');
  return `${legacy}\n${convergence}\n${hardening}`;
}

function finalAuthoritySql() {
  return `${readIfPresent(FORWARD_CONVERGENCE)}\n${readIfPresent(CANONICAL)}\n${readIfPresent(POST_STACK_HARDENING)}`;
}

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

test('requestPublication delegates only to the sovereign publication RPC', async () => {
  const calls = [];
  const client = rpcClient(async (name, args) => {
    calls.push({ name, args });
    return {
      data: {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PENDING_REVIEW',
        plan_id: 'pulse-standard',
        entitlement_state: 'RESERVED'
      },
      error: null
    };
  });
  const repository = marketplace.createMarketplaceRepository({
    client,
    clerk: authenticatedClerk(),
    config: { defaultCountryCode: 'JO' }
  });

  assert.equal(repository.prepareForPublication, undefined);
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
  assert.equal(result.entitlement_state, 'RESERVED');
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
  assert.doesNotMatch(source, /function\s+(?:prepareForPublication|submitForReview|createAndSubmit)\b/);
  assert.doesNotMatch(source, /vvip_marketplace_prepare_publication/);
});

test('effective publication schema converges to one browser-to-review gate', () => {
  const sql = effectivePublicationSql();
  const finalSql = finalAuthoritySql();

  for (const token of [
    'create table public.vvip_visibility_plans',
    'create table public.vvip_listing_activation_entitlements',
    'MARKETPLACE_PUBLICATION_RPC_REQUIRED',
    'MARKETPLACE_MEDIA_COUNT_INVALID',
    "finalization_state <> 'CANONICAL'",
    'canonical_storage_path is null',
    "canonical_mime_type not in ('image/jpeg', 'image/webp')",
    'PENDING_REVIEW',
    'ISSUED',
    'RESERVED',
    'CONSUMED',
    'pulse_impressions',
    'activation_duration_minutes',
    'activation_starts_at',
    'activation_expires_at',
    'force row level security',
    'revoke all privileges',
    'entitlement_receipt_hash',
    'vvip_private.vvip_marketplace_country_is_active',
    'on delete restrict'
  ]) {
    assert.ok(sql.toLowerCase().includes(token.toLowerCase()), `effective migration contract missing: ${token}`);
  }

  assert.match(finalSql, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_request_publication/i);
  assert.match(finalSql, /PUBLICATION_IDEMPOTENCY_STATE_INVALID/);
  assert.match(finalSql, /MEDIA_SERVER_FINALIZATION_REQUIRED|MARKETPLACE_MEDIA_NOT_CANONICAL/);
  assert.match(finalSql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_request_publication[\s\S]*from\s+public\s*,\s*anon/i);
  assert.match(finalSql, /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_request_publication[\s\S]*to\s+authenticated/i);

  assert.match(sql, /revoke\s+all[^;]+vvip_listing_activation_entitlements[^;]+from\s+(?:public|anon|authenticated)/is);
  assert.doesNotMatch(sql, /grant\s+insert[^;]+vvip_listing_activation_entitlements[^;]+to\s+authenticated/is);
  assert.doesNotMatch(sql, /references\s+public\.vvip_marketplace_listings\(listing_id\)\s+on\s+delete\s+cascade/i);
  assert.match(finalSql, /entitlement_state\s*=\s*'RESERVED'/i);
  assert.match(finalSql, /current_entitlement\.entitlement_state\s*=\s*'RESERVED'[\s\S]{0,1000}current_listing\.status\s*=\s*'PENDING_REVIEW'/i);

  const repositorySource = fs.readFileSync(path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js'), 'utf8');
  assert.doesNotMatch(repositorySource, /vvip_marketplace_prepare_publication|prepareForPublication|createAndSubmit|submitForReview/);
  if (fs.existsSync(FORWARD_CONVERGENCE)) {
    const convergence = readIfPresent(FORWARD_CONVERGENCE);
    assert.match(convergence, /drop\s+function\s+public\.vvip_marketplace_prepare_publication\s*\(uuid,\s*text,\s*text\)/i);
  }
});

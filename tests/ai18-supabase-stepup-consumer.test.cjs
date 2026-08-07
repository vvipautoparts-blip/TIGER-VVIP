'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const adapter = require('../scripts/ai/sovereign-stepup-supabase-consumer.js');

const H = (char) => char.repeat(64);

function input() {
  return {
    authorizationId: '00000000-0000-4000-8000-000000000018',
    verificationDigest: H('f'),
    ownerSubject: 'owner_001',
    action: 'MERGE_RELEASE',
    releaseDigest: H('a'),
    payloadDigest: H('b'),
    scopeDigest: H('c'),
    environment: 'REPOSITORY',
    now: '2026-08-07T14:45:00.000Z',
  };
}

test('AI-18 Supabase adapter exports a protected persistent consumer factory', () => {
  assert.equal(typeof adapter.createSupabaseStepUpConsumer, 'function');
});

test('AI-18 Supabase adapter calls only the exact consume RPC with bound non-secret arguments', async () => {
  let call;
  const consumer = adapter.createSupabaseStepUpConsumer({
    client: {
      rpc: async (name, args) => {
        call = { name, args };
        return { data: [{ ok: true, reason_code: 'STEPUP_CONSUMED', authorization_id: args.p_authorization_id }], error: null };
      },
    },
  });

  const result = await consumer.consume(input());
  assert.deepEqual(result, { ok: true, reasonCode: 'STEPUP_CONSUMED' });
  assert.equal(call.name, 'consume_ai_owner_stepup_authorization');
  assert.deepEqual(Object.keys(call.args).sort(), [
    'p_action',
    'p_authorization_id',
    'p_environment',
    'p_now',
    'p_owner_subject',
    'p_payload_digest',
    'p_release_digest',
    'p_scope_digest',
  ].sort());
  const serialized = JSON.stringify(call.args).toLowerCase();
  assert.doesNotMatch(serialized, /credential|assertion|passcode|password|secret|private_key/);
});

test('AI-18 Supabase adapter fails closed on RPC errors or malformed result envelopes', async () => {
  const rpcError = adapter.createSupabaseStepUpConsumer({
    client: { rpc: async () => ({ data: null, error: { message: 'database unavailable' } }) },
  });
  assert.deepEqual(await rpcError.consume(input()), { ok: false, reasonCode: 'STEPUP_PERSISTENCE_UNAVAILABLE' });

  const malformed = adapter.createSupabaseStepUpConsumer({
    client: { rpc: async () => ({ data: [{ ok: true, authorization_id: 'x' }], error: null }) },
  });
  assert.deepEqual(await malformed.consume(input()), { ok: false, reasonCode: 'STEPUP_PERSISTENCE_RESULT_INVALID' });
});

test('AI-18 Supabase adapter rejects unknown input fields and malformed binding values before RPC', async () => {
  let called = false;
  const consumer = adapter.createSupabaseStepUpConsumer({
    client: { rpc: async () => { called = true; return { data: [], error: null }; } },
  });

  await assert.rejects(
    () => consumer.consume({ ...input(), ownerApproved: true }),
    /STEPUP_CONSUMER_UNKNOWN_FIELD/,
  );
  await assert.rejects(
    () => consumer.consume({ ...input(), releaseDigest: 'bad' }),
    /STEPUP_CONSUMER_RELEASE_INVALID/,
  );
  assert.equal(called, false);
});

test('AI-18 Supabase adapter never trusts caller-provided verification digest as database authority', async () => {
  let call;
  const consumer = adapter.createSupabaseStepUpConsumer({
    client: {
      rpc: async (name, args) => {
        call = { name, args };
        return { data: [{ ok: true, reason_code: 'STEPUP_CONSUMED', authorization_id: args.p_authorization_id }], error: null };
      },
    },
  });
  await consumer.consume(input());
  assert.equal(Object.prototype.hasOwnProperty.call(call.args, 'p_verification_digest'), false);
});

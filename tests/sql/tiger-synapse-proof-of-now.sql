\set ON_ERROR_STOP on

-- TIGER SYNAPSE S4 Proof-of-Now behavioral rehearsal.
-- Local-only CI proof: no remote database, secrets, media bytes, coordinates, or client clocks.
-- The database accepts only a service-finalized capture receipt, never a caller-authored digest.

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

select result->>'intent_id' as intent_id
from (
  select public.vvip_synapse_intent_create(
    'OFFER',
    'automotive',
    'vehicle',
    'fresh listing proof rehearsal object',
    '{}'::jsonb,
    '{}'::jsonb,
    '{"countryCode":"JO","areaClass":"urban"}'::jsonb,
    'LIVE_NETWORK',
    'MATCHING_NETWORK',
    timezone('utc', now()) + interval '1 day',
    'USER_DECLARED',
    'S1',
    'SYNAPSE-S1',
    true
  ) as result
) created
\gset

select set_config('tiger.rehearsal.intent_id', :'intent_id', true);

reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_issue(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    'intent_offer',
    :'intent_id'::uuid,
    'listing_freshness',
    'SYNAPSE-S4',
    repeat('a', 64),
    300
  )->>'status'
) = 'ISSUED' as proof_issued
\gset
\if :proof_issued
  \echo PROOF_ISSUE_BOUND=PASS
\else
  \echo PROOF_ISSUE_BOUND=FAIL
  \quit 1
\endif

-- Object-level authorization is enforced at issuance.
do $proof$
declare
  v_rejected boolean := false;
  v_intent_id uuid := current_setting('tiger.rehearsal.intent_id')::uuid;
begin
  begin
    perform public.vvip_synapse_proof_issue(
      '44444444-4444-4444-8444-444444444442'::uuid,
      'user_bob',
      'intent_offer',
      v_intent_id,
      'listing_freshness',
      'SYNAPSE-S4',
      repeat('b', 64),
      300
    );
  exception when others then
    if sqlerrm = 'PROOF_OBJECT_NOT_ELIGIBLE' then
      v_rejected := true;
    else
      raise;
    end if;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_PROOF_OBJECT_ACTOR_DENIAL';
  end if;
end;
$proof$;
\echo PROOF_WRONG_ACTOR_DENIED=PASS

-- Prepare, claim, and finalize one trusted capture receipt.
select (
  public.vvip_synapse_proof_capture_prepare(
    '66666666-6666-4666-8666-666666666661'::uuid,
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('1', 64)
  )->>'status'
) = 'CAPTURE_PREPARED' as receipt_prepared
\gset
\if :receipt_prepared
  \echo PROOF_RECEIPT_PREPARED=PASS
\else
  \echo PROOF_RECEIPT_PREPARED=FAIL
  \quit 1
\endif

select (
  public.vvip_synapse_proof_capture_claim(
    '66666666-6666-4666-8666-666666666661'::uuid,
    repeat('1', 64)
  )->>'status'
) = 'CLAIMED' as receipt_claimed
\gset
\if :receipt_claimed
  \echo PROOF_RECEIPT_CLAIMED=PASS
\else
  \echo PROOF_RECEIPT_CLAIMED=FAIL
  \quit 1
\endif

select (
  public.vvip_synapse_proof_capture_finalize(
    '66666666-6666-4666-8666-666666666661'::uuid,
    repeat('1', 64),
    repeat('c', 64),
    'local-rehearsal-v1'
  )->>'status'
) = 'FINALIZED' as receipt_finalized
\gset
\if :receipt_finalized
  \echo PROOF_RECEIPT_FINALIZED=PASS
\else
  \echo PROOF_RECEIPT_FINALIZED=FAIL
  \quit 1
\endif

-- A prepared but unfinalized receipt cannot mint fresh evidence.
select (
  public.vvip_synapse_proof_capture_prepare(
    '66666666-6666-4666-8666-666666666662'::uuid,
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('2', 64)
  )->>'status'
) = 'CAPTURE_PREPARED' as pending_receipt_prepared
\gset
\if :pending_receipt_prepared
  \echo PROOF_PENDING_RECEIPT_PREPARED=PASS
\else
  \echo PROOF_PENDING_RECEIPT_PREPARED=FAIL
  \quit 1
\endif

select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('a', 64),
    '66666666-6666-4666-8666-666666666662'::uuid
  )->>'status'
) = 'INVALID' as unfinalized_invalid
\gset
\if :unfinalized_invalid
  \echo PROOF_UNFINALIZED_RECEIPT_REJECTED=PASS
\else
  \echo PROOF_UNFINALIZED_RECEIPT_REJECTED=FAIL
  \quit 1
\endif

-- Wrong actor and wrong nonce must fail without burning the valid finalized receipt.
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_bob',
    repeat('a', 64),
    '66666666-6666-4666-8666-666666666661'::uuid
  )->>'status'
) = 'INVALID' as wrong_actor_invalid
\gset
\if :wrong_actor_invalid
  \echo PROOF_WRONG_ACTOR_CONSUME_INVALID=PASS
\else
  \echo PROOF_WRONG_ACTOR_CONSUME_INVALID=FAIL
  \quit 1
\endif

select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('f', 64),
    '66666666-6666-4666-8666-666666666661'::uuid
  )->>'status'
) = 'INVALID' as wrong_nonce_invalid
\gset
\if :wrong_nonce_invalid
  \echo PROOF_WRONG_NONCE_REJECTED=PASS
\else
  \echo PROOF_WRONG_NONCE_REJECTED=FAIL
  \quit 1
\endif

reset role;
set local role postgres;
select (
  c.consumed_at is null
  and c.capture_digest is null
  and r.consumed_at is null
  and r.canonical_digest = repeat('c', 64)
) as invalid_attempts_did_not_consume
from public.vvip_synapse_proof_challenges c
join public.vvip_synapse_proof_capture_receipts r using (challenge_id)
where c.challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
  and r.receipt_id = '66666666-6666-4666-8666-666666666661'::uuid
\gset
\if :invalid_attempts_did_not_consume
  \echo PROOF_INVALID_ATTEMPTS_NON_DESTRUCTIVE=PASS
\else
  \echo PROOF_INVALID_ATTEMPTS_NON_DESTRUCTIVE=FAIL
  \quit 1
\endif

-- Only digests of server capabilities are stored; raw nonce/finalization token never exists in tables.
select (
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('vvip_synapse_proof_challenges', 'vvip_synapse_proof_capture_receipts', 'vvip_synapse_proof_evidence')
      and column_name in ('nonce', 'raw_nonce', 'challenge_nonce', 'token', 'finalization_token', 'raw_token')
  )
  and exists (
    select 1 from public.vvip_synapse_proof_challenges
    where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
      and nonce_digest = repeat('a', 64)
  )
  and exists (
    select 1 from public.vvip_synapse_proof_capture_receipts
    where receipt_id = '66666666-6666-4666-8666-666666666661'::uuid
      and token_digest = repeat('1', 64)
  )
) as raw_capability_absent
\gset
\if :raw_capability_absent
  \echo PROOF_RAW_NONCE_ABSENT=PASS
  \echo PROOF_RAW_CAPABILITY_ABSENT=PASS
\else
  \echo PROOF_RAW_CAPABILITY_ABSENT=FAIL
  \quit 1
\endif

-- Browser roles have no table CRUD or Proof authority RPC execution.
select (
  not has_table_privilege('authenticated', 'public.vvip_synapse_proof_challenges', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_capture_receipts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_evidence', 'SELECT')
  and not has_function_privilege('authenticated', 'public.vvip_synapse_proof_issue(uuid,text,text,uuid,text,text,text,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_synapse_proof_capture_prepare(uuid,uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_synapse_proof_capture_claim(uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_synapse_proof_capture_finalize(uuid,text,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_synapse_proof_consume(uuid,text,text,uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_synapse_proof_issue(uuid,text,text,uuid,text,text,text,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_synapse_proof_capture_prepare(uuid,uuid,text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_synapse_proof_capture_claim(uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_synapse_proof_capture_finalize(uuid,text,text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_synapse_proof_consume(uuid,text,text,uuid)', 'EXECUTE')
) as direct_access_denied
\gset
\if :direct_access_denied
  \echo PROOF_AUTHENTICATED_DIRECT_ACCESS_DENIED=PASS
\else
  \echo PROOF_AUTHENTICATED_DIRECT_ACCESS_DENIED=FAIL
  \quit 1
\endif

reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('a', 64),
    '66666666-6666-4666-8666-666666666661'::uuid
  )->>'status'
) = 'ACCEPTED' as valid_consume
\gset
\if :valid_consume
  \echo PROOF_VALID_CONSUME=PASS
\else
  \echo PROOF_VALID_CONSUME=FAIL
  \quit 1
\endif

select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('a', 64),
    '66666666-6666-4666-8666-666666666661'::uuid
  )->>'status'
) = 'REPLAY' as replay_rejected
\gset
\if :replay_rejected
  \echo PROOF_REPLAY_REJECTED=PASS
\else
  \echo PROOF_REPLAY_REJECTED=FAIL
  \quit 1
\endif

reset role;
set local role postgres;
select (
  count(*) = 1
  and bool_and(actor_subject = 'user_alice')
  and bool_and(object_type = 'intent_offer')
  and bool_and(object_id = :'intent_id'::uuid)
  and bool_and(purpose = 'listing_freshness')
  and bool_and(policy_version = 'SYNAPSE-S4')
  and bool_and(receipt_id = '66666666-6666-4666-8666-666666666661'::uuid)
  and bool_and(capture_digest = repeat('c', 64))
  and bool_and(verifier_id = 'local-rehearsal-v1')
) as evidence_bound
from public.vvip_synapse_proof_evidence
where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
\gset
\if :evidence_bound
  \echo PROOF_EVIDENCE_BINDING=PASS
\else
  \echo PROOF_EVIDENCE_BINDING=FAIL
  \quit 1
\endif

select (
  (select count(*) from public.vvip_synapse_proof_evidence
   where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid) = 1
  and (select count(*) from public.vvip_synapse_proof_challenges
   where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
     and consumed_at is not null and capture_digest = repeat('c', 64)) = 1
  and (select count(*) from public.vvip_synapse_proof_capture_receipts
   where receipt_id = '66666666-6666-4666-8666-666666666661'::uuid
     and consumed_at is not null and canonical_digest = repeat('c', 64)) = 1
) as at_most_one
\gset
\if :at_most_one
  \echo PROOF_DOUBLE_CONSUME_AT_MOST_ONE=PASS
  \echo PROOF_RECEIPT_CONSUMED=PASS
\else
  \echo PROOF_DOUBLE_CONSUME_AT_MOST_ONE=FAIL
  \quit 1
\endif

-- Expiry remains server-authoritative for both challenge and receipt.
reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_issue(
    '44444444-4444-4444-8444-444444444443'::uuid,
    'user_alice',
    'intent_offer',
    :'intent_id'::uuid,
    'listing_freshness',
    'SYNAPSE-S4',
    repeat('e', 64),
    300
  )->>'status'
) = 'ISSUED' as expiry_issued
\gset
\if :expiry_issued
  \echo PROOF_EXPIRY_CHALLENGE_ISSUED=PASS
\else
  \echo PROOF_EXPIRY_CHALLENGE_ISSUED=FAIL
  \quit 1
\endif

select public.vvip_synapse_proof_capture_prepare(
  '66666666-6666-4666-8666-666666666663'::uuid,
  '44444444-4444-4444-8444-444444444443'::uuid,
  'user_alice',
  repeat('3', 64)
);
select public.vvip_synapse_proof_capture_claim('66666666-6666-4666-8666-666666666663'::uuid, repeat('3', 64));
select public.vvip_synapse_proof_capture_finalize(
  '66666666-6666-4666-8666-666666666663'::uuid,
  repeat('3', 64), repeat('9', 64), 'local-rehearsal-v1'
);

reset role;
set local role postgres;
update public.vvip_synapse_proof_challenges
set created_at = statement_timestamp() - interval '2 minutes',
    expires_at = statement_timestamp() - interval '1 minute'
where challenge_id = '44444444-4444-4444-8444-444444444443'::uuid;
update public.vvip_synapse_proof_capture_receipts
set created_at = statement_timestamp() - interval '2 minutes',
    claimed_at = statement_timestamp() - interval '90 seconds',
    finalized_at = statement_timestamp() - interval '80 seconds',
    expires_at = statement_timestamp() - interval '1 minute'
where receipt_id = '66666666-6666-4666-8666-666666666663'::uuid;

reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444443'::uuid,
    'user_alice',
    repeat('e', 64),
    '66666666-6666-4666-8666-666666666663'::uuid
  )->>'status'
) = 'EXPIRED' as expired_rejected
\gset
\if :expired_rejected
  \echo PROOF_EXPIRED_REJECTED=PASS
\else
  \echo PROOF_EXPIRED_REJECTED=FAIL
  \quit 1
\endif

reset role;
set local role postgres;
select not exists (
  select 1 from public.vvip_synapse_proof_evidence
  where challenge_id = '44444444-4444-4444-8444-444444444443'::uuid
) as expired_has_no_evidence
\gset
\if :expired_has_no_evidence
  \echo PROOF_EXPIRED_NO_EVIDENCE=PASS
\else
  \echo PROOF_EXPIRED_NO_EVIDENCE=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SYNAPSE_PROOF_OF_NOW_DB_BEHAVIOR=PASS

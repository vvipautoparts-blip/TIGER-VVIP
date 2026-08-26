\set ON_ERROR_STOP on

-- TIGER SYNAPSE S4 Proof-of-Now behavioral rehearsal.
-- Local-only CI proof: no remote database, secrets, media bytes, coordinates, or client clocks.
-- This rehearsal proves the database authority beneath the Edge Function boundary.

begin;

-- Create an eligible OFFER intent through the existing authenticated S1 authority.
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

-- Issue one challenge through the service-only Proof-of-Now authority.
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

-- Object-level authorization is enforced at issuance, not inferred from UUID secrecy.
do $proof$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_synapse_proof_issue(
      '44444444-4444-4444-8444-444444444442'::uuid,
      'user_bob',
      'intent_offer',
      :'intent_id'::uuid,
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

-- Wrong actor and wrong nonce must fail without burning the valid challenge.
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_bob',
    repeat('a', 64),
    repeat('c', 64)
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
    repeat('c', 64)
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
  consumed_at is null
  and capture_digest is null
) as invalid_attempts_did_not_consume
from public.vvip_synapse_proof_challenges
where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
\gset
\if :invalid_attempts_did_not_consume
  \echo PROOF_INVALID_ATTEMPTS_NON_DESTRUCTIVE=PASS
\else
  \echo PROOF_INVALID_ATTEMPTS_NON_DESTRUCTIVE=FAIL
  \quit 1
\endif

-- The raw challenge nonce never exists in the relational contract; only a 64-hex digest does.
select (
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('vvip_synapse_proof_challenges', 'vvip_synapse_proof_evidence')
      and column_name in ('nonce', 'raw_nonce', 'challenge_nonce')
  )
  and exists (
    select 1
    from public.vvip_synapse_proof_challenges
    where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
      and nonce_digest = repeat('a', 64)
  )
) as raw_nonce_absent
\gset
\if :raw_nonce_absent
  \echo PROOF_RAW_NONCE_ABSENT=PASS
\else
  \echo PROOF_RAW_NONCE_ABSENT=FAIL
  \quit 1
\endif

-- Browser/authenticated roles must have neither raw table CRUD nor Proof-of-Now RPC execution.
select (
  not has_table_privilege('authenticated', 'public.vvip_synapse_proof_challenges', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_challenges', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_challenges', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_challenges', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_evidence', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_evidence', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_evidence', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_synapse_proof_evidence', 'DELETE')
  and not has_function_privilege(
    'authenticated',
    'public.vvip_synapse_proof_issue(uuid,text,text,uuid,text,text,text,integer)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.vvip_synapse_proof_consume(uuid,text,text,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.vvip_synapse_proof_issue(uuid,text,text,uuid,text,text,text,integer)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.vvip_synapse_proof_consume(uuid,text,text,text)',
    'EXECUTE'
  )
) as direct_access_denied
\gset
\if :direct_access_denied
  \echo PROOF_AUTHENTICATED_DIRECT_ACCESS_DENIED=PASS
\else
  \echo PROOF_AUTHENTICATED_DIRECT_ACCESS_DENIED=FAIL
  \quit 1
\endif

-- Consume the challenge once using the verified actor + nonce digest + capture digest.
reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('a', 64),
    repeat('c', 64)
  )->>'status'
) = 'ACCEPTED' as valid_consume
\gset
\if :valid_consume
  \echo PROOF_VALID_CONSUME=PASS
\else
  \echo PROOF_VALID_CONSUME=FAIL
  \quit 1
\endif

-- Replay with the same challenge cannot create a second accepted result.
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444441'::uuid,
    'user_alice',
    repeat('a', 64),
    repeat('d', 64)
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
  and min(actor_subject) = 'user_alice'
  and min(object_type) = 'intent_offer'
  and min(object_id) = :'intent_id'::uuid
  and min(purpose) = 'listing_freshness'
  and min(policy_version) = 'SYNAPSE-S4'
  and min(capture_digest) = repeat('c', 64)
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
  and
  (select count(*) from public.vvip_synapse_proof_challenges
   where challenge_id = '44444444-4444-4444-8444-444444444441'::uuid
     and consumed_at is not null
     and capture_digest = repeat('c', 64)) = 1
) as at_most_one
\gset
\if :at_most_one
  \echo PROOF_DOUBLE_CONSUME_AT_MOST_ONE=PASS
\else
  \echo PROOF_DOUBLE_CONSUME_AT_MOST_ONE=FAIL
  \quit 1
\endif

-- Expiry is server-authoritative. Age a second local-only challenge to the past,
-- then prove consume returns EXPIRED and creates no evidence.
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

reset role;
set local role postgres;
update public.vvip_synapse_proof_challenges
set created_at = statement_timestamp() - interval '2 minutes',
    expires_at = statement_timestamp() - interval '1 minute'
where challenge_id = '44444444-4444-4444-8444-444444444443'::uuid;

reset role;
set local role service_role;
select (
  public.vvip_synapse_proof_consume(
    '44444444-4444-4444-8444-444444444443'::uuid,
    'user_alice',
    repeat('e', 64),
    repeat('9', 64)
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
select (
  not exists (
    select 1
    from public.vvip_synapse_proof_evidence
    where challenge_id = '44444444-4444-4444-8444-444444444443'::uuid
  )
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

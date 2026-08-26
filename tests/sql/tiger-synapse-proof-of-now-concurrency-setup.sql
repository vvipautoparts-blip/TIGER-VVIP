\set ON_ERROR_STOP on

-- TIGER SYNAPSE S4 concurrency fixture.
-- Local-only rehearsal. Commits one deterministic challenge so two independent
-- PostgreSQL sessions can contend on the exact same row.

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_race"}', true);

select result->>'intent_id' as intent_id
from (
  select public.vvip_synapse_intent_create(
    'OFFER',
    'automotive',
    'vehicle',
    'proof-of-now two-session contention fixture',
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

reset role;
set local role service_role;

select (
  public.vvip_synapse_proof_issue(
    '55555555-5555-4555-8555-555555555551'::uuid,
    'user_race',
    'intent_offer',
    :'intent_id'::uuid,
    'concurrency_freshness',
    'SYNAPSE-S4',
    repeat('7', 64),
    300
  )->>'status'
) = 'ISSUED' as concurrency_issued
\gset

\if :concurrency_issued
  \echo PROOF_CONCURRENCY_ISSUE=PASS
\else
  \echo PROOF_CONCURRENCY_ISSUE=FAIL
  \quit 1
\endif

reset role;
set local role postgres;

select (
  count(*) = 1
  and bool_and(actor_subject = 'user_race')
  and bool_and(object_type = 'intent_offer')
  and bool_and(object_id = :'intent_id'::uuid)
  and bool_and(purpose = 'concurrency_freshness')
  and bool_and(policy_version = 'SYNAPSE-S4')
  and bool_and(nonce_digest = repeat('7', 64))
  and bool_and(consumed_at is null)
  and bool_and(capture_digest is null)
) as fixture_bound
from public.vvip_synapse_proof_challenges
where challenge_id = '55555555-5555-4555-8555-555555555551'::uuid
\gset

\if :fixture_bound
  \echo PROOF_CONCURRENCY_FIXTURE_BOUND=PASS
\else
  \echo PROOF_CONCURRENCY_FIXTURE_BOUND=FAIL
  \quit 1
\endif

commit;
\echo PROOF_CONCURRENCY_FIXTURE_READY=PASS

\set ON_ERROR_STOP on

-- TIGER SYNAPSE S4 concurrency fixture.
-- Commits one deterministic finalized receipt so two independent PostgreSQL sessions
-- contend on the exact same challenge/receipt lineage.

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_race"}', true);

select result->>'intent_id' as intent_id
from (
  select public.vvip_synapse_intent_create(
    'OFFER', 'automotive', 'vehicle',
    'proof-of-now two-session contention fixture',
    '{}'::jsonb, '{}'::jsonb,
    '{"countryCode":"JO","areaClass":"urban"}'::jsonb,
    'LIVE_NETWORK', 'MATCHING_NETWORK',
    timezone('utc', now()) + interval '1 day',
    'USER_DECLARED', 'S1', 'SYNAPSE-S1', true
  ) as result
) created
\gset

reset role;
set local role service_role;

select (
  public.vvip_synapse_proof_issue(
    '55555555-5555-4555-8555-555555555551'::uuid,
    'user_race', 'intent_offer', :'intent_id'::uuid,
    'concurrency_freshness', 'SYNAPSE-S4', repeat('7', 64), 300
  )->>'status'
) = 'ISSUED' as concurrency_issued
\gset
\if :concurrency_issued
  \echo PROOF_CONCURRENCY_ISSUE=PASS
\else
  \echo PROOF_CONCURRENCY_ISSUE=FAIL
  \quit 1
\endif

select public.vvip_synapse_proof_capture_prepare(
  '77777777-7777-4777-8777-777777777771'::uuid,
  '55555555-5555-4555-8555-555555555551'::uuid,
  'user_race', repeat('6', 64)
);
select public.vvip_synapse_proof_capture_claim(
  '77777777-7777-4777-8777-777777777771'::uuid, repeat('6', 64)
);
select (
  public.vvip_synapse_proof_capture_finalize(
    '77777777-7777-4777-8777-777777777771'::uuid,
    repeat('6', 64), repeat('8', 64), 'local-race-verifier-v1'
  )->>'status'
) = 'FINALIZED' as receipt_finalized
\gset
\if :receipt_finalized
  \echo PROOF_CONCURRENCY_RECEIPT_FINALIZED=PASS
\else
  \echo PROOF_CONCURRENCY_RECEIPT_FINALIZED=FAIL
  \quit 1
\endif

reset role;
set local role postgres;
select (
  count(*) = 1
  and bool_and(c.actor_subject = 'user_race')
  and bool_and(c.object_type = 'intent_offer')
  and bool_and(c.object_id = :'intent_id'::uuid)
  and bool_and(c.purpose = 'concurrency_freshness')
  and bool_and(c.policy_version = 'SYNAPSE-S4')
  and bool_and(c.nonce_digest = repeat('7', 64))
  and bool_and(c.consumed_at is null)
  and bool_and(c.capture_digest is null)
  and bool_and(r.receipt_id = '77777777-7777-4777-8777-777777777771'::uuid)
  and bool_and(r.canonical_digest = repeat('8', 64))
  and bool_and(r.verifier_id = 'local-race-verifier-v1')
  and bool_and(r.finalized_at is not null)
  and bool_and(r.consumed_at is null)
) as fixture_bound
from public.vvip_synapse_proof_challenges c
join public.vvip_synapse_proof_capture_receipts r using (challenge_id)
where c.challenge_id = '55555555-5555-4555-8555-555555555551'::uuid
\gset
\if :fixture_bound
  \echo PROOF_CONCURRENCY_FIXTURE_BOUND=PASS
\else
  \echo PROOF_CONCURRENCY_FIXTURE_BOUND=FAIL
  \quit 1
\endif

commit;
\echo PROOF_CONCURRENCY_FIXTURE_READY=PASS

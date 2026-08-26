\set ON_ERROR_STOP on

-- Verify the durable result after two independent contenders complete.
begin;
set local role postgres;

select (
  count(*) = 1
  and bool_and(consumed_at is not null)
  and bool_and(capture_digest = repeat('8', 64))
) as challenge_consumed_once
from public.vvip_synapse_proof_challenges
where challenge_id = '55555555-5555-4555-8555-555555555551'::uuid
\gset
\if :challenge_consumed_once
  \echo PROOF_CONCURRENT_CHALLENGE_CONSUMED=PASS
\else
  \echo PROOF_CONCURRENT_CHALLENGE_CONSUMED=FAIL
  \quit 1
\endif

select (
  count(*) = 1
  and bool_and(consumed_at is not null)
  and bool_and(canonical_digest = repeat('8', 64))
  and bool_and(verifier_id = 'local-race-verifier-v1')
) as receipt_consumed_once
from public.vvip_synapse_proof_capture_receipts
where receipt_id = '77777777-7777-4777-8777-777777777771'::uuid
\gset
\if :receipt_consumed_once
  \echo PROOF_CONCURRENT_RECEIPT_CONSUMED=PASS
\else
  \echo PROOF_CONCURRENT_RECEIPT_CONSUMED=FAIL
  \quit 1
\endif

select count(*) = 1 as evidence_exactly_one
from public.vvip_synapse_proof_evidence
where challenge_id = '55555555-5555-4555-8555-555555555551'::uuid
\gset
\if :evidence_exactly_one
  \echo PROOF_CONCURRENT_EVIDENCE_EXACTLY_ONE=PASS
\else
  \echo PROOF_CONCURRENT_EVIDENCE_EXACTLY_ONE=FAIL
  \quit 1
\endif

select (
  count(*) = 1
  and bool_and(e.actor_subject = c.actor_subject)
  and bool_and(e.object_type = c.object_type)
  and bool_and(e.object_id = c.object_id)
  and bool_and(e.purpose = c.purpose)
  and bool_and(e.policy_version = c.policy_version)
  and bool_and(e.capture_digest = c.capture_digest)
  and bool_and(e.receipt_id = r.receipt_id)
  and bool_and(e.capture_digest = r.canonical_digest)
  and bool_and(e.verifier_id = r.verifier_id)
  and bool_and(e.actor_subject = 'user_race')
  and bool_and(e.purpose = 'concurrency_freshness')
  and bool_and(e.policy_version = 'SYNAPSE-S4')
  and bool_and(e.capture_digest = repeat('8', 64))
  and bool_and(e.verifier_id = 'local-race-verifier-v1')
) as evidence_bound
from public.vvip_synapse_proof_evidence e
join public.vvip_synapse_proof_challenges c using (challenge_id)
join public.vvip_synapse_proof_capture_receipts r on r.receipt_id = e.receipt_id
where e.challenge_id = '55555555-5555-4555-8555-555555555551'::uuid
\gset
\if :evidence_bound
  \echo PROOF_CONCURRENT_EVIDENCE_BINDING=PASS
\else
  \echo PROOF_CONCURRENT_EVIDENCE_BINDING=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SYNAPSE_PROOF_OF_NOW_CONCURRENCY=PASS

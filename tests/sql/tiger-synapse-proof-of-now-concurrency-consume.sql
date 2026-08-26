\set ON_ERROR_STOP on

-- One contender. The workflow launches this file in two independent psql sessions.
set role service_role;
select public.vvip_synapse_proof_consume(
  '55555555-5555-4555-8555-555555555551'::uuid,
  'user_race',
  repeat('7', 64),
  '77777777-7777-4777-8777-777777777771'::uuid
)->>'status';
reset role;

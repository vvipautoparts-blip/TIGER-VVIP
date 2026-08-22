\set ON_ERROR_STOP on

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

select result->>'intent_id' as intent_id
from (
  select public.vvip_synapse_intent_create(
    'NEED',
    'food',
    'cereal',
    'corn flakes for children without sugar',
    '{"dietary":["no_sugar"]}'::jsonb,
    '{"packageSize":"family"}'::jsonb,
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

-- Browser role has no table privileges; use postgres only as the local rehearsal observer.
reset role;
set local role postgres;

select (
  count(*) = 1
  and min(actor_subject) = 'user_alice'
  and min(status) = 'MATCHING'
  and min(activation_mode) = 'LIVE_NETWORK'
  and min(revision) = 0
) as alice_intent_actor_bound
from public.vvip_synapse_intents
where intent_id = :'intent_id'::uuid
\gset
\if :alice_intent_actor_bound
  \echo INTENT_ACTOR_BOUND_AND_MATCHING=PASS
\else
  \echo INTENT_ACTOR_BOUND_AND_MATCHING=FAIL
  \quit 1
\endif

select set_config('test.intent_id', :'intent_id', true);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

do $proof$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_synapse_intent_create(
      'NEED', 'food', 'cereal', 'private local draft',
      '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
      'PRIVATE_LOCAL', 'PRIVATE_LOCAL', timezone('utc', now()) + interval '1 day',
      'USER_DECLARED', 'S1', 'SYNAPSE-S1', true
    );
  exception when others then
    if sqlerrm = 'INTENT_PRIVATE_LOCAL_NOT_PERSISTED' then
      v_rejected := true;
    else
      raise;
    end if;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_PRIVATE_LOCAL_REJECTION';
  end if;
end;
$proof$;
\echo PRIVATE_LOCAL_NOT_PERSISTED=PASS

select (public.vvip_synapse_intent_transition(
  :'intent_id'::uuid,
  'ACTIVE',
  0,
  true
)->>'status') = 'ACTIVE' as active_transition
\gset
\if :active_transition
  \echo INTENT_ACTIVE_AFTER_POLICY=PASS
\else
  \echo INTENT_ACTIVE_AFTER_POLICY=FAIL
  \quit 1
\endif

do $proof$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_synapse_intent_transition(current_setting('test.intent_id')::uuid, 'PAUSED', 0, true);
  exception when others then
    if sqlerrm = 'INTENT_REVISION_CONFLICT' then
      v_rejected := true;
    else
      raise;
    end if;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_INTENT_REVISION_CONFLICT';
  end if;
end;
$proof$;
\echo INTENT_REVISION_CONFLICT=PASS

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

do $proof$
declare
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_synapse_intent_transition(current_setting('test.intent_id')::uuid, 'CANCELLED', 1, true);
  exception when others then
    if sqlerrm = 'INTENT_NOT_FOUND' then
      v_rejected := true;
    else
      raise;
    end if;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_CROSS_ACTOR_DENIAL';
  end if;
end;
$proof$;
\echo INTENT_CROSS_ACTOR_DENIED=PASS

rollback;
\echo TIGER_SYNAPSE_INTENT_DB_BEHAVIOR=PASS

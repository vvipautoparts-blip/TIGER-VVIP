-- TIGER Gate 4 stale notification worker lease recovery.
-- Forward-only safety correction before Gate 4 evidence closure.

begin;

create or replace function public.vvip_notification_claim_dispatches(
    p_limit integer,
    p_worker text
)
returns table (
    dispatch_id uuid,
    generation bigint,
    endpoint_capability text,
    provider text,
    notification_id uuid,
    category text,
    preview jsonb,
    object_type text,
    object_id text,
    ttl_seconds integer,
    importance text,
    collapse_key text
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    if p_worker is null or char_length(p_worker) < 3 or char_length(p_worker) > 120 then
        raise exception 'TIGER_NOTIFICATION_WORKER_INVALID';
    end if;

    -- A worker crash/network failure may leave a leased row behind. Once its lease
    -- expires, fence the old generation and deterministically recover or terminate it.
    update public.vvip_notification_dispatches dispatch
       set state = case
               when dispatch.expires_at <= statement_timestamp() then 'expired'
               when dispatch.attempt_count >= 5 then 'dead_letter'
               else 'retry_wait'
           end,
           generation = dispatch.generation + 1,
           next_attempt_at = case
               when dispatch.expires_at <= statement_timestamp() or dispatch.attempt_count >= 5 then dispatch.next_attempt_at
               else statement_timestamp() + interval '5 seconds'
           end,
           lease_owner = null,
           lease_expires_at = null,
           last_error_class = case
               when dispatch.expires_at <= statement_timestamp() then 'lease_expired_after_ttl'
               when dispatch.attempt_count >= 5 then 'stale_lease_retry_budget_exhausted'
               else 'stale_lease_recovered'
           end,
           updated_at = statement_timestamp()
     where dispatch.state = 'leased'
       and dispatch.lease_expires_at <= statement_timestamp();

    update public.vvip_notification_dispatches dispatch
       set state = 'expired', generation = dispatch.generation + 1, updated_at = statement_timestamp()
     where dispatch.state in ('pending','retry_wait') and dispatch.expires_at <= statement_timestamp();

    update public.vvip_notification_dispatches dispatch
       set state = 'suppressed', generation = dispatch.generation + 1, updated_at = statement_timestamp()
      from public.vvip_notifications notification, public.vvip_notification_endpoints endpoint
     where notification.notification_id = dispatch.notification_id
       and endpoint.endpoint_id = dispatch.endpoint_id
       and dispatch.state in ('pending','retry_wait')
       and (endpoint.state <> 'active' or public.vvip_notification_push_blocked(notification.category,dispatch.provider));

    return query
    with candidates as (
        select dispatch.dispatch_id as candidate_dispatch_id
        from public.vvip_notification_dispatches dispatch
        join public.vvip_notification_endpoints endpoint on endpoint.endpoint_id = dispatch.endpoint_id
        join public.vvip_notifications notification on notification.notification_id = dispatch.notification_id
        where dispatch.state in ('pending','retry_wait')
          and dispatch.next_attempt_at <= statement_timestamp()
          and dispatch.expires_at > statement_timestamp()
          and endpoint.state = 'active'
          and not public.vvip_notification_push_blocked(notification.category,dispatch.provider)
        order by dispatch.next_attempt_at, dispatch.created_at, dispatch.dispatch_id
        for update of dispatch skip locked
        limit (least(greatest(coalesce(p_limit,1),1),32))
    ), claimed as (
        update public.vvip_notification_dispatches dispatch
           set state = 'leased',
               attempt_count = dispatch.attempt_count + 1,
               generation = dispatch.generation + 1,
               lease_owner = p_worker,
               lease_expires_at = statement_timestamp() + interval '30 seconds',
               updated_at = statement_timestamp()
          from candidates
         where dispatch.dispatch_id = candidates.candidate_dispatch_id
         returning dispatch.*
    )
    select claimed.dispatch_id,
           claimed.generation,
           endpoint.endpoint_capability,
           claimed.provider,
           notification.notification_id,
           notification.category,
           public.vvip_notification_push_preview(
               notification.category,
               notification.sensitivity,
               notification.template_key,
               notification.template_args
           ),
           notification.object_type,
           notification.object_id,
           greatest(0,ceil(extract(epoch from (claimed.expires_at - statement_timestamp()))))::integer,
           notification.importance,
           claimed.collapse_key
    from claimed
    join public.vvip_notification_endpoints endpoint on endpoint.endpoint_id = claimed.endpoint_id
    join public.vvip_notifications notification on notification.notification_id = claimed.notification_id;
end;
$function$;

revoke all on function public.vvip_notification_claim_dispatches(integer,text)
    from public, anon, authenticated;
grant execute on function public.vvip_notification_claim_dispatches(integer,text)
    to service_role;

comment on function public.vvip_notification_claim_dispatches(integer,text) is
    'Gate 4 fenced dispatch claimant with stale lease recovery, five-attempt terminal budget, TTL and kill-switch enforcement.';

commit;

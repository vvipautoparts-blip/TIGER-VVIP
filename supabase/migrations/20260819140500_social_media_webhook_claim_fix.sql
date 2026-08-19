-- VVIP TIGER Social Media webhook claim ambiguity repair.
-- Forward-only repository migration; no remote/Production apply in this slice.

begin;
set local lock_timeout = '2s';

create or replace function public.vvip_social_media_webhook_claim()
returns table (
    event_id uuid,
    idempotency_key text,
    event_type text,
    payload_sha256 text,
    attempt_count smallint
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
begin
    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.processing_state = 'pending'
      and inbox.next_attempt_at <= statement_timestamp()
    order by inbox.next_attempt_at, inbox.created_at
    for update skip locked
    limit 1;

    if not found then
        return;
    end if;

    update public.vvip_social_media_webhook_inbox set processing_state = 'processing', attempt_count = public.vvip_social_media_webhook_inbox.attempt_count + 1, updated_at = statement_timestamp() where public.vvip_social_media_webhook_inbox.event_id = v_event.event_id;

    return query
    select
        v_event.event_id,
        v_event.idempotency_key,
        v_event.event_type,
        v_event.payload_sha256,
        (v_event.attempt_count + 1)::smallint;
end;
$function$;

revoke all on function public.vvip_social_media_webhook_claim()
    from public, anon, authenticated;
grant execute on function public.vvip_social_media_webhook_claim()
    to service_role;

commit;

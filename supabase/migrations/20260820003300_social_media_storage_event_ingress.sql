-- VVIP TIGER Gate 2 — trusted Storage INSERT -> durable webhook inbox binding.
-- Browser callers never assert media_id, MIME, byte size, dimensions, digest facts,
-- or canonical paths. The DB resolves the media record from its own quarantine path.

begin;

create function public.vvip_social_media_webhook_accept_storage(
    storage_event_id text,
    event_payload_sha256 text,
    event_bucket_id text,
    event_object_path text
)
returns table (
    event_id uuid,
    media_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '2s'
as $function$
declare
    v_asset public.vvip_social_media_assets%rowtype;
    v_event uuid;
    v_event_key text;
begin
    if storage_event_id is null
       or storage_event_id !~ '^[0-9a-fA-F-]{36}$'
       or length(storage_event_id) <> 36 then
        raise exception 'SOCIAL_MEDIA_STORAGE_EVENT_ID_INVALID';
    end if;
    if event_payload_sha256 is null or event_payload_sha256 !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_DIGEST_INVALID';
    end if;
    if event_bucket_id <> 'social-private-media' then
        raise exception 'SOCIAL_MEDIA_STORAGE_BUCKET_INVALID';
    end if;
    if event_object_path is null
       or event_object_path not like 'quarantine/%'
       or event_object_path not like '%.blob'
       or length(event_object_path) > 512 then
        raise exception 'SOCIAL_MEDIA_STORAGE_PATH_INVALID';
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.bucket_id = event_bucket_id
      and asset.quarantine_storage_path = event_object_path
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_STORAGE_EVENT_UNBOUND';
    end if;

    -- The storage row identity is stable across webhook retries. The payload digest
    -- additionally prevents the same event identity being rebound to altered facts.
    v_event_key := 'storage-object:' || lower(storage_event_id);

    select public.vvip_social_media_webhook_accept(
        v_event_key,
        event_payload_sha256,
        v_asset.media_id
    ) into v_event;

    return query select v_event, v_asset.media_id;
end;
$function$;

revoke all on function public.vvip_social_media_webhook_accept_storage(text, text, text, text)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_webhook_accept_storage(text, text, text, text)
    to service_role;

comment on function public.vvip_social_media_webhook_accept_storage(text, text, text, text) is
    'Service-only Gate 2 ingress: binds one trusted Storage INSERT to the DB-owned quarantine path before durable idempotent worker processing.';

commit;

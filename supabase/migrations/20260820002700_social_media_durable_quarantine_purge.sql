-- VVIP TIGER Gate 2 — durable physical quarantine purge acknowledgement.
-- An expired DB lease is fail-closed immediately, but physical object deletion
-- remains retryable until the trusted worker acknowledges Storage deletion.

begin;

alter table public.vvip_social_media_assets
    add column quarantine_purged_at timestamptz,
    add column quarantine_purge_attempt_count smallint not null default 0
        check (quarantine_purge_attempt_count between 0 and 32767),
    add column quarantine_purge_next_attempt_at timestamptz;

create index vvip_social_media_assets_purge_due_idx
    on public.vvip_social_media_assets (
        quarantine_purge_next_attempt_at,
        upload_lease_expires_at,
        media_id
    )
    where media_state = 'expired' and quarantine_purged_at is null;

create or replace function public.vvip_social_media_expire_quarantine(max_rows integer default 100)
returns table (
    media_id uuid,
    quarantine_storage_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if max_rows not between 1 and 500 then
        raise exception 'SOCIAL_MEDIA_QUARANTINE_BATCH_INVALID';
    end if;

    return query
    with candidates as (
        select asset.media_id
        from public.vvip_social_media_assets asset
        where asset.media_state in ('reserved', 'quarantined', 'expired')
          and asset.upload_lease_expires_at <= statement_timestamp()
          and asset.quarantine_purged_at is null
          and coalesce(asset.quarantine_purge_next_attempt_at, asset.upload_lease_expires_at) <= statement_timestamp()
        order by
            coalesce(asset.quarantine_purge_next_attempt_at, asset.upload_lease_expires_at),
            asset.media_id
        for update skip locked
        limit max_rows
    ), expired_rows as (
        update public.vvip_social_media_assets asset
        set media_state = 'expired',
            failure_code = 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED',
            quarantine_purge_attempt_count = asset.quarantine_purge_attempt_count + 1,
            quarantine_purge_next_attempt_at = statement_timestamp() +
                (case
                    when asset.quarantine_purge_attempt_count = 0 then interval '30 seconds'
                    when asset.quarantine_purge_attempt_count = 1 then interval '2 minutes'
                    when asset.quarantine_purge_attempt_count = 2 then interval '8 minutes'
                    when asset.quarantine_purge_attempt_count = 3 then interval '32 minutes'
                    else interval '1 hour'
                 end) * (0.85 + random() * 0.30),
            updated_at = statement_timestamp()
        from candidates candidate
        where asset.media_id = candidate.media_id
        returning asset.media_id, asset.quarantine_storage_path
    )
    select expired_rows.media_id, expired_rows.quarantine_storage_path
    from expired_rows;
end;
$function$;

create function public.vvip_social_media_mark_quarantine_purged(
    target_media uuid,
    expected_quarantine_path text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_asset public.vvip_social_media_assets%rowtype;
begin
    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_PURGE_TARGET_NOT_FOUND';
    end if;
    if v_asset.media_state <> 'expired' then
        raise exception 'SOCIAL_MEDIA_PURGE_STATE_INVALID';
    end if;
    if v_asset.quarantine_storage_path <> expected_quarantine_path then
        raise exception 'SOCIAL_MEDIA_PURGE_PATH_MISMATCH';
    end if;

    update public.vvip_social_media_assets asset
    set quarantine_purged_at = statement_timestamp(),
        quarantine_purge_next_attempt_at = null,
        updated_at = statement_timestamp()
    where asset.media_id = target_media
      and asset.quarantine_purged_at is null;
end;
$function$;

revoke all on function public.vvip_social_media_expire_quarantine(integer)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_expire_quarantine(integer)
    to service_role;

revoke all on function public.vvip_social_media_mark_quarantine_purged(uuid, text)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_mark_quarantine_purged(uuid, text)
    to service_role;

comment on function public.vvip_social_media_mark_quarantine_purged(uuid, text) is
    'Service-only acknowledgement that the exact expired quarantine object was physically deleted.';

commit;

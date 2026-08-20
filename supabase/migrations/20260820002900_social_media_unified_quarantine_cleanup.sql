-- VVIP TIGER Gate 2 — unified durable cleanup for quarantine objects.
-- READY canonical media is never demoted if source-object deletion is delayed.

begin;

create function public.vvip_social_media_claim_quarantine_cleanup(max_rows integer default 100)
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
        where asset.quarantine_purged_at is null
          and (
              asset.media_state = 'ready'
              or (
                  asset.media_state in ('reserved', 'quarantined', 'expired')
                  and asset.upload_lease_expires_at <= statement_timestamp()
              )
          )
          and coalesce(asset.quarantine_purge_next_attempt_at, asset.upload_lease_expires_at) <= statement_timestamp()
        order by
            coalesce(asset.quarantine_purge_next_attempt_at, asset.upload_lease_expires_at),
            asset.media_id
        for update skip locked
        limit max_rows
    ), claimed as (
        update public.vvip_social_media_assets asset
        set media_state = case when asset.media_state = 'ready' then 'ready' else 'expired' end,
            failure_code = case
                when asset.media_state = 'ready' then asset.failure_code
                else 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED'
            end,
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
    select claimed.media_id, claimed.quarantine_storage_path
    from claimed;
end;
$function$;

create or replace function public.vvip_social_media_mark_quarantine_purged(
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
    if v_asset.media_state not in ('ready', 'expired') then
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

revoke all on function public.vvip_social_media_claim_quarantine_cleanup(integer)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_claim_quarantine_cleanup(integer)
    to service_role;

revoke all on function public.vvip_social_media_mark_quarantine_purged(uuid, text)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_mark_quarantine_purged(uuid, text)
    to service_role;

comment on function public.vvip_social_media_claim_quarantine_cleanup(integer) is
    'Service-only bounded cleanup claim for READY source remnants and expired abandoned uploads.';

commit;

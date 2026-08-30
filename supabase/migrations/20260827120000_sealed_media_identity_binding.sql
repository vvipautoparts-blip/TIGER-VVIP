-- VVIP TIGER — sealed media identity binding.
-- Forward-only convergence: expose the already-authoritative job/media owner
-- only through the trusted media-finalization claim. Historical migration bytes
-- remain immutable. PostgreSQL cannot change a RETURNS TABLE shape with
-- CREATE OR REPLACE, so this transaction revokes, replaces, and re-grants the
-- same function atomically while preserving its input signature and semantics.

begin;

revoke all on function public.vvip_marketplace_claim_media_finalization(uuid, text)
from public, anon, authenticated, service_role;

drop function public.vvip_marketplace_claim_media_finalization(uuid, text);

create function public.vvip_marketplace_claim_media_finalization(
    target_media uuid,
    finalization_token text
)
returns table (
    job_id uuid,
    media_id uuid,
    listing_id uuid,
    source_storage_path text,
    expected_mime_type text,
    expected_byte_size integer,
    expected_width integer,
    expected_height integer,
    owner_subject text
)
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $function$
declare
    token_digest text;
    current_job public.vvip_media_finalization_jobs%rowtype;
    current_media public.vvip_marketplace_listing_media%rowtype;
begin
    if finalization_token is null or length(finalization_token) <> 64
       or finalization_token !~ '^[0-9a-f]{64}$' then
        raise exception 'MEDIA_FINALIZATION_TOKEN_INVALID';
    end if;

    token_digest := encode(extensions.digest(convert_to(finalization_token, 'UTF8'), 'sha256'), 'hex');

    select job.* into current_job
    from public.vvip_media_finalization_jobs job
    where job.media_id = target_media
      and job.token_hash = token_digest
      and job.job_state in ('REQUESTED', 'PROCESSING')
    for update;

    if not found then
        raise exception 'MEDIA_FINALIZATION_JOB_NOT_FOUND';
    end if;
    if current_job.expires_at <= statement_timestamp() then
        update public.vvip_media_finalization_jobs set job_state = 'EXPIRED', lease_expires_at = null, updated_at = statement_timestamp() where public.vvip_media_finalization_jobs.job_id = current_job.job_id;
        raise exception 'MEDIA_FINALIZATION_TOKEN_EXPIRED';
    end if;
    if current_job.attempt_count >= 3 then
        raise exception 'MEDIA_FINALIZATION_ATTEMPTS_EXHAUSTED';
    end if;
    if current_job.job_state = 'PROCESSING'
       and current_job.lease_expires_at > statement_timestamp() then
        raise exception 'MEDIA_FINALIZATION_ALREADY_PROCESSING';
    end if;

    select media.* into current_media
    from public.vvip_marketplace_listing_media media
    where media.media_id = target_media
    for update;

    if not found or current_media.owner_subject <> current_job.owner_subject then
        raise exception 'MEDIA_FINALIZATION_BINDING_INVALID';
    end if;
    if current_media.finalization_state = 'CANONICAL' then
        raise exception 'MARKETPLACE_MEDIA_ALREADY_CANONICAL';
    end if;

    update public.vvip_media_finalization_jobs set job_state = 'PROCESSING', attempt_count = attempt_count + 1, lease_expires_at = statement_timestamp() + interval '2 minutes', error_code = null, updated_at = statement_timestamp() where public.vvip_media_finalization_jobs.job_id = current_job.job_id;

    update public.vvip_marketplace_listing_media set finalization_state = 'PROCESSING', finalization_error_code = null where public.vvip_marketplace_listing_media.media_id = target_media;

    return query
    select
        current_job.job_id,
        current_media.media_id,
        current_media.listing_id,
        current_media.storage_path,
        current_media.mime_type,
        current_media.byte_size,
        current_media.width,
        current_media.height,
        current_job.owner_subject;
end;
$function$;

revoke all on function public.vvip_marketplace_claim_media_finalization(uuid, text)
from public, anon, authenticated;
grant execute on function public.vvip_marketplace_claim_media_finalization(uuid, text)
to service_role;

commit;

\set ON_ERROR_STOP on

begin;

-- This fixture tests the trusted claim in isolation. It bypasses unrelated
-- marketplace creation triggers only while seeding deterministic rows; all
-- claim calls run with normal trigger behavior restored.
set local session_replication_role = replica;

insert into public.vvip_marketplace_listings (
    listing_id,
    owner_subject,
    active_market_country,
    sector,
    title,
    summary,
    specifications,
    price_minor,
    currency_code,
    location_label,
    status
) values (
    '10000000-0000-4000-8000-000000000001'::uuid,
    'user_owner',
    'ZZ',
    'automotive',
    'Sealed Media Fixture',
    '',
    '{}'::jsonb,
    100,
    'USD',
    'Local rehearsal only',
    'DRAFT'
);

insert into public.vvip_marketplace_listing_media (
    media_id,
    listing_id,
    owner_subject,
    storage_path,
    mime_type,
    byte_size,
    width,
    height,
    position,
    is_cover
) values
    ('20000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'user_owner', 'identity-proof/valid.jpg', 'image/jpeg', 1024, 640, 480, 0, true),
    ('20000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'user_owner', 'identity-proof/binding.jpg', 'image/jpeg', 1024, 640, 480, 1, false),
    ('20000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'user_owner', 'identity-proof/expired.jpg', 'image/jpeg', 1024, 640, 480, 2, false),
    ('20000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'user_owner', 'identity-proof/replay.jpg', 'image/jpeg', 1024, 640, 480, 3, false),
    ('20000000-0000-4000-8000-000000000005'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'user_owner', 'identity-proof/token-mismatch.jpg', 'image/jpeg', 1024, 640, 480, 4, false);

insert into public.vvip_media_finalization_jobs (
    job_id,
    media_id,
    owner_subject,
    token_hash,
    job_state,
    attempt_count,
    expires_at,
    created_at,
    updated_at
) values
    ('30000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000001'::uuid, 'user_owner', encode(extensions.digest(convert_to(repeat('a', 64), 'UTF8'), 'sha256'), 'hex'), 'REQUESTED', 0, statement_timestamp() + interval '10 minutes', statement_timestamp(), statement_timestamp()),
    ('30000000-0000-4000-8000-000000000002'::uuid, '20000000-0000-4000-8000-000000000002'::uuid, 'user_other', encode(extensions.digest(convert_to(repeat('b', 64), 'UTF8'), 'sha256'), 'hex'), 'REQUESTED', 0, statement_timestamp() + interval '10 minutes', statement_timestamp(), statement_timestamp()),
    ('30000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000003'::uuid, 'user_owner', encode(extensions.digest(convert_to(repeat('c', 64), 'UTF8'), 'sha256'), 'hex'), 'REQUESTED', 0, statement_timestamp() - interval '1 hour', statement_timestamp() - interval '2 hours', statement_timestamp() - interval '2 hours'),
    ('30000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000004'::uuid, 'user_owner', encode(extensions.digest(convert_to(repeat('d', 64), 'UTF8'), 'sha256'), 'hex'), 'REQUESTED', 0, statement_timestamp() + interval '10 minutes', statement_timestamp(), statement_timestamp()),
    ('30000000-0000-4000-8000-000000000005'::uuid, '20000000-0000-4000-8000-000000000005'::uuid, 'user_owner', encode(extensions.digest(convert_to(repeat('e', 64), 'UTF8'), 'sha256'), 'hex'), 'REQUESTED', 0, statement_timestamp() + interval '10 minutes', statement_timestamp(), statement_timestamp());

set local session_replication_role = origin;

do $proof$
declare
    claimed record;
begin
    select * into claimed
    from public.vvip_marketplace_claim_media_finalization(
        '20000000-0000-4000-8000-000000000001'::uuid,
        repeat('a', 64)
    );

    if claimed.owner_subject is distinct from 'user_owner' then
        raise exception 'MEDIA_IDENTITY_CORRECT_OWNER=FAIL';
    end if;
    if claimed.media_id is distinct from '20000000-0000-4000-8000-000000000001'::uuid then
        raise exception 'MEDIA_IDENTITY_MEDIA_BINDING=FAIL';
    end if;
    if claimed.source_storage_path is distinct from 'identity-proof/valid.jpg' then
        raise exception 'MEDIA_IDENTITY_EXISTING_CLAIM_SHAPE=FAIL';
    end if;
end;
$proof$;
\echo MEDIA_IDENTITY_CORRECT_OWNER=PASS

do $proof$
begin
    begin
        perform *
        from public.vvip_marketplace_claim_media_finalization(
            '20000000-0000-4000-8000-000000000002'::uuid,
            repeat('b', 64)
        );
        raise exception 'MEDIA_IDENTITY_BINDING_MISMATCH=FAIL_ACCEPTED';
    exception
        when others then
            if sqlerrm <> 'MEDIA_FINALIZATION_BINDING_INVALID' then
                raise;
            end if;
    end;
end;
$proof$;
\echo MEDIA_IDENTITY_BINDING_MISMATCH=PASS

do $proof$
begin
    begin
        perform *
        from public.vvip_marketplace_claim_media_finalization(
            '20000000-0000-4000-8000-000000000005'::uuid,
            repeat('f', 64)
        );
        raise exception 'MEDIA_IDENTITY_TOKEN_MISMATCH=FAIL_ACCEPTED';
    exception
        when others then
            if sqlerrm <> 'MEDIA_FINALIZATION_JOB_NOT_FOUND' then
                raise;
            end if;
    end;
end;
$proof$;
\echo MEDIA_IDENTITY_TOKEN_MISMATCH=PASS

do $proof$
begin
    begin
        perform *
        from public.vvip_marketplace_claim_media_finalization(
            '20000000-0000-4000-8000-000000000003'::uuid,
            repeat('c', 64)
        );
        raise exception 'MEDIA_IDENTITY_EXPIRED=FAIL_ACCEPTED';
    exception
        when others then
            if sqlerrm <> 'MEDIA_FINALIZATION_TOKEN_EXPIRED' then
                raise;
            end if;
    end;
end;
$proof$;
\echo MEDIA_IDENTITY_EXPIRED=PASS

do $proof$
begin
    perform *
    from public.vvip_marketplace_claim_media_finalization(
        '20000000-0000-4000-8000-000000000004'::uuid,
        repeat('d', 64)
    );

    begin
        perform *
        from public.vvip_marketplace_claim_media_finalization(
            '20000000-0000-4000-8000-000000000004'::uuid,
            repeat('d', 64)
        );
        raise exception 'MEDIA_IDENTITY_REPLAY=FAIL_ACCEPTED';
    exception
        when others then
            if sqlerrm <> 'MEDIA_FINALIZATION_ALREADY_PROCESSING' then
                raise;
            end if;
    end;
end;
$proof$;
\echo MEDIA_IDENTITY_REPLAY=PASS

do $proof$
begin
    if has_function_privilege('anon', 'public.vvip_marketplace_claim_media_finalization(uuid,text)', 'EXECUTE') then
        raise exception 'MEDIA_IDENTITY_ANON_EXECUTE=FAIL';
    end if;
    if has_function_privilege('authenticated', 'public.vvip_marketplace_claim_media_finalization(uuid,text)', 'EXECUTE') then
        raise exception 'MEDIA_IDENTITY_AUTHENTICATED_EXECUTE=FAIL';
    end if;
    if not has_function_privilege('service_role', 'public.vvip_marketplace_claim_media_finalization(uuid,text)', 'EXECUTE') then
        raise exception 'MEDIA_IDENTITY_SERVICE_ROLE_EXECUTE=FAIL';
    end if;
end;
$proof$;
\echo MEDIA_IDENTITY_SERVICE_ONLY=PASS

\echo TIGER_MEDIA_IDENTITY_BINDING_DB_BEHAVIOR=PASS

rollback;

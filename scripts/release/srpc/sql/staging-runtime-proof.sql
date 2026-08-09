begin;
set local statement_timeout = '20s';

-- Fail closed if any synthetic identifier already exists.
do $srpc_collision$
begin
    if exists (select 1 from public.vvip_country_authority_seals where country_code = 'XZ')
       or exists (select 1 from public.vvip_authority_roles where role_id = 'srpc_phase_b_reviewer_role')
       or exists (select 1 from public.vvip_authority_principals where principal_id = 'user_srpc_reviewer')
       or exists (select 1 from public.vvip_authority_assignments where assignment_id = '00000000-0000-4000-8000-00000000b001'::uuid)
       or exists (select 1 from public.vvip_marketplace_listings where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid)
       or exists (select 1 from public.vvip_marketplace_listing_audit where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid)
    then
        raise exception 'SRPC_SYNTHETIC_ID_COLLISION';
    end if;
end
$srpc_collision$;

-- Trusted synthetic authority and inactive country. These rows are rolled back.
insert into public.vvip_authority_roles (role_id, role_rank, authority_class)
values ('srpc_phase_b_reviewer_role', 1, 'DELEGATED');

insert into public.vvip_authority_principals (
    principal_id, authority_class, principal_state, assignment_revision, created_by
) values (
    'user_srpc_reviewer', 'DELEGATED', 'active', 1, 'srpc-proof'
);

insert into public.vvip_authority_assignments (
    assignment_id, principal_id, role_id, permission_ids, scope_level,
    country_code, assignment_state, starts_at, expires_at, granted_by
) values (
    '00000000-0000-4000-8000-00000000b001'::uuid,
    'user_srpc_reviewer',
    'srpc_phase_b_reviewer_role',
    array['listing.review']::text[],
    'country',
    'XZ',
    'active',
    statement_timestamp() - interval '1 minute',
    statement_timestamp() + interval '10 minutes',
    'srpc-proof'
);

insert into public.vvip_country_authority_seals (
    country_code, activation_state, seal_status, seal_version, legal_entity_country, data_residency_region
) values (
    'XZ', 'DRAFT', 'MISSING', 'srpc-v1', 'XZ', 'srpc-test-only'
);

-- 1) A non-Clerk subject is not a marketplace actor.
select set_config('request.jwt.claims', '{"sub":"not_clerk","role":"authenticated"}', true);
set local role authenticated;
do $srpc_non_clerk$
begin
    begin
        insert into public.vvip_marketplace_listings (
            listing_id, active_market_country, sector, title, summary,
            price_minor, currency_code, location_label
        ) values (
            '00000000-0000-4000-8000-00000000b101'::uuid,
            'XZ', 'automotive', 'SRPC proof listing', 'non-clerk denial',
            100, 'USD', 'SRPC'
        );
        raise exception 'SRPC_EXPECTED_DENIAL_MISSING:NON_CLERK';
    exception when others then
        if sqlerrm <> 'MARKETPLACE_AUTH_REQUIRED' then
            raise;
        end if;
    end;
end
$srpc_non_clerk$;
reset role;

-- 2) A valid Clerk subject is still blocked while the country is inactive/unsealed.
select set_config('request.jwt.claims', '{"sub":"user_srpc_owner","role":"authenticated"}', true);
set local role authenticated;
do $srpc_inactive_country$
begin
    begin
        insert into public.vvip_marketplace_listings (
            listing_id, active_market_country, sector, title, summary,
            price_minor, currency_code, location_label
        ) values (
            '00000000-0000-4000-8000-00000000b101'::uuid,
            'XZ', 'automotive', 'SRPC proof listing', 'inactive-country denial',
            100, 'USD', 'SRPC'
        );
        raise exception 'SRPC_EXPECTED_DENIAL_MISSING:INACTIVE_COUNTRY';
    exception when others then
        if sqlerrm <> 'MARKETPLACE_COUNTRY_NOT_ACTIVE' then
            raise;
        end if;
    end;
end
$srpc_inactive_country$;
reset role;

-- Activate only the synthetic XZ country inside this transaction.
update public.vvip_country_authority_seals
set activation_state = 'ACTIVE', seal_status = 'VALID', updated_at = statement_timestamp()
where country_code = 'XZ';

-- 3) Owner can create DRAFT once the country is active.
select set_config('request.jwt.claims', '{"sub":"user_srpc_owner","role":"authenticated"}', true);
set local role authenticated;
insert into public.vvip_marketplace_listings (
    listing_id, active_market_country, sector, title, summary,
    price_minor, currency_code, location_label
) values (
    '00000000-0000-4000-8000-00000000b101'::uuid,
    'XZ', 'automotive', 'SRPC proof listing', 'transaction-scoped proof',
    100, 'USD', 'SRPC'
);

-- 4) Owner cannot self-promote to ACTIVE.
do $srpc_self_promote$
begin
    begin
        update public.vvip_marketplace_listings
        set status = 'ACTIVE'
        where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid;
        raise exception 'SRPC_EXPECTED_DENIAL_MISSING:SELF_PROMOTE';
    exception when others then
        if sqlerrm <> 'MARKETPLACE_TRUSTED_REVIEW_REQUIRED' then
            raise;
        end if;
    end;
end
$srpc_self_promote$;

-- Owner may submit for review.
update public.vvip_marketplace_listings
set status = 'PENDING_REVIEW'
where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid;

-- 5) Unassigned authenticated user cannot review.
select set_config('request.jwt.claims', '{"sub":"user_srpc_intruder","role":"authenticated"}', true);
do $srpc_unauthorized_review$
begin
    begin
        perform public.vvip_marketplace_review_listing(
            '00000000-0000-4000-8000-00000000b101'::uuid,
            'APPROVE',
            null
        );
        raise exception 'SRPC_EXPECTED_DENIAL_MISSING:UNAUTHORIZED_REVIEWER';
    exception when others then
        if sqlerrm <> 'MARKETPLACE_REVIEW_AUTHORITY_REQUIRED' then
            raise;
        end if;
    end;
end
$srpc_unauthorized_review$;

-- 6) Assigned reviewer can approve PENDING_REVIEW -> ACTIVE.
select set_config('request.jwt.claims', '{"sub":"user_srpc_reviewer","role":"authenticated"}', true);
do $srpc_authorized_review$
declare
    reviewed public.vvip_marketplace_listings%rowtype;
begin
    select * into reviewed
    from public.vvip_marketplace_review_listing(
        '00000000-0000-4000-8000-00000000b101'::uuid,
        'APPROVE',
        null
    );
    if reviewed.status <> 'ACTIVE' then
        raise exception 'SRPC_AUTHORIZED_REVIEW_DID_NOT_ACTIVATE';
    end if;
end
$srpc_authorized_review$;
reset role;

-- 7) ACTIVE audit event must exist.
do $srpc_audit_exists$
begin
    if not exists (
        select 1
        from public.vvip_marketplace_listing_audit
        where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid
          and next_status = 'ACTIVE'
    ) then
        raise exception 'SRPC_ACTIVE_AUDIT_MISSING';
    end if;
end
$srpc_audit_exists$;

-- 8) Audit is append-only even for trusted DB context.
do $srpc_audit_mutation$
begin
    begin
        update public.vvip_marketplace_listing_audit
        set reason = 'srpc-mutation-must-fail'
        where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid
          and next_status = 'ACTIVE';
        raise exception 'SRPC_EXPECTED_DENIAL_MISSING:AUDIT_MUTATION';
    exception when others then
        if sqlerrm <> 'MARKETPLACE_AUDIT_APPEND_ONLY' then
            raise;
        end if;
    end;
end
$srpc_audit_mutation$;

rollback;

-- A completed proof is valid only if rollback left zero synthetic residue.
select jsonb_build_object(
    'status', 'PASS',
    'checks', jsonb_build_object(
        'non_clerk_denied', true,
        'inactive_country_denied', true,
        'draft_owner_inserted', true,
        'self_promote_denied', true,
        'unauthorized_reviewer_denied', true,
        'authorized_reviewer_approved', true,
        'active_audit_present', true,
        'audit_mutation_denied', true
    ),
    'synthetic_residue', jsonb_build_object(
        'country_rows', (select count(*) from public.vvip_country_authority_seals where country_code = 'XZ'),
        'principal_rows', (select count(*) from public.vvip_authority_principals where principal_id = 'user_srpc_reviewer'),
        'listing_rows', (select count(*) from public.vvip_marketplace_listings where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid),
        'audit_rows', (select count(*) from public.vvip_marketplace_listing_audit where listing_id = '00000000-0000-4000-8000-00000000b101'::uuid)
    )
) as srpc_runtime_proof;

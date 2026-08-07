-- TIGER VVIP V14 marketplace foundation.
-- Requires 20260805_v13_1_authorization_foundation.sql.
-- Clerk user ids are opaque text from auth.jwt()->>'sub'.
-- No country, authority principal, price, payment, or legal seal is seeded here.

create function public.vvip_marketplace_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    select nullif(auth.jwt() ->> 'sub', '');
$function$;

create function public.vvip_marketplace_country_is_active(target_country text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_country_authority_seals seal
        where seal.country_code = target_country
          and seal.activation_state = 'ACTIVE'
          and seal.seal_status = 'VALID'
    );
$function$;

create table public.vvip_marketplace_listings (
    listing_id uuid primary key default gen_random_uuid(),
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    active_market_country text not null
        references public.vvip_country_authority_seals(country_code),
    sector text not null
        check (sector in ('automotive', 'materials', 'real-estate')),
    title text not null,
    summary text not null default '',
    specifications jsonb not null default '{}'::jsonb,
    price_minor bigint not null check (price_minor > 0 and price_minor <= 99999999999999),
    currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
    location_label text not null,
    contact_phone text,
    whatsapp_enabled boolean not null default false,
    status text not null default 'DRAFT'
        check (status in (
            'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED',
            'EXPIRED', 'REJECTED', 'BLOCKED', 'ARCHIVED'
        )),
    rejection_reason text,
    published_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (length(title) between 2 and 80),
    check (length(summary) <= 2000),
    check (jsonb_typeof(specifications) = 'object'),
    check (octet_length(specifications::text) <= 8192),
    check (length(location_label) between 1 and 120),
    check (contact_phone is null or length(contact_phone) between 7 and 32),
    check (rejection_reason is null or length(rejection_reason) <= 500),
    check (expires_at is null or published_at is null or published_at < expires_at),
    check (not whatsapp_enabled or contact_phone is not null)
);

create index vvip_marketplace_listings_public_idx
    on public.vvip_marketplace_listings
        (active_market_country, sector, status, published_at desc, created_at desc);
create index vvip_marketplace_listings_owner_idx
    on public.vvip_marketplace_listings (owner_subject, updated_at desc);

create table public.vvip_marketplace_listing_media (
    media_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null
        references public.vvip_marketplace_listings(listing_id) on delete cascade,
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    storage_path text not null unique,
    mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
    byte_size integer not null check (byte_size between 1 and 10485760),
    width integer not null check (width between 320 and 4096),
    height integer not null check (height between 240 and 4096),
    position smallint not null check (position between 0 and 6),
    is_cover boolean not null default false,
    alt_text text not null default 'صورة الإعلان',
    created_at timestamptz not null default statement_timestamp(),
    check (length(owner_subject) between 1 and 128),
    check (length(storage_path) between 1 and 500),
    check (length(alt_text) between 1 and 160),
    unique (listing_id, position)
);

create unique index vvip_marketplace_one_cover_per_listing
    on public.vvip_marketplace_listing_media (listing_id)
    where is_cover;

create table public.vvip_marketplace_favorites (
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    listing_id uuid not null
        references public.vvip_marketplace_listings(listing_id) on delete cascade,
    created_at timestamptz not null default statement_timestamp(),
    primary key (owner_subject, listing_id),
    check (length(owner_subject) between 1 and 128)
);

create table public.vvip_marketplace_listing_audit (
    audit_id uuid primary key default gen_random_uuid(),
    listing_id uuid not null,
    actor_subject text,
    previous_status text,
    next_status text not null,
    reason text,
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject is null or length(actor_subject) between 1 and 128),
    check (reason is null or length(reason) <= 500)
);

create function public.vvip_marketplace_guard_listing_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is null and current_user in ('anon', 'authenticated') then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    if TG_OP = 'INSERT' then
        if current_user in ('anon', 'authenticated') then
            if NEW.owner_subject <> actor or NEW.status <> 'DRAFT' then
                raise exception 'MARKETPLACE_CLIENT_INSERT_DENIED';
            end if;
        end if;
    elsif TG_OP = 'UPDATE' then
        if NEW.owner_subject <> OLD.owner_subject
           or NEW.active_market_country <> OLD.active_market_country then
            raise exception 'MARKETPLACE_IMMUTABLE_SCOPE';
        end if;
        if current_user in ('anon', 'authenticated') then
            if OLD.owner_subject <> actor then
                raise exception 'MARKETPLACE_OWNER_REQUIRED';
            end if;
            if NEW.status in ('ACTIVE', 'EXPIRED', 'REJECTED', 'BLOCKED') then
                raise exception 'MARKETPLACE_TRUSTED_REVIEW_REQUIRED';
            end if;
            if not (
                (OLD.status = 'DRAFT' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'REJECTED' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ACTIVE' and NEW.status in ('ACTIVE', 'PAUSED', 'ARCHIVED'))
                or (OLD.status = 'PAUSED' and NEW.status in ('PAUSED', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ARCHIVED' and NEW.status = 'ARCHIVED')
            ) then
                raise exception 'MARKETPLACE_STATE_TRANSITION_DENIED';
            end if;
        end if;
    end if;

    if not public.vvip_marketplace_country_is_active(NEW.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

create function public.vvip_marketplace_record_listing_audit()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP = 'INSERT' or NEW.status is distinct from OLD.status then
        insert into public.vvip_marketplace_listing_audit (
            listing_id, actor_subject, previous_status, next_status, reason
        ) values (
            NEW.listing_id,
            public.vvip_marketplace_actor_id(),
            case when TG_OP = 'INSERT' then null else OLD.status end,
            NEW.status,
            NEW.rejection_reason
        );
    end if;
    return NEW;
end;
$function$;

create trigger vvip_marketplace_listing_write_guard
before insert or update on public.vvip_marketplace_listings
for each row execute function public.vvip_marketplace_guard_listing_write();

create trigger vvip_marketplace_listing_audit_trigger
after insert or update on public.vvip_marketplace_listings
for each row execute function public.vvip_marketplace_record_listing_audit();

create function public.vvip_marketplace_actor_can_review(target_country text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    with actor as (
        select public.vvip_marketplace_actor_id() as actor_id
    )
    select exists (
        select 1
        from public.vvip_authority_principals principal
        cross join actor
        where principal.principal_id = actor.actor_id
          and principal.principal_state = 'active'
          and principal.authority_class = 'OWNER_ROOT'
    ) or exists (
        select 1
        from public.vvip_authority_principals principal
        join public.vvip_authority_assignments assignment
          on assignment.principal_id = principal.principal_id
        cross join actor
        where principal.principal_id = actor.actor_id
          and principal.principal_state = 'active'
          and assignment.assignment_state = 'active'
          and statement_timestamp() >= assignment.starts_at
          and (assignment.expires_at is null or statement_timestamp() < assignment.expires_at)
          and ('listing.review' = any(assignment.permission_ids)
               or 'listing.manage' = any(assignment.permission_ids))
          and (
              assignment.scope_level = 'platform'
              or (assignment.country_code = target_country)
          )
    );
$function$;

create function public.vvip_marketplace_review_listing(
    target_listing uuid,
    decision text,
    decision_reason text default null
)
returns public.vvip_marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    current_listing public.vvip_marketplace_listings%rowtype;
    result public.vvip_marketplace_listings%rowtype;
begin
    select * into current_listing
    from public.vvip_marketplace_listings
    where listing_id = target_listing
    for update;

    if not found then
        raise exception 'MARKETPLACE_LISTING_NOT_FOUND';
    end if;
    if not public.vvip_marketplace_actor_can_review(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_REVIEW_AUTHORITY_REQUIRED';
    end if;
    if current_listing.status <> 'PENDING_REVIEW' then
        raise exception 'MARKETPLACE_REVIEW_STATE_INVALID';
    end if;
    if decision not in ('APPROVE', 'REJECT', 'BLOCK') then
        raise exception 'MARKETPLACE_REVIEW_DECISION_INVALID';
    end if;
    if decision in ('REJECT', 'BLOCK') and nullif(btrim(decision_reason), '') is null then
        raise exception 'MARKETPLACE_REVIEW_REASON_REQUIRED';
    end if;

    update public.vvip_marketplace_listings
    set status = case decision
            when 'APPROVE' then 'ACTIVE'
            when 'REJECT' then 'REJECTED'
            else 'BLOCKED'
        end,
        rejection_reason = case when decision = 'APPROVE' then null else left(decision_reason, 500) end,
        published_at = case when decision = 'APPROVE' then statement_timestamp() else published_at end,
        updated_at = statement_timestamp()
    where listing_id = target_listing
    returning * into result;

    return result;
end;
$function$;

create function public.vvip_marketplace_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    raise exception 'MARKETPLACE_AUDIT_APPEND_ONLY';
end;
$function$;

create trigger vvip_marketplace_audit_append_only
before update or delete on public.vvip_marketplace_listing_audit
for each row execute function public.vvip_marketplace_reject_audit_mutation();

alter table public.vvip_marketplace_listings enable row level security;
alter table public.vvip_marketplace_listings force row level security;
alter table public.vvip_marketplace_listing_media enable row level security;
alter table public.vvip_marketplace_listing_media force row level security;
alter table public.vvip_marketplace_favorites enable row level security;
alter table public.vvip_marketplace_favorites force row level security;
alter table public.vvip_marketplace_listing_audit enable row level security;
alter table public.vvip_marketplace_listing_audit force row level security;

create policy vvip_marketplace_public_read_active
on public.vvip_marketplace_listings
for select
to anon, authenticated
using (
    status = 'ACTIVE'
    and public.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_owner_read
on public.vvip_marketplace_listings
for select
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id());

create policy vvip_marketplace_owner_insert_draft
on public.vvip_marketplace_listings
for insert
to authenticated
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and status = 'DRAFT'
    and public.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_owner_update
on public.vvip_marketplace_listings
for update
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (owner_subject = public.vvip_marketplace_actor_id());

create policy vvip_marketplace_owner_delete
on public.vvip_marketplace_listings
for delete
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    and status in ('DRAFT', 'ARCHIVED')
);

create policy vvip_marketplace_media_read
on public.vvip_marketplace_listing_media
for select
to anon, authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    or exists (
        select 1 from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.status = 'ACTIVE'
          and public.vvip_marketplace_country_is_active(listing.active_market_country)
    )
);

create policy vvip_marketplace_media_owner_write
on public.vvip_marketplace_listing_media
for all
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and position between 0 and 6
    and exists (
        select 1 from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.owner_subject = public.vvip_marketplace_actor_id()
          and listing.status in ('DRAFT', 'REJECTED')
    )
);

create policy vvip_marketplace_favorites_owner
on public.vvip_marketplace_favorites
for all
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (owner_subject = public.vvip_marketplace_actor_id());

revoke all privileges on table
    public.vvip_marketplace_listings,
    public.vvip_marketplace_listing_media,
    public.vvip_marketplace_favorites,
    public.vvip_marketplace_listing_audit
from public;

revoke all privileges on table
    public.vvip_marketplace_listings,
    public.vvip_marketplace_listing_media,
    public.vvip_marketplace_favorites,
    public.vvip_marketplace_listing_audit
from anon, authenticated;

grant select on public.vvip_marketplace_listings to anon, authenticated;
grant insert, update, delete on public.vvip_marketplace_listings to authenticated;
grant select on public.vvip_marketplace_listing_media to anon, authenticated;
grant insert, update, delete on public.vvip_marketplace_listing_media to authenticated;
grant select, insert, delete on public.vvip_marketplace_favorites to authenticated;

revoke all on function public.vvip_marketplace_review_listing(uuid, text, text) from public, anon;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text) to authenticated;
revoke all on function public.vvip_marketplace_actor_can_review(text) from public, anon;
grant execute on function public.vvip_marketplace_actor_can_review(text) to authenticated;
grant execute on function public.vvip_marketplace_actor_id() to anon, authenticated;
grant execute on function public.vvip_marketplace_country_is_active(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'listing-media',
    'listing-media',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy vvip_listing_media_storage_owner_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy vvip_listing_media_storage_owner_update
on storage.objects
for update
to authenticated
using (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
)
with check (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
);

create policy vvip_listing_media_storage_owner_delete
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'listing-media'
    and owner_id = public.vvip_marketplace_actor_id()
);

create policy vvip_listing_media_storage_read
on storage.objects
for select
to anon, authenticated
using (
    bucket_id = 'listing-media'
    and (
        owner_id = public.vvip_marketplace_actor_id()
        or exists (
            select 1
            from public.vvip_marketplace_listing_media media
            join public.vvip_marketplace_listings listing
              on listing.listing_id = media.listing_id
            where media.storage_path = storage.objects.name
              and listing.status = 'ACTIVE'
              and public.vvip_marketplace_country_is_active(listing.active_market_country)
        )
    )
);

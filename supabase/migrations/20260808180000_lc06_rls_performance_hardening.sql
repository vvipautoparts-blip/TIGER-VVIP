-- TIGER VVIP LC-06 RLS and launch-path performance hardening.
-- Modern/canonical convergence only. Production promotion remains a separate owner gate.

begin;

-- Browser-owned marketplace operations are Clerk-only. A Supabase anonymous UUID
-- (or any non-Clerk subject) resolves to NULL and therefore fails owner predicates.
create or replace function public.vvip_marketplace_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
    select case
        when nullif(auth.jwt() ->> 'sub', '') like 'user\_%' escape '\'
            then nullif(auth.jwt() ->> 'sub', '')
        else null
    end;
$function$;

-- The shipped runtime has already converged on public.profiles through the
-- vvip_resolve_own_profile RPC. Keep the duplicate transitional table for
-- controlled migration/history, but remove every direct browser data path.
alter table public.vvip_clerk_profiles enable row level security;
alter table public.vvip_clerk_profiles force row level security;

drop policy if exists "Clerk users can read own vvip profile"
on public.vvip_clerk_profiles;

drop policy if exists "Clerk users can insert own vvip profile"
on public.vvip_clerk_profiles;

drop policy if exists "Clerk users can update own vvip profile"
on public.vvip_clerk_profiles;

revoke all privileges on table public.vvip_clerk_profiles
from public, anon, authenticated;

-- Public ACTIVE listings stay readable anonymously. Authenticated users receive
-- one SELECT policy combining public-active visibility with their private owner view.
drop policy if exists vvip_marketplace_public_read_active
on public.vvip_marketplace_listings;

drop policy if exists vvip_marketplace_owner_read
on public.vvip_marketplace_listings;

drop policy if exists vvip_marketplace_authenticated_read
on public.vvip_marketplace_listings;

create policy vvip_marketplace_public_read_active
on public.vvip_marketplace_listings
for select
to anon
using (
    status = 'ACTIVE'
    and vvip_private.vvip_marketplace_country_is_active(active_market_country)
);

create policy vvip_marketplace_authenticated_read
on public.vvip_marketplace_listings
for select
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
    or (
        status = 'ACTIVE'
        and vvip_private.vvip_marketplace_country_is_active(active_market_country)
    )
);

-- The previous FOR ALL media owner policy also participated in SELECT, creating
-- a second permissive read path. Preserve its exact write semantics by splitting it.
drop policy if exists vvip_marketplace_media_owner_write
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_owner_insert
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_owner_update
on public.vvip_marketplace_listing_media;

drop policy if exists vvip_marketplace_media_owner_delete
on public.vvip_marketplace_listing_media;

create policy vvip_marketplace_media_owner_insert
on public.vvip_marketplace_listing_media
for insert
to authenticated
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and position between 0 and 6
    and exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.owner_subject = public.vvip_marketplace_actor_id()
          and listing.status in ('DRAFT', 'REJECTED')
    )
);

create policy vvip_marketplace_media_owner_update
on public.vvip_marketplace_listing_media
for update
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id())
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and position between 0 and 6
    and exists (
        select 1
        from public.vvip_marketplace_listings listing
        where listing.listing_id = vvip_marketplace_listing_media.listing_id
          and listing.owner_subject = public.vvip_marketplace_actor_id()
          and listing.status in ('DRAFT', 'REJECTED')
    )
);

create policy vvip_marketplace_media_owner_delete
on public.vvip_marketplace_listing_media
for delete
to authenticated
using (owner_subject = public.vvip_marketplace_actor_id());

-- Cover every modern FK reported by the Staging performance advisor. These are
-- narrow btree indexes only; no advisor-reported "unused" index is removed.
create index if not exists ai_audit_events_approval_id_idx
on public.ai_audit_events (approval_id);

create index if not exists profiles_superior_id_idx
on public.profiles (superior_id);

create index if not exists vvip_authority_assignments_role_id_idx
on public.vvip_authority_assignments (role_id);

create index if not exists vvip_marketplace_favorites_listing_id_idx
on public.vvip_marketplace_favorites (listing_id);

commit;

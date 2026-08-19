-- VVIP TIGER Gate 2 — reservation fail-fast and content-identity hardening.
-- Repository/local-rehearsal only. This migration intentionally does not enable
-- cross-user physical deduplication; a digest is evidence, not an ownership key.

begin;

-- Bound lock waiting for the authenticated reservation RPC without changing the
-- caller transaction globally. PostgreSQL restores function SET values on exit.
alter function public.vvip_social_media_reserve_upload(uuid, text)
    set lock_timeout to '2s';

-- Equal canonical bytes from distinct media records are valid. The original
-- column-level UNIQUE declarations accidentally coupled content identity to
-- ownership and would reject a second user/media record with the same image.
-- Keep ordinary digest indexes for integrity/audit lookup while canonical paths
-- remain unique per media_id.
alter table public.vvip_social_media_assets
    drop constraint if exists vvip_social_media_assets_canonical_sha256_key;

alter table public.vvip_social_media_passports
    drop constraint if exists vvip_social_media_passports_canonical_sha256_key;

create index if not exists vvip_social_media_assets_canonical_sha_idx
    on public.vvip_social_media_assets (canonical_sha256)
    where canonical_sha256 is not null;

create index if not exists vvip_social_media_passports_canonical_sha_idx
    on public.vvip_social_media_passports (canonical_sha256);

comment on function public.vvip_social_media_reserve_upload(uuid, text) is
    'Authenticated metadata-free reservation with a 2s lock-wait fail-fast budget and a DB-owned 300s upload acceptance lease.';

commit;

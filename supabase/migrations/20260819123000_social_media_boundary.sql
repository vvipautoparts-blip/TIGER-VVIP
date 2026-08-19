-- TIGER Social Media Boundary 2026.
-- Repository migration only. Remote application remains a separate authorized gate.
-- Social media authorization derives only from the current Social Core post/relationship authority.

begin;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'tiger-social-media',
    'tiger-social-media',
    false,
    10485760,
    array['image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.vvip_social_post_media (
    media_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts(post_id) on delete cascade,
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    storage_bucket text not null default 'tiger-social-media'
        check (storage_bucket = 'tiger-social-media'),
    storage_path text not null unique,
    mime_type text not null
        check (mime_type in ('image/jpeg', 'image/webp')),
    byte_size integer not null
        check (byte_size > 0 and byte_size <= 10485760),
    width integer not null
        check (width > 0 and width <= 4096),
    height integer not null
        check (height > 0 and height <= 4096),
    sha256 text not null
        check (sha256 ~ '^[0-9a-f]{64}$'),
    position smallint not null default 0
        check (position >= 0 and position <= 9),
    alt_text text not null default ''
        check (length(alt_text) <= 500),
    created_at timestamptz not null default statement_timestamp(),
    check (owner_subject like 'user\_%' escape '\'),
    check ((width::bigint * height::bigint) <= 16777216),
    check (
        storage_path = owner_subject || '/' || media_id::text || '/' || sha256 ||
            case mime_type
                when 'image/jpeg' then '.jpg'
                when 'image/webp' then '.webp'
            end
    ),
    unique (post_id, position)
);

create index vvip_social_post_media_post_idx
    on public.vvip_social_post_media (post_id, position);
create index vvip_social_post_media_owner_idx
    on public.vvip_social_post_media (owner_subject, created_at desc);

create function public.vvip_social_post_visible_to_actor(target_post uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_social_posts p
        cross join lateral (
            select public.vvip_marketplace_actor_id() as actor
        ) identity
        where p.post_id = target_post
          and identity.actor is not null
          and (
              p.author_subject = identity.actor
              or p.audience = 'public'
              or (
                  p.audience = 'friends'
                  and exists (
                      select 1
                      from public.vvip_social_relationships r
                      where r.relationship_state = 'friends'
                        and r.subject_low = least(p.author_subject, identity.actor)
                        and r.subject_high = greatest(p.author_subject, identity.actor)
                  )
              )
          )
    );
$function$;

revoke all on function public.vvip_social_post_visible_to_actor(uuid)
    from public, anon;
grant execute on function public.vvip_social_post_visible_to_actor(uuid)
    to authenticated;

alter table public.vvip_social_post_media enable row level security;
alter table public.vvip_social_post_media force row level security;

revoke all privileges on table public.vvip_social_post_media
    from public, anon, authenticated;
grant select, insert, delete on table public.vvip_social_post_media
    to authenticated;

create policy vvip_social_post_media_visible_read
on public.vvip_social_post_media
for select
to authenticated
using (
    public.vvip_social_post_visible_to_actor(post_id)
);

create policy vvip_social_post_media_owner_insert
on public.vvip_social_post_media
for insert
to authenticated
with check (
    owner_subject = public.vvip_marketplace_actor_id()
    and exists (
        select 1
        from public.vvip_social_posts p
        where p.post_id = vvip_social_post_media.post_id
          and p.author_subject = public.vvip_marketplace_actor_id()
    )
    and storage_bucket = 'tiger-social-media'
    and storage_path = owner_subject || '/' || media_id::text || '/' || sha256 ||
        case mime_type
            when 'image/jpeg' then '.jpg'
            when 'image/webp' then '.webp'
        end
);

create policy vvip_social_post_media_owner_delete
on public.vvip_social_post_media
for delete
to authenticated
using (
    owner_subject = public.vvip_marketplace_actor_id()
);

create policy vvip_social_media_object_visible_read
on storage.objects for select
to authenticated
using (
    bucket_id = 'tiger-social-media'
    and exists (
        select 1
        from public.vvip_social_post_media m
        where m.storage_bucket = storage.objects.bucket_id
          and m.storage_path = storage.objects.name
          and public.vvip_social_post_visible_to_actor(m.post_id)
    )
);

create policy vvip_social_media_object_owner_insert
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'tiger-social-media'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and storage.filename(name) ~ '^[0-9a-f]{64}\.(jpg|webp)$'
);

create policy vvip_social_media_object_owner_delete
on storage.objects for delete
to authenticated
using (
    bucket_id = 'tiger-social-media'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
);

commit;

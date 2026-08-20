-- VVIP TIGER Social Bookmarks 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Bookmarks are private actor-scoped state: browser clients receive no direct table CRUD,
-- no saver list/count is exposed, and saving is permitted only for currently visible posts.

begin;

create table public.vvip_social_bookmarks (
    bookmark_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    actor_subject text not null default public.vvip_marketplace_actor_id(),
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject like 'user\_%' escape '\'),
    unique (post_id, actor_subject)
);

create index vvip_social_bookmarks_actor_idx
    on public.vvip_social_bookmarks (actor_subject, created_at desc);

alter table public.vvip_social_bookmarks enable row level security;
alter table public.vvip_social_bookmarks force row level security;

revoke all privileges on table public.vvip_social_bookmarks from public, anon, authenticated;

create policy vvip_social_bookmark_owner_read
on public.vvip_social_bookmarks
for select
to authenticated
using (
    actor_subject = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_bookmark_owner_create
on public.vvip_social_bookmarks
for insert
to authenticated
with check (
    actor_subject = (select public.vvip_marketplace_actor_id())
    and public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_bookmark_owner_remove
on public.vvip_social_bookmarks
for delete
to authenticated
using (
    actor_subject = (select public.vvip_marketplace_actor_id())
);

create function public.vvip_social_bookmark_state(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_saved boolean := false;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    select exists (
        select 1
        from public.vvip_social_bookmarks bookmark
        where bookmark.post_id = p_post_id
          and bookmark.actor_subject = v_actor
    ) into v_saved;

    return jsonb_build_object(
        'ok', true,
        'post_id', p_post_id,
        'saved', v_saved
    );
end;
$function$;

create function public.vvip_social_save_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    insert into public.vvip_social_bookmarks (post_id, actor_subject)
    values (p_post_id, v_actor)
    on conflict (post_id, actor_subject) do nothing;

    return public.vvip_social_bookmark_state(p_post_id);
end;
$function$;

create function public.vvip_social_unsave_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    delete from public.vvip_social_bookmarks bookmark where bookmark.post_id = p_post_id and bookmark.actor_subject = v_actor;

    return jsonb_build_object(
        'ok', true,
        'post_id', p_post_id,
        'saved', false
    );
end;
$function$;

revoke all on function public.vvip_social_bookmark_state(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_save_post(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_unsave_post(uuid) from public, anon, authenticated;

grant execute on function public.vvip_social_bookmark_state(uuid) to authenticated;
grant execute on function public.vvip_social_save_post(uuid) to authenticated;
grant execute on function public.vvip_social_unsave_post(uuid) to authenticated;

comment on table public.vvip_social_bookmarks is
    'Private Social Core save state. Never a public engagement signal or saver directory.';

commit;

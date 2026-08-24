-- VVIP TIGER Social Reposts 2026.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Reposts preserve original-post identity, re-check both repost and original visibility for every viewer,
-- keep repost snapshots synchronized with original edits, and expose no direct browser table CRUD.

begin;

create table public.vvip_social_reposts (
    repost_id uuid primary key default gen_random_uuid(),
    original_post_id uuid not null,
    repost_post_id uuid not null unique references public.vvip_social_posts (post_id) on delete cascade,
    actor_subject text not null default public.vvip_marketplace_actor_id(),
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject like 'user\_%' escape '\'),
    unique (original_post_id, actor_subject)
);

create index vvip_social_reposts_actor_idx
    on public.vvip_social_reposts (actor_subject, created_at desc);
create index vvip_social_reposts_original_idx
    on public.vvip_social_reposts (original_post_id, created_at desc);

alter table public.vvip_social_reposts enable row level security;
alter table public.vvip_social_reposts force row level security;

revoke all privileges on table public.vvip_social_reposts from public, anon, authenticated;

-- A repost is visible only when the viewer may see BOTH the repost author's selected
-- audience and the original post under current block/friend/privacy state. Keeping the
-- original UUID outside an FK intentionally preserves lineage after original deletion;
-- if the original row no longer exists, the intersection fails closed and the repost
-- disappears instead of becoming a standalone leaked snapshot.
create or replace function public.vvip_social_can_view_post(
    p_post_id uuid,
    p_actor text
)
returns boolean
language sql
stable
security definer set search_path = pg_catalog, public
as $function$
    select
        coalesce(p_actor ~ '^user_[A-Za-z0-9_-]{6,128}$', false)
        and exists (
            select 1
            from public.vvip_social_posts as post
            where post.post_id = p_post_id
              and (
                    post.author_subject = p_actor
                    or (
                        not public.vvip_social_is_blocked_pair(post.author_subject, p_actor)
                        and (
                            post.audience = 'public'
                            or (
                                post.audience = 'friends'
                                and exists (
                                    select 1
                                    from public.vvip_social_relationships as relationship
                                    where relationship.relationship_state = 'friends'
                                      and relationship.subject_low = least(post.author_subject, p_actor)
                                      and relationship.subject_high = greatest(post.author_subject, p_actor)
                                )
                            )
                        )
                    )
              )
              and (
                    not exists (
                        select 1
                        from public.vvip_social_reposts as repost
                        where repost.repost_post_id = post.post_id
                    )
                    or exists (
                        select 1
                        from public.vvip_social_reposts as repost
                        join public.vvip_social_posts as original
                          on original.post_id = repost.original_post_id
                        where repost.repost_post_id = post.post_id
                          and (
                                original.author_subject = p_actor
                                or (
                                    not public.vvip_social_is_blocked_pair(original.author_subject, p_actor)
                                    and (
                                        original.audience = 'public'
                                        or (
                                            original.audience = 'friends'
                                            and exists (
                                                select 1
                                                from public.vvip_social_relationships as original_relationship
                                                where original_relationship.relationship_state = 'friends'
                                                  and original_relationship.subject_low = least(original.author_subject, p_actor)
                                                  and original_relationship.subject_high = greatest(original.author_subject, p_actor)
                                            )
                                        )
                                    )
                                )
                          )
                    )
              )
        );
$function$;

revoke all on function public.vvip_social_can_view_post(uuid, text) from public, anon, authenticated;

-- Repost posts are server-owned snapshots. Normal browser post-update/delete paths may
-- not detach them from their lineage; only SECURITY DEFINER maintenance may synchronize
-- them with the original or trusted lifecycle cleanup may remove them.
create function public.vvip_social_guard_repost_snapshot_write()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    if current_user in ('anon', 'authenticated')
       and exists (
           select 1
           from public.vvip_social_reposts as repost
           where repost.repost_post_id = old.post_id
       ) then
        raise exception 'SOCIAL_REPOST_SNAPSHOT_IMMUTABLE';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.vvip_social_guard_repost_snapshot_write() from public, anon, authenticated;

create trigger vvip_social_repost_snapshot_write_guard
before update or delete on public.vvip_social_posts
for each row execute function public.vvip_social_guard_repost_snapshot_write();

-- If an original author edits the body, all still-linked repost snapshots are updated
-- transactionally. The nested updates execute under this function owner, so the browser
-- cannot use the ordinary post mutation boundary to edit a repost snapshot independently.
create function public.vvip_social_sync_repost_snapshot()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    update public.vvip_social_posts as repost_post set body = new.body, updated_at = statement_timestamp() where repost_post.post_id in (
        select repost.repost_post_id
        from public.vvip_social_reposts as repost
        where repost.original_post_id = new.post_id
    );
    return new;
end;
$function$;

revoke all on function public.vvip_social_sync_repost_snapshot() from public, anon, authenticated;

create trigger vvip_social_repost_snapshot_sync
after update of body on public.vvip_social_posts
for each row execute function public.vvip_social_sync_repost_snapshot();

create function public.vvip_social_repost_post(p_original_post_id uuid, p_audience text)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_original_body text;
    v_original_audience text;
    v_existing_repost_post_id uuid;
    v_existing_audience text;
    v_repost_post_id uuid;
    v_original_rank integer;
    v_requested_rank integer;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not public.vvip_social_actor_active() then
        raise exception 'SOCIAL_PROFILE_INACTIVE';
    end if;

    if p_audience not in ('public', 'friends', 'only_me') then
        raise exception 'SOCIAL_REPOST_AUDIENCE_INVALID';
    end if;

    if exists (
        select 1
        from public.vvip_social_reposts as parent_repost
        where parent_repost.repost_post_id = p_original_post_id
    ) then
        raise exception 'SOCIAL_REPOST_CHAIN_FORBIDDEN';
    end if;

    if not public.vvip_social_can_view_post(p_original_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    select post.body, post.audience
      into v_original_body, v_original_audience
      from public.vvip_social_posts as post
     where post.post_id = p_original_post_id;

    if not found then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    v_original_rank := case v_original_audience
        when 'public' then 0
        when 'friends' then 1
        when 'only_me' then 2
        else 99
    end;
    v_requested_rank := case p_audience
        when 'public' then 0
        when 'friends' then 1
        when 'only_me' then 2
        else -1
    end;

    if v_requested_rank < v_original_rank then
        raise exception 'SOCIAL_REPOST_AUDIENCE_WIDENING_FORBIDDEN';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(v_actor || ':' || p_original_post_id::text, 0));

    select repost.repost_post_id, repost_post.audience
      into v_existing_repost_post_id, v_existing_audience
      from public.vvip_social_reposts as repost
      join public.vvip_social_posts as repost_post
        on repost_post.post_id = repost.repost_post_id
     where repost.original_post_id = p_original_post_id
       and repost.actor_subject = v_actor
     limit 1;

    if v_existing_repost_post_id is not null then
        return jsonb_build_object(
            'ok', true,
            'created', false,
            'original_post_id', p_original_post_id,
            'repost_post_id', v_existing_repost_post_id,
            'audience', v_existing_audience
        );
    end if;

    insert into public.vvip_social_posts (author_subject, body, audience)
    values (v_actor, v_original_body, p_audience)
    returning post_id into v_repost_post_id;

    insert into public.vvip_social_reposts (
        original_post_id,
        repost_post_id,
        actor_subject
    ) values (
        p_original_post_id,
        v_repost_post_id,
        v_actor
    );

    return jsonb_build_object(
        'ok', true,
        'created', true,
        'original_post_id', p_original_post_id,
        'repost_post_id', v_repost_post_id,
        'audience', p_audience
    );
end;
$function$;

revoke all on function public.vvip_social_repost_post(uuid, text) from public, anon, authenticated;
grant execute on function public.vvip_social_repost_post(uuid, text) to authenticated;

comment on table public.vvip_social_reposts is
    'Private server-owned repost lineage. One active repost per actor/original pair; original visibility is rechecked for every viewer.';
comment on function public.vvip_social_repost_post(uuid, text) is
    'Creates or returns an actor repost while preserving the original privacy ceiling and current original-view authorization.';

commit;

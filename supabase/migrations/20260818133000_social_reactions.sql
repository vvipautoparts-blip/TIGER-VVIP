-- VVIP TIGER Social Reactions 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Browser clients receive no direct table privilege; bounded RPCs expose only summary,
-- set-current-reaction, and remove-current-reaction behavior.

begin;

create table public.vvip_social_reactions (
    reaction_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    actor_subject text not null default public.vvip_marketplace_actor_id(),
    reaction_type text not null
        check (reaction_type in ('like', 'love', 'support', 'haha', 'wow', 'sad', 'angry')),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (actor_subject like 'user\_%' escape '\'),
    unique (post_id, actor_subject)
);

create index vvip_social_reactions_post_idx
    on public.vvip_social_reactions (post_id, reaction_type, updated_at desc);
create index vvip_social_reactions_actor_idx
    on public.vvip_social_reactions (actor_subject, updated_at desc);

alter table public.vvip_social_reactions enable row level security;
alter table public.vvip_social_reactions force row level security;

revoke all privileges on table public.vvip_social_reactions from public, anon, authenticated;

create function public.vvip_social_can_view_post(p_post_id uuid, p_actor text)
returns boolean
language sql
stable
security definer set search_path = pg_catalog
as $function$
    select
        p_actor is not null
        and p_actor like 'user\_%' escape '\'
        and exists (
            select 1
            from public.vvip_social_posts post
            where post.post_id = p_post_id
              and (
                    post.author_subject = p_actor
                    or post.audience = 'public'
                    or (
                        post.audience = 'friends'
                        and exists (
                            select 1
                            from public.vvip_social_relationships relationship
                            where relationship.relationship_state = 'friends'
                              and relationship.subject_low = least(post.author_subject, p_actor)
                              and relationship.subject_high = greatest(post.author_subject, p_actor)
                        )
                    )
              )
        );
$function$;

create policy vvip_social_reaction_visible_read
on public.vvip_social_reactions
for select
to authenticated
using (
    public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_reaction_owner_create
on public.vvip_social_reactions
for insert
to authenticated
with check (
    actor_subject = (select public.vvip_marketplace_actor_id())
    and public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_reaction_owner_update
on public.vvip_social_reactions
for update
to authenticated
using (
    actor_subject = (select public.vvip_marketplace_actor_id())
    and public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
)
with check (
    actor_subject = (select public.vvip_marketplace_actor_id())
    and public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_reaction_owner_remove
on public.vvip_social_reactions
for delete
to authenticated
using (
    actor_subject = (select public.vvip_marketplace_actor_id())
);

create function public.vvip_social_reaction_summary(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_counts jsonb := '{}'::jsonb;
    v_total integer := 0;
    v_viewer_reaction text := null;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    select
        coalesce(jsonb_object_agg(summary.reaction_type, summary.reaction_count), '{}'::jsonb),
        coalesce(sum(summary.reaction_count), 0)::integer
    into v_counts, v_total
    from (
        select reaction.reaction_type, count(*)::integer as reaction_count
        from public.vvip_social_reactions reaction
        where reaction.post_id = p_post_id
        group by reaction.reaction_type
    ) summary;

    select reaction.reaction_type
    into v_viewer_reaction
    from public.vvip_social_reactions reaction
    where reaction.post_id = p_post_id
      and reaction.actor_subject = v_actor;

    return jsonb_build_object(
        'ok', true,
        'post_id', p_post_id,
        'total', v_total,
        'counts', v_counts,
        'viewer_reaction', v_viewer_reaction
    );
end;
$function$;

create function public.vvip_social_set_reaction(p_post_id uuid, p_reaction_type text)
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

    if p_reaction_type not in ('like', 'love', 'support', 'haha', 'wow', 'sad', 'angry') then
        raise exception 'SOCIAL_REACTION_INVALID';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    insert into public.vvip_social_reactions (
        post_id,
        actor_subject,
        reaction_type
    ) values (
        p_post_id,
        v_actor,
        p_reaction_type
    )
    on conflict (post_id, actor_subject)
    do update set
        reaction_type = excluded.reaction_type,
        updated_at = statement_timestamp();

    return public.vvip_social_reaction_summary(p_post_id);
end;
$function$;

create function public.vvip_social_remove_reaction(p_post_id uuid)
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

    delete from public.vvip_social_reactions reaction
    where reaction.post_id = p_post_id
      and reaction.actor_subject = v_actor;

    return public.vvip_social_reaction_summary(p_post_id);
end;
$function$;

revoke all on function public.vvip_social_can_view_post(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_reaction_summary(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_set_reaction(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_remove_reaction(uuid) from public, anon, authenticated;

grant execute on function public.vvip_social_reaction_summary(uuid) to authenticated;
grant execute on function public.vvip_social_set_reaction(uuid, text) to authenticated;
grant execute on function public.vvip_social_remove_reaction(uuid) to authenticated;

commit;

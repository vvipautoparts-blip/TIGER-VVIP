-- VVIP TIGER Social Follows 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Follow is directional and independent from friendship authority. Browser clients receive
-- no direct table CRUD; current-actor RPCs own follow, unfollow, and state transitions.

begin;

create table public.vvip_social_follows (
    follow_id uuid primary key default gen_random_uuid(),
    follower_subject text not null default public.vvip_marketplace_actor_id(),
    followee_subject text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (follower_subject like 'user\_%' escape '\'),
    check (followee_subject like 'user\_%' escape '\'),
    check (follower_subject <> followee_subject),
    unique (follower_subject, followee_subject)
);

create index vvip_social_follows_follower_idx
    on public.vvip_social_follows (follower_subject, created_at desc);
create index vvip_social_follows_followee_idx
    on public.vvip_social_follows (followee_subject, created_at desc);

alter table public.vvip_social_follows enable row level security;
alter table public.vvip_social_follows force row level security;

revoke all privileges on table public.vvip_social_follows from public, anon, authenticated;

create policy vvip_social_follow_owner_read
on public.vvip_social_follows
for select
to authenticated
using (
    follower_subject = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_follow_owner_create
on public.vvip_social_follows
for insert
to authenticated
with check (
    follower_subject = (select public.vvip_marketplace_actor_id())
    and follower_subject <> followee_subject
);

create policy vvip_social_follow_owner_remove
on public.vvip_social_follows
for delete
to authenticated
using (
    follower_subject = (select public.vvip_marketplace_actor_id())
);

create function public.vvip_social_follow_state(p_followee_subject text)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_following boolean := false;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_followee_subject is null
       or p_followee_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_FOLLOW_TARGET_INVALID';
    end if;

    if v_actor = p_followee_subject then
        raise exception 'SOCIAL_SELF_FOLLOW_DENIED';
    end if;

    select exists (
        select 1
        from public.vvip_social_follows follow_row
        where follow_row.follower_subject = v_actor
          and follow_row.followee_subject = p_followee_subject
    ) into v_following;

    return jsonb_build_object(
        'ok', true,
        'followee_subject', p_followee_subject,
        'following', v_following
    );
end;
$function$;

create function public.vvip_social_follow_user(p_followee_subject text)
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

    if p_followee_subject is null
       or p_followee_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_FOLLOW_TARGET_INVALID';
    end if;

    if v_actor = p_followee_subject then
        raise exception 'SOCIAL_SELF_FOLLOW_DENIED';
    end if;

    insert into public.vvip_social_follows (follower_subject, followee_subject)
    values (v_actor, p_followee_subject)
    on conflict (follower_subject, followee_subject) do nothing;

    return public.vvip_social_follow_state(p_followee_subject);
end;
$function$;

create function public.vvip_social_unfollow_user(p_followee_subject text)
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

    if p_followee_subject is null
       or p_followee_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_FOLLOW_TARGET_INVALID';
    end if;

    if v_actor = p_followee_subject then
        raise exception 'SOCIAL_SELF_FOLLOW_DENIED';
    end if;

    delete from public.vvip_social_follows follow_row where follow_row.follower_subject = v_actor and follow_row.followee_subject = p_followee_subject;

    return jsonb_build_object(
        'ok', true,
        'followee_subject', p_followee_subject,
        'following', false
    );
end;
$function$;

revoke all on function public.vvip_social_follow_state(text) from public, anon, authenticated;
revoke all on function public.vvip_social_follow_user(text) from public, anon, authenticated;
revoke all on function public.vvip_social_unfollow_user(text) from public, anon, authenticated;

grant execute on function public.vvip_social_follow_state(text) to authenticated;
grant execute on function public.vvip_social_follow_user(text) to authenticated;
grant execute on function public.vvip_social_unfollow_user(text) to authenticated;

comment on table public.vvip_social_follows is
    'Directional Social Core follow state. Raw follower/followee rows are not a browser public directory.';

commit;

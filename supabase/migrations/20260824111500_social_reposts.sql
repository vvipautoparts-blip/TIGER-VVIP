-- VVIP TIGER Social Reposts 2026.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Reposts preserve original-post identity, never widen the original privacy ceiling, and expose
-- no direct browser table CRUD. The browser receives only the bounded actor-derived RPC.

begin;

create table public.vvip_social_reposts (
    repost_id uuid primary key default gen_random_uuid(),
    original_post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    repost_post_id uuid not null unique references public.vvip_social_posts (post_id) on delete cascade,
    actor_subject text not null default public.vvip_marketplace_actor_id(),
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject like 'user\_%' escape '\'),
    unique (original_post_id, actor_subject)
);

create index vvip_social_reposts_actor_idx
    on public.vvip_social_reposts (actor_subject, created_at desc);

alter table public.vvip_social_reposts enable row level security;
alter table public.vvip_social_reposts force row level security;

revoke all privileges on table public.vvip_social_reposts from public, anon, authenticated;

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

    if not public.vvip_social_can_view_post(p_original_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    select post.body, post.audience
      into v_original_body, v_original_audience
      from public.vvip_social_posts post
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

    -- Serialize the one-active-repost rule for this actor/original pair.
    perform pg_advisory_xact_lock(hashtextextended(v_actor || ':' || p_original_post_id::text, 0));

    select repost.repost_post_id
      into v_existing_repost_post_id
      from public.vvip_social_reposts repost
     where repost.original_post_id = p_original_post_id
       and repost.actor_subject = v_actor
     limit 1;

    if v_existing_repost_post_id is not null then
        return jsonb_build_object(
            'ok', true,
            'created', false,
            'original_post_id', p_original_post_id,
            'repost_post_id', v_existing_repost_post_id,
            'audience', p_audience
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
    'Private server-owned repost lineage. One active repost per actor/original pair; no public actor directory.';
comment on function public.vvip_social_repost_post(uuid, text) is
    'Creates or returns the actor existing repost without widening original audience privacy.';

commit;

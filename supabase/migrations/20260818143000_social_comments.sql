-- VVIP TIGER Social Comments and Replies 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Browser clients receive no direct table privilege; bounded RPCs expose visible-list,
-- create, owner-update, and owner-remove behavior with one reply level.

begin;

create table public.vvip_social_comments (
    comment_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    parent_comment_id uuid references public.vvip_social_comments (comment_id) on delete cascade,
    author_subject text not null check (author_subject like 'user\_%' escape '\'),
    body text not null check (char_length(btrim(body)) between 1 and 2000),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (parent_comment_id is null or parent_comment_id <> comment_id)
);

create index vvip_social_comments_post_idx
    on public.vvip_social_comments (post_id, created_at, comment_id);
create index vvip_social_comments_parent_idx
    on public.vvip_social_comments (parent_comment_id, created_at, comment_id);
create index vvip_social_comments_author_idx
    on public.vvip_social_comments (author_subject, updated_at desc);

alter table public.vvip_social_comments enable row level security;
alter table public.vvip_social_comments force row level security;

revoke all privileges on table public.vvip_social_comments from public, anon, authenticated;

create function public.vvip_social_comment_list(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_items jsonb := '[]'::jsonb;
    v_total integer := 0;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_post_id is null then
        raise exception 'SOCIAL_COMMENT_POST_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_COMMENT_POST_NOT_VISIBLE';
    end if;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'comment_id', comment.comment_id,
                    'post_id', comment.post_id,
                    'parent_comment_id', comment.parent_comment_id,
                    'body', comment.body,
                    'created_at', comment.created_at,
                    'updated_at', comment.updated_at,
                    'viewer_can_edit', comment.author_subject = v_actor
                )
                order by
                    coalesce(parent.created_at, comment.created_at),
                    case when comment.parent_comment_id is null then 0 else 1 end,
                    comment.created_at,
                    comment.comment_id
            ),
            '[]'::jsonb
        ),
        count(*)::integer
    into v_items, v_total
    from public.vvip_social_comments comment
    left join public.vvip_social_comments parent
      on parent.comment_id = comment.parent_comment_id
    where comment.post_id = p_post_id;

    return jsonb_build_object(
        'ok', true,
        'post_id', p_post_id,
        'total', v_total,
        'items', v_items
    );
end;
$function$;

create function public.vvip_social_comment_create(p_post_id uuid, p_body text, p_parent_comment_id uuid default null)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    parent public.vvip_social_comments%rowtype;
    target public.vvip_social_comments%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_post_id is null then
        raise exception 'SOCIAL_COMMENT_POST_REQUIRED';
    end if;

    if p_body is null or not (char_length(btrim(p_body)) between 1 and 2000) then
        raise exception 'SOCIAL_COMMENT_BODY_INVALID';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_COMMENT_POST_NOT_VISIBLE';
    end if;

    if p_parent_comment_id is null then
        null;
    else
        select comment.*
        into parent
        from public.vvip_social_comments comment
        where comment.comment_id = p_parent_comment_id;

        if not found then
            raise exception 'SOCIAL_COMMENT_PARENT_NOT_FOUND';
        end if;

        if parent.post_id <> p_post_id then
            raise exception 'SOCIAL_COMMENT_PARENT_POST_MISMATCH';
        end if;

        if parent.parent_comment_id is null then
            null;
        else
            raise exception 'SOCIAL_COMMENT_REPLY_DEPTH_DENIED';
        end if;
    end if;

    insert into public.vvip_social_comments (
        post_id,
        parent_comment_id,
        author_subject,
        body
    ) values (
        p_post_id,
        p_parent_comment_id,
        v_actor,
        btrim(p_body)
    )
    returning * into target;

    return jsonb_build_object(
        'ok', true,
        'item', jsonb_build_object(
            'comment_id', target.comment_id,
            'post_id', target.post_id,
            'parent_comment_id', target.parent_comment_id,
            'body', target.body,
            'created_at', target.created_at,
            'updated_at', target.updated_at,
            'viewer_can_edit', true
        )
    );
end;
$function$;

create function public.vvip_social_comment_update(p_comment_id uuid, p_body text)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    target public.vvip_social_comments%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_comment_id is null then
        raise exception 'SOCIAL_COMMENT_NOT_FOUND';
    end if;

    if p_body is null or not (char_length(btrim(p_body)) between 1 and 2000) then
        raise exception 'SOCIAL_COMMENT_BODY_INVALID';
    end if;

    select comment.*
    into target
    from public.vvip_social_comments comment
    where comment.comment_id = p_comment_id;

    if not found then
        raise exception 'SOCIAL_COMMENT_NOT_FOUND';
    end if;

    if target.author_subject <> v_actor then
        raise exception 'SOCIAL_COMMENT_OWNER_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(target.post_id, v_actor) then
        raise exception 'SOCIAL_COMMENT_POST_NOT_VISIBLE';
    end if;

    update public.vvip_social_comments comment set body = btrim(p_body), updated_at = statement_timestamp() where comment.comment_id = p_comment_id
      and comment.author_subject = v_actor
    returning * into target;

    return jsonb_build_object(
        'ok', true,
        'item', jsonb_build_object(
            'comment_id', target.comment_id,
            'post_id', target.post_id,
            'parent_comment_id', target.parent_comment_id,
            'body', target.body,
            'created_at', target.created_at,
            'updated_at', target.updated_at,
            'viewer_can_edit', true
        )
    );
end;
$function$;

create function public.vvip_social_comment_remove(p_comment_id uuid)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    target public.vvip_social_comments%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_comment_id is null then
        raise exception 'SOCIAL_COMMENT_NOT_FOUND';
    end if;

    select comment.*
    into target
    from public.vvip_social_comments comment
    where comment.comment_id = p_comment_id;

    if not found then
        raise exception 'SOCIAL_COMMENT_NOT_FOUND';
    end if;

    if target.author_subject <> v_actor then
        raise exception 'SOCIAL_COMMENT_OWNER_REQUIRED';
    end if;

    delete from public.vvip_social_comments comment where comment.comment_id = p_comment_id
      and comment.author_subject = v_actor;

    return jsonb_build_object(
        'ok', true,
        'comment_id', target.comment_id,
        'post_id', target.post_id
    );
end;
$function$;

revoke all on function public.vvip_social_comment_list(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_comment_create(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_comment_update(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_comment_remove(uuid) from public, anon, authenticated;

grant execute on function public.vvip_social_comment_list(uuid) to authenticated;
grant execute on function public.vvip_social_comment_create(uuid, text, uuid) to authenticated;
grant execute on function public.vvip_social_comment_update(uuid, text) to authenticated;
grant execute on function public.vvip_social_comment_remove(uuid) to authenticated;

commit;

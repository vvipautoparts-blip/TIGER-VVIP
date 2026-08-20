begin;

create index if not exists vvip_social_posts_feed_keyset_idx
    on public.vvip_social_posts (created_at desc, post_id desc);

create or replace function public.vvip_gate5_cursor_encode(p_payload jsonb)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $function$
    select replace(
        replace(
            replace(
                replace(encode(convert_to(p_payload::text, 'UTF8'), 'base64'), E'\n', ''),
                '=',
                ''
            ),
            '+',
            '-'
        ),
        '/',
        '_'
    );
$function$;

create or replace function public.vvip_gate5_cursor_decode(p_cursor text)
returns jsonb
language plpgsql
immutable
strict
set search_path = pg_catalog
as $function$
declare
    v_encoded text;
begin
    if length(p_cursor) > 2048 or p_cursor !~ '^[A-Za-z0-9_-]+$' then
        raise exception 'GATE5_CURSOR_INVALID';
    end if;

    v_encoded := translate(p_cursor, '-_', '+/');
    v_encoded := v_encoded || repeat('=', (4 - length(v_encoded) % 4) % 4);
    return convert_from(decode(v_encoded, 'base64'), 'UTF8')::jsonb;
exception
    when others then
        raise exception 'GATE5_CURSOR_INVALID';
end;
$function$;

create or replace function public.vvip_social_feed_read_keyset(
    p_cursor text default null,
    p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
    v_cursor jsonb;
    v_cursor_actor text;
    v_after_created_at timestamptz;
    v_after_post_id uuid;
    v_last_created_at timestamptz;
    v_last_post_id uuid;
    v_items jsonb := '[]'::jsonb;
    v_next_cursor text;
    v_post public.vvip_social_posts%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_cursor is distinct from null then
        v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
        v_cursor_actor := v_cursor ->> 'actor';
        if (v_cursor ->> 'v')::integer <> 1
           or v_cursor ->> 'kind' <> 'social_feed'
           or v_cursor_actor is null then
            raise exception 'GATE5_CURSOR_INVALID';
        end if;
        if v_cursor_actor <> v_actor then
            raise exception 'GATE5_CURSOR_CONTEXT_MISMATCH';
        end if;
        begin
            v_after_created_at := (v_cursor ->> 'created_at')::timestamptz;
            v_after_post_id := (v_cursor ->> 'id')::uuid;
        exception
            when others then
                raise exception 'GATE5_CURSOR_INVALID';
        end;
    end if;

    for v_post in
        select post.*
        from public.vvip_social_posts post
        where public.vvip_social_can_view_post(post.post_id, v_actor)
          and (
              post.author_subject = v_actor
              or not exists (
                  select 1
                  from public.vvip_social_mutes mute_row
                  where mute_row.muter_subject = v_actor
                    and mute_row.muted_subject = post.author_subject
              )
          )
          and (
              v_after_created_at is null
              or (post.created_at, post.post_id) < (v_after_created_at, v_after_post_id)
          )
        order by post.created_at desc, post.post_id desc
        limit v_limit
    loop
        v_items := v_items || jsonb_build_array(to_jsonb(v_post));
        v_last_created_at := v_post.created_at;
        v_last_post_id := v_post.post_id;
    end loop;

    if v_last_post_id is distinct from null and exists (
        select 1
        from public.vvip_social_posts post
        where public.vvip_social_can_view_post(post.post_id, v_actor)
          and (
              post.author_subject = v_actor
              or not exists (
                  select 1
                  from public.vvip_social_mutes mute_row
                  where mute_row.muter_subject = v_actor
                    and mute_row.muted_subject = post.author_subject
              )
          )
          and (post.created_at, post.post_id) < (v_last_created_at, v_last_post_id)
    ) then
        v_next_cursor := public.vvip_gate5_cursor_encode(jsonb_build_object(
            'v', 1,
            'kind', 'social_feed',
            'actor', v_actor,
            'created_at', v_last_created_at,
            'id', v_last_post_id
        ));
    end if;

    return jsonb_build_object(
        'items', v_items,
        'next_cursor', v_next_cursor
    );
end;
$function$;

revoke all on function public.vvip_gate5_cursor_encode(jsonb)
    from public, anon, authenticated;
revoke all on function public.vvip_gate5_cursor_decode(text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_feed_read_keyset(text, integer)
    from public, anon, authenticated;

grant execute on function public.vvip_social_feed_read_keyset(text, integer)
    to authenticated;

comment on function public.vvip_social_feed_read_keyset(text, integer) is
    'Gate 5 actor-bound opaque keyset feed. PostgreSQL remains durable visibility authority.';

commit;

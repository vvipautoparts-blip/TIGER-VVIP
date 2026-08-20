begin;

create index if not exists vvip_social_relationships_keyset_idx
    on public.vvip_social_relationships (updated_at desc, relationship_id desc);

create or replace function public.vvip_social_comment_list_keyset(
    p_post_id uuid,
    p_cursor text default null,
    p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_cursor jsonb;
    v_cursor_actor text;
    v_cursor_post_id uuid;
    v_after_created_at timestamptz;
    v_after_comment_id uuid;
    v_last_created_at timestamptz;
    v_last_comment_id uuid;
    v_items jsonb := '[]'::jsonb;
    v_next_cursor text;
    v_comment public.vvip_social_comments%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_post_id is null or not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_COMMENT_POST_NOT_VISIBLE';
    end if;

    if p_cursor is distinct from null then
        v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
        v_cursor_actor := v_cursor ->> 'actor';
        begin
            v_cursor_post_id := (v_cursor ->> 'post_id')::uuid;
            v_after_created_at := (v_cursor ->> 'created_at')::timestamptz;
            v_after_comment_id := (v_cursor ->> 'id')::uuid;
        exception
            when others then
                raise exception 'GATE5_CURSOR_INVALID';
        end;
        if (v_cursor ->> 'v')::integer <> 1
           or v_cursor ->> 'kind' <> 'social_comments'
           or v_cursor_actor is null then
            raise exception 'GATE5_CURSOR_INVALID';
        end if;
        if v_cursor_actor <> v_actor or v_cursor_post_id <> p_post_id then
            raise exception 'GATE5_CURSOR_CONTEXT_MISMATCH';
        end if;
    end if;

    for v_comment in
        select comment.*
        from public.vvip_social_comments comment
        where comment.post_id = p_post_id
          and (
              v_after_created_at is null
              or (comment.created_at, comment.comment_id) > (v_after_created_at, v_after_comment_id)
          )
        order by comment.created_at, comment.comment_id
        limit v_limit
    loop
        v_items := v_items || jsonb_build_array(jsonb_build_object(
            'comment_id', v_comment.comment_id,
            'post_id', v_comment.post_id,
            'parent_comment_id', v_comment.parent_comment_id,
            'body', v_comment.body,
            'created_at', v_comment.created_at,
            'updated_at', v_comment.updated_at,
            'viewer_can_edit', v_comment.author_subject = v_actor
        ));
        v_last_created_at := v_comment.created_at;
        v_last_comment_id := v_comment.comment_id;
    end loop;

    if v_last_comment_id is distinct from null and exists (
        select 1
        from public.vvip_social_comments comment
        where comment.post_id = p_post_id
          and (comment.created_at, comment.comment_id) > (v_last_created_at, v_last_comment_id)
    ) then
        v_next_cursor := public.vvip_gate5_cursor_encode(jsonb_build_object(
            'v', 1,
            'kind', 'social_comments',
            'actor', v_actor,
            'post_id', p_post_id,
            'created_at', v_last_created_at,
            'id', v_last_comment_id
        ));
    end if;

    return jsonb_build_object(
        'ok', true,
        'post_id', p_post_id,
        'total', jsonb_array_length(v_items),
        'items', v_items,
        'next_cursor', v_next_cursor
    );
end;
$function$;

create or replace function public.vvip_social_relationship_read_keyset(
    p_cursor text default null,
    p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_cursor jsonb;
    v_cursor_actor text;
    v_after_updated_at timestamptz;
    v_after_relationship_id uuid;
    v_last_updated_at timestamptz;
    v_last_relationship_id uuid;
    v_items jsonb := '[]'::jsonb;
    v_next_cursor text;
    v_relationship public.vvip_social_relationships%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if p_cursor is distinct from null then
        v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
        v_cursor_actor := v_cursor ->> 'actor';
        begin
            v_after_updated_at := (v_cursor ->> 'updated_at')::timestamptz;
            v_after_relationship_id := (v_cursor ->> 'id')::uuid;
        exception
            when others then
                raise exception 'GATE5_CURSOR_INVALID';
        end;
        if (v_cursor ->> 'v')::integer <> 1
           or v_cursor ->> 'kind' <> 'social_relationships'
           or v_cursor_actor is null then
            raise exception 'GATE5_CURSOR_INVALID';
        end if;
        if v_cursor_actor <> v_actor then
            raise exception 'GATE5_CURSOR_CONTEXT_MISMATCH';
        end if;
    end if;

    for v_relationship in
        select relationship.*
        from public.vvip_social_relationships relationship
        where v_actor in (relationship.requester_subject, relationship.addressee_subject)
          and (
              v_after_updated_at is null
              or (relationship.updated_at, relationship.relationship_id) < (v_after_updated_at, v_after_relationship_id)
          )
        order by relationship.updated_at desc, relationship.relationship_id desc
        limit v_limit
    loop
        v_items := v_items || jsonb_build_array(to_jsonb(v_relationship));
        v_last_updated_at := v_relationship.updated_at;
        v_last_relationship_id := v_relationship.relationship_id;
    end loop;

    if v_last_relationship_id is distinct from null and exists (
        select 1
        from public.vvip_social_relationships relationship
        where v_actor in (relationship.requester_subject, relationship.addressee_subject)
          and (relationship.updated_at, relationship.relationship_id) < (v_last_updated_at, v_last_relationship_id)
    ) then
        v_next_cursor := public.vvip_gate5_cursor_encode(jsonb_build_object(
            'v', 1,
            'kind', 'social_relationships',
            'actor', v_actor,
            'updated_at', v_last_updated_at,
            'id', v_last_relationship_id
        ));
    end if;

    return jsonb_build_object('items', v_items, 'next_cursor', v_next_cursor);
end;
$function$;

revoke all on function public.vvip_social_comment_list_keyset(uuid, text, integer)
    from public, anon, authenticated;
revoke all on function public.vvip_social_relationship_read_keyset(text, integer)
    from public, anon, authenticated;

grant execute on function public.vvip_social_comment_list_keyset(uuid, text, integer)
    to authenticated;
grant execute on function public.vvip_social_relationship_read_keyset(text, integer)
    to authenticated;

commit;
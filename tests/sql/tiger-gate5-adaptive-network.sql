\set ON_ERROR_STOP on

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience, created_at)
values
    ('gate5-feed-1', 'public', '2026-08-20 10:00:00+00'),
    ('gate5-feed-2', 'public', '2026-08-20 10:01:00+00'),
    ('gate5-feed-3', 'public', '2026-08-20 10:02:00+00');

select set_config(
    'tiger.gate5.feed.first',
    public.vvip_social_feed_read_keyset(null, 2)::text,
    true
);
select set_config(
    'tiger.gate5.feed.cursor',
    current_setting('tiger.gate5.feed.first')::jsonb ->> 'next_cursor',
    true
);
select set_config(
    'tiger.gate5.feed.second',
    public.vvip_social_feed_read_keyset(current_setting('tiger.gate5.feed.cursor'), 2)::text,
    true
);

select (
    jsonb_array_length(current_setting('tiger.gate5.feed.first')::jsonb -> 'items') = 2
    and jsonb_array_length(current_setting('tiger.gate5.feed.second')::jsonb -> 'items') = 1
    and not exists (
        select 1
        from jsonb_array_elements(current_setting('tiger.gate5.feed.first')::jsonb -> 'items') first_page
        join jsonb_array_elements(current_setting('tiger.gate5.feed.second')::jsonb -> 'items') second_page
          on first_page ->> 'post_id' = second_page ->> 'post_id'
    )
) as feed_keyset_exact
\gset
\if :feed_keyset_exact
  \echo FEED_KEYSET=PASS
\else
  \echo FEED_KEYSET=FAIL
  \quit 1
\endif

select set_config(
    'tiger.gate5.post_id',
    (select post_id::text from public.vvip_social_posts where body = 'gate5-feed-1'),
    true
);
select set_config(
    'tiger.gate5.comment.parent',
    public.vvip_social_comment_create(
        current_setting('tiger.gate5.post_id')::uuid,
        'gate5-parent',
        null
    ) #>> '{item,comment_id}',
    true
);
select public.vvip_social_comment_create(
    current_setting('tiger.gate5.post_id')::uuid,
    'gate5-reply',
    current_setting('tiger.gate5.comment.parent')::uuid
);
select public.vvip_social_comment_create(
    current_setting('tiger.gate5.post_id')::uuid,
    'gate5-third',
    null
);

select set_config(
    'tiger.gate5.comments.first',
    public.vvip_social_comment_list_keyset(
        current_setting('tiger.gate5.post_id')::uuid,
        null,
        2
    )::text,
    true
);
select set_config(
    'tiger.gate5.comments.second',
    public.vvip_social_comment_list_keyset(
        current_setting('tiger.gate5.post_id')::uuid,
        current_setting('tiger.gate5.comments.first')::jsonb ->> 'next_cursor',
        2
    )::text,
    true
);

select (
    jsonb_array_length(current_setting('tiger.gate5.comments.first')::jsonb -> 'items') = 2
    and jsonb_array_length(current_setting('tiger.gate5.comments.second')::jsonb -> 'items') = 1
    and (current_setting('tiger.gate5.comments.first')::jsonb #>> '{items,0,parent_comment_id}') is null
    and (current_setting('tiger.gate5.comments.first')::jsonb #>> '{items,1,parent_comment_id}')
        = current_setting('tiger.gate5.comment.parent')
) as comment_parent_before_reply
\gset
\if :comment_parent_before_reply
  \echo COMMENT_KEYSET=PASS
\else
  \echo COMMENT_KEYSET=FAIL
  \quit 1
\endif

insert into public.vvip_social_relationships (addressee_subject, created_at, updated_at)
values
    ('user_bob', '2026-08-20 11:00:00+00', '2026-08-20 11:00:00+00'),
    ('user_charlie', '2026-08-20 11:01:00+00', '2026-08-20 11:01:00+00'),
    ('user_dana', '2026-08-20 11:02:00+00', '2026-08-20 11:02:00+00');

select set_config(
    'tiger.gate5.relationships.first',
    public.vvip_social_relationship_read_keyset(null, 2)::text,
    true
);
select set_config(
    'tiger.gate5.relationships.second',
    public.vvip_social_relationship_read_keyset(
        current_setting('tiger.gate5.relationships.first')::jsonb ->> 'next_cursor',
        2
    )::text,
    true
);

select (
    jsonb_array_length(current_setting('tiger.gate5.relationships.first')::jsonb -> 'items') = 2
    and jsonb_array_length(current_setting('tiger.gate5.relationships.second')::jsonb -> 'items') = 1
) as relationship_keyset_exact
\gset
\if :relationship_keyset_exact
  \echo RELATIONSHIP_KEYSET=PASS
\else
  \echo RELATIONSHIP_KEYSET=FAIL
  \quit 1
\endif

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
do $context_mismatch$
declare
    v_denied integer := 0;
begin
    begin
        perform public.vvip_social_feed_read_keyset(current_setting('tiger.gate5.feed.cursor'), 2);
    exception
        when raise_exception then
            if sqlerrm = 'GATE5_CURSOR_CONTEXT_MISMATCH' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    begin
        perform public.vvip_social_comment_list_keyset(
            current_setting('tiger.gate5.post_id')::uuid,
            current_setting('tiger.gate5.comments.first')::jsonb ->> 'next_cursor',
            2
        );
    exception
        when raise_exception then
            if sqlerrm = 'GATE5_CURSOR_CONTEXT_MISMATCH' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    if v_denied <> 2 then
        raise exception 'GATE5_CURSOR_CONTEXT_NOT_ENFORCED:%', v_denied;
    end if;
end;
$context_mismatch$;
\echo CURSOR_CONTEXT_BINDING=PASS
reset role;

rollback;

\echo TIGER_GATE5_DB_REHEARSAL=PASS
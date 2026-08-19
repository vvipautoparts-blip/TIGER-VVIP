\set ON_ERROR_STOP on

begin;

-- Alice creates public/friends/only-me posts and establishes friendship with Bob.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values
  ('privacy-public-proof', 'public'),
  ('privacy-friends-proof', 'friends'),
  ('privacy-only-me-proof', 'only_me');

select set_config('tiger.privacy_public_post_id', post_id::text, true)
from public.vvip_social_posts
where author_subject = 'user_alice'
  and body = 'privacy-public-proof';

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending';

select (count(*) = 2) as bob_sees_public_and_friend_before_block
from public.vvip_social_posts
where author_subject = 'user_alice'
\gset
\if :bob_sees_public_and_friend_before_block
  \echo BOB_PRE_BLOCK_VISIBILITY=PASS
\else
  \echo BOB_PRE_BLOCK_VISIBILITY=FAIL
  \quit 1
\endif

select (count(*) = 0) as bob_never_sees_only_me
from public.vvip_social_posts
where body = 'privacy-only-me-proof'
\gset
\if :bob_never_sees_only_me
  \echo ONLY_ME_PRIVACY_PRESERVED=PASS
\else
  \echo ONLY_ME_PRIVACY_PRESERVED=FAIL
  \quit 1
\endif

reset role;

-- Alice blocks Bob. The existing friendship must be severed atomically.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_social_block_user('user_bob');

select (count(*) = 0) as friendship_severed_on_block
from public.vvip_social_relationships
where subject_low = least('user_alice', 'user_bob')
  and subject_high = greatest('user_alice', 'user_bob')
\gset
\if :friendship_severed_on_block
  \echo BLOCK_SEVERS_FRIENDSHIP=PASS
\else
  \echo BLOCK_SEVERS_FRIENDSHIP=FAIL
  \quit 1
\endif

reset role;

-- Block is symmetric for visibility and interaction even though Alice initiated it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

select (count(*) = 0) as blocked_bob_sees_no_alice_posts
from public.vvip_social_posts
where author_subject = 'user_alice'
\gset
\if :blocked_bob_sees_no_alice_posts
  \echo BLOCK_HIDES_ALL_CROSS_PARTY_POSTS=PASS
\else
  \echo BLOCK_HIDES_ALL_CROSS_PARTY_POSTS=FAIL
  \quit 1
\endif

do $block_relationship$
declare
    v_denied boolean := false;
begin
    begin
        insert into public.vvip_social_relationships (addressee_subject)
        values ('user_alice');
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_BLOCK_ACTIVE' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'BLOCKED_RELATIONSHIP_WRITE_WAS_NOT_DENIED';
    end if;
end;
$block_relationship$;

do $block_reaction$
declare
    v_denied boolean := false;
    v_post_id uuid := current_setting('tiger.privacy_public_post_id')::uuid;
begin
    begin
        perform public.vvip_social_set_reaction(v_post_id, 'like');
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_POST_NOT_VISIBLE' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'BLOCKED_REACTION_WAS_NOT_DENIED';
    end if;
end;
$block_reaction$;

do $block_comment$
declare
    v_denied boolean := false;
    v_post_id uuid := current_setting('tiger.privacy_public_post_id')::uuid;
begin
    begin
        perform public.vvip_social_comment_create(
            v_post_id,
            'blocked-comment-proof',
            null
        );
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_COMMENT_POST_NOT_VISIBLE' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'BLOCKED_COMMENT_WAS_NOT_DENIED';
    end if;
end;
$block_comment$;

reset role;

-- Unblocking restores public visibility only; it never resurrects friendship state.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_social_unblock_user('user_bob');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

select (count(*) = 1) as unblock_does_not_restore_friendship
from public.vvip_social_posts
where author_subject = 'user_alice'
\gset
\if :unblock_does_not_restore_friendship
  \echo UNBLOCK_NO_FRIENDSHIP_RESURRECTION=PASS
\else
  \echo UNBLOCK_NO_FRIENDSHIP_RESURRECTION=FAIL
  \quit 1
\endif

reset role;

-- Re-establish friendship, then prove mute suppresses feed only and is not an ACL.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending';

select public.vvip_social_mute_user('user_alice');

select (count(*) = 0) as muted_alice_absent_from_feed_rpc
from public.vvip_social_feed_read(100) post
where post.author_subject = 'user_alice'
\gset
\if :muted_alice_absent_from_feed_rpc
  \echo MUTE_SUPPRESSES_FEED=PASS
\else
  \echo MUTE_SUPPRESSES_FEED=FAIL
  \quit 1
\endif

select (count(*) = 2) as mute_does_not_change_direct_visibility
from public.vvip_social_posts
where author_subject = 'user_alice'
\gset
\if :mute_does_not_change_direct_visibility
  \echo MUTE_IS_NOT_AUTHORIZATION_BOUNDARY=PASS
\else
  \echo MUTE_IS_NOT_AUTHORIZATION_BOUNDARY=FAIL
  \quit 1
\endif

select public.vvip_social_unmute_user('user_alice');

-- Report is accepted only through the bounded RPC; report rows are not browser-readable.
select public.vvip_social_report_user(
    'user_alice',
    'spam',
    'privacy-rehearsal-report'
);

do $report_read_denied$
declare
    v_denied boolean := false;
begin
    begin
        perform 1 from public.vvip_social_reports limit 1;
    exception
        when insufficient_privilege then
            v_denied := true;
    end;
    if not v_denied then
        raise exception 'REPORT_TABLE_READ_WAS_NOT_DENIED';
    end if;
end;
$report_read_denied$;

reset role;

rollback;
\echo TIGER_SOCIAL_PRIVACY_PROOF=PASS

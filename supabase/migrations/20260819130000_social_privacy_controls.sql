-- VVIP TIGER Social Privacy Proof 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Block is a two-way authorization boundary; mute is feed-only; reports are browser write-only.

begin;

create table if not exists public.vvip_social_blocks (
    block_id uuid primary key default gen_random_uuid(),
    blocker_subject text not null,
    blocked_subject text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (blocker_subject like 'user\_%' escape '\'),
    check (blocked_subject like 'user\_%' escape '\'),
    check (blocker_subject <> blocked_subject),
    unique (blocker_subject, blocked_subject)
);

create index if not exists vvip_social_blocks_blocker_idx
    on public.vvip_social_blocks (blocker_subject, created_at desc);
create index if not exists vvip_social_blocks_blocked_idx
    on public.vvip_social_blocks (blocked_subject, created_at desc);

create table if not exists public.vvip_social_mutes (
    mute_id uuid primary key default gen_random_uuid(),
    muter_subject text not null,
    muted_subject text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (muter_subject like 'user\_%' escape '\'),
    check (muted_subject like 'user\_%' escape '\'),
    check (muter_subject <> muted_subject),
    unique (muter_subject, muted_subject)
);

create index if not exists vvip_social_mutes_muter_idx
    on public.vvip_social_mutes (muter_subject, created_at desc);

create table if not exists public.vvip_social_reports (
    report_id uuid primary key default gen_random_uuid(),
    reporter_subject text not null,
    target_subject text not null,
    reason_code text not null
        check (reason_code in (
            'spam',
            'harassment',
            'impersonation',
            'scam',
            'hate',
            'sexual_content',
            'violence',
            'other'
        )),
    details text,
    report_state text not null default 'open'
        check (report_state in ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (reporter_subject like 'user\_%' escape '\'),
    check (target_subject like 'user\_%' escape '\'),
    check (reporter_subject <> target_subject),
    check (details is null or length(details) <= 2000)
);

create index if not exists vvip_social_reports_target_open_idx
    on public.vvip_social_reports (target_subject, report_state, created_at desc);
create index if not exists vvip_social_reports_reporter_idx
    on public.vvip_social_reports (reporter_subject, created_at desc);

alter table public.vvip_social_blocks enable row level security;
alter table public.vvip_social_blocks force row level security;
alter table public.vvip_social_mutes enable row level security;
alter table public.vvip_social_mutes force row level security;
alter table public.vvip_social_reports enable row level security;
alter table public.vvip_social_reports force row level security;

revoke all on table public.vvip_social_blocks from public, anon, authenticated;
revoke all on table public.vvip_social_mutes from public, anon, authenticated;
revoke all on table public.vvip_social_reports from public, anon, authenticated;

create or replace function public.vvip_social_is_blocked_pair(
    p_left text,
    p_right text
)
returns boolean
language sql
stable
security definer set search_path = pg_catalog, public
as $function$
    select
        p_left is not null
        and p_right is not null
        and exists (
            select 1
            from public.vvip_social_blocks block_row
            where (
                block_row.blocker_subject = p_left
                and block_row.blocked_subject = p_right
            ) or (
                block_row.blocker_subject = p_right
                and block_row.blocked_subject = p_left
            )
        );
$function$;

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
        p_actor is not null
        and p_actor like 'user\_%' escape '\'
        and exists (
            select 1
            from public.vvip_social_posts post
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
                                    from public.vvip_social_relationships relationship
                                    where relationship.relationship_state = 'friends'
                                      and relationship.subject_low = least(post.author_subject, p_actor)
                                      and relationship.subject_high = greatest(post.author_subject, p_actor)
                                )
                            )
                        )
                    )
              )
        );
$function$;

create or replace function public.vvip_social_guard_relationship_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is null and current_user in ('anon', 'authenticated') then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if TG_OP = 'INSERT' then
        if public.vvip_social_is_blocked_pair(NEW.requester_subject, NEW.addressee_subject) then
            raise exception 'SOCIAL_BLOCK_ACTIVE';
        end if;
        if current_user in ('anon', 'authenticated') then
            if NEW.requester_subject <> actor then
                raise exception 'SOCIAL_REQUESTER_REQUIRED';
            end if;
            if NEW.requester_subject = NEW.addressee_subject then
                raise exception 'SOCIAL_SELF_RELATIONSHIP_DENIED';
            end if;
            if NEW.relationship_state <> 'pending' then
                raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
            end if;
        end if;
        NEW.updated_at := statement_timestamp();
        return NEW;
    end if;

    if TG_OP = 'UPDATE' then
        if NEW.requester_subject <> OLD.requester_subject
           or NEW.addressee_subject <> OLD.addressee_subject then
            raise exception 'SOCIAL_RELATIONSHIP_SCOPE_IMMUTABLE';
        end if;
        if public.vvip_social_is_blocked_pair(NEW.requester_subject, NEW.addressee_subject) then
            raise exception 'SOCIAL_BLOCK_ACTIVE';
        end if;
        if current_user in ('anon', 'authenticated') then
            if actor <> OLD.addressee_subject then
                raise exception 'SOCIAL_RECIPIENT_ACCEPTANCE_REQUIRED';
            end if;
            if OLD.relationship_state <> 'pending'
               or NEW.relationship_state <> 'friends' then
                raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
            end if;
        end if;
        NEW.updated_at := statement_timestamp();
        return NEW;
    end if;

    if TG_OP = 'DELETE' then
        if current_user in ('anon', 'authenticated')
           and actor not in (OLD.requester_subject, OLD.addressee_subject) then
            raise exception 'SOCIAL_RELATIONSHIP_PARTICIPANT_REQUIRED';
        end if;
        return OLD;
    end if;

    raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
end;
$function$;

create or replace function public.vvip_social_can_view_post_current(
    p_post_id uuid
)
returns boolean
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        return false;
    end if;
    return public.vvip_social_can_view_post(p_post_id, v_actor);
end;
$function$;

alter policy vvip_social_post_visible_read
on public.vvip_social_posts
using (public.vvip_social_can_view_post_current(post_id));

create or replace function public.vvip_social_block_user(
    p_target_subject text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_target_subject is null or p_target_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_TARGET_INVALID';
    end if;
    if p_target_subject = v_actor then
        raise exception 'SOCIAL_SELF_BLOCK_DENIED';
    end if;

    insert into public.vvip_social_blocks (blocker_subject, blocked_subject)
    values (v_actor, p_target_subject)
    on conflict (blocker_subject, blocked_subject) do nothing;

    delete from public.vvip_social_relationships relationship where relationship.subject_low = least(v_actor, p_target_subject)
      and relationship.subject_high = greatest(v_actor, p_target_subject);

    delete from public.vvip_social_mutes mute_row where mute_row.muter_subject = v_actor
      and mute_row.muted_subject = p_target_subject;

    return jsonb_build_object(
        'ok', true,
        'blocked', true,
        'target_subject', p_target_subject
    );
end;
$function$;

create or replace function public.vvip_social_unblock_user(
    p_target_subject text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_target_subject is null or p_target_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_TARGET_INVALID';
    end if;
    if p_target_subject = v_actor then
        raise exception 'SOCIAL_SELF_BLOCK_DENIED';
    end if;

    delete from public.vvip_social_blocks block_row where block_row.blocker_subject = v_actor
      and block_row.blocked_subject = p_target_subject;

    return jsonb_build_object(
        'ok', true,
        'blocked', false,
        'target_subject', p_target_subject
    );
end;
$function$;

create or replace function public.vvip_social_mute_user(
    p_target_subject text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_target_subject is null or p_target_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_TARGET_INVALID';
    end if;
    if p_target_subject = v_actor then
        raise exception 'SOCIAL_SELF_MUTE_DENIED';
    end if;
    if public.vvip_social_is_blocked_pair(v_actor, p_target_subject) then
        raise exception 'SOCIAL_BLOCK_ACTIVE';
    end if;

    insert into public.vvip_social_mutes (muter_subject, muted_subject)
    values (v_actor, p_target_subject)
    on conflict (muter_subject, muted_subject) do nothing;

    return jsonb_build_object(
        'ok', true,
        'muted', true,
        'target_subject', p_target_subject
    );
end;
$function$;

create or replace function public.vvip_social_unmute_user(
    p_target_subject text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_target_subject is null or p_target_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_TARGET_INVALID';
    end if;
    if p_target_subject = v_actor then
        raise exception 'SOCIAL_SELF_MUTE_DENIED';
    end if;

    delete from public.vvip_social_mutes mute_row where mute_row.muter_subject = v_actor
      and mute_row.muted_subject = p_target_subject;

    return jsonb_build_object(
        'ok', true,
        'muted', false,
        'target_subject', p_target_subject
    );
end;
$function$;

create or replace function public.vvip_social_report_user(
    p_target_subject text,
    p_reason_code text,
    p_details text default null
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_report_id uuid;
    v_details text := nullif(btrim(coalesce(p_details, '')), '');
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_target_subject is null or p_target_subject not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_TARGET_INVALID';
    end if;
    if p_target_subject = v_actor then
        raise exception 'SOCIAL_SELF_REPORT_DENIED';
    end if;
    if p_reason_code not in (
        'spam',
        'harassment',
        'impersonation',
        'scam',
        'hate',
        'sexual_content',
        'violence',
        'other'
    ) then
        raise exception 'SOCIAL_REPORT_REASON_INVALID';
    end if;
    if v_details is not null and length(v_details) > 2000 then
        raise exception 'SOCIAL_REPORT_DETAILS_TOO_LONG';
    end if;

    insert into public.vvip_social_reports (
        reporter_subject,
        target_subject,
        reason_code,
        details
    ) values (
        v_actor,
        p_target_subject,
        p_reason_code,
        v_details
    )
    returning report_id into v_report_id;

    return jsonb_build_object(
        'ok', true,
        'accepted', true,
        'report_id', v_report_id
    );
end;
$function$;

create or replace function public.vvip_social_feed_read(
    p_limit integer default 20
)
returns setof public.vvip_social_posts
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    return query
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
    order by post.created_at desc, post.post_id desc
    limit v_limit;
end;
$function$;

revoke all on function public.vvip_social_is_blocked_pair(text, text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_can_view_post(uuid, text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_can_view_post_current(uuid)
    from public, anon, authenticated;
revoke all on function public.vvip_social_block_user(text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_unblock_user(text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_mute_user(text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_unmute_user(text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_report_user(text, text, text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_feed_read(integer)
    from public, anon, authenticated;

revoke all on table public.vvip_social_reports from authenticated;

grant execute on function public.vvip_social_can_view_post_current(uuid) to authenticated;
grant execute on function public.vvip_social_block_user(text) to authenticated;
grant execute on function public.vvip_social_unblock_user(text) to authenticated;
grant execute on function public.vvip_social_mute_user(text) to authenticated;
grant execute on function public.vvip_social_unmute_user(text) to authenticated;
grant execute on function public.vvip_social_report_user(text, text, text) to authenticated;
grant execute on function public.vvip_social_feed_read(integer) to authenticated;

comment on table public.vvip_social_blocks is
    'CURRENT Social Core two-way block authority. A block severs friendship and denies cross-party social visibility.';
comment on table public.vvip_social_mutes is
    'CURRENT Social Core feed-only mute state. Mute is not an authorization boundary.';
comment on table public.vvip_social_reports is
    'CURRENT Social Core protected report authority. Browser users may submit only through bounded RPC and cannot read report rows.';

commit;

-- VVIP TIGER Social Core 2026 foundation.
-- Repository migration only: Production/Staging application is a separate authorized gate.
-- Identity authority intentionally reuses public.vvip_marketplace_actor_id(), which is
-- already converged to the current Clerk user_* JWT subject. No Supabase Auth fallback.
--
-- The historical public.feed_posts table remains legacy/test evidence only.
-- There is no migration of legacy feed_posts data into this Social Core authority.

begin;

-- Binding Social Core text contract. Trim only this explicit Unicode edge
-- whitespace set and count PostgreSQL characters (Unicode code points). The
-- browser mirrors the same set and Array.from() count. No normalization form
-- rewrite is performed, preserving user-authored spelling.
create function public.vvip_social_text_normalize(p_value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $function$
    select pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
            p_value,
            U&'^[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+',
            ''
        ),
        U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+$',
        ''
    );
$function$;

revoke all on function public.vvip_social_text_normalize(text)
    from public, anon, authenticated;
grant execute on function public.vvip_social_text_normalize(text) to authenticated;

create table public.vvip_social_relationships (
    relationship_id uuid primary key default gen_random_uuid(),
    requester_subject text not null default public.vvip_marketplace_actor_id(),
    addressee_subject text not null,
    subject_low text generated always as (least(requester_subject, addressee_subject)) stored,
    subject_high text generated always as (greatest(requester_subject, addressee_subject)) stored,
    relationship_state text not null default 'pending'
        check (relationship_state in ('pending', 'friends')),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (requester_subject <> addressee_subject),
    check (requester_subject like 'user\_%' escape '\'),
    check (addressee_subject like 'user\_%' escape '\'),
    unique (subject_low, subject_high)
);

create index vvip_social_relationships_requester_idx
    on public.vvip_social_relationships (requester_subject, relationship_state, updated_at desc);
create index vvip_social_relationships_addressee_idx
    on public.vvip_social_relationships (addressee_subject, relationship_state, updated_at desc);

create table public.vvip_social_posts (
    post_id uuid primary key default gen_random_uuid(),
    author_subject text not null default public.vvip_marketplace_actor_id(),
    body text not null default '',
    audience text not null default 'public'
        check (audience in ('public', 'friends', 'only_me')),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (author_subject like 'user\_%' escape '\'),
    check (
        char_length(public.vvip_social_text_normalize(body)) between 1 and 5000
        and body = public.vvip_social_text_normalize(body)
    )
);

create index vvip_social_posts_feed_idx
    on public.vvip_social_posts (created_at desc);
create index vvip_social_posts_author_idx
    on public.vvip_social_posts (author_subject, created_at desc);

create function public.vvip_social_guard_relationship_write()
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

create function public.vvip_social_guard_post_write()
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
        if current_user in ('anon', 'authenticated')
           and NEW.author_subject <> actor then
            raise exception 'SOCIAL_POST_AUTHOR_REQUIRED';
        end if;
    elsif TG_OP = 'UPDATE' then
        if NEW.author_subject <> OLD.author_subject
           or NEW.created_at <> OLD.created_at then
            raise exception 'SOCIAL_POST_SCOPE_IMMUTABLE';
        end if;
        if current_user in ('anon', 'authenticated')
           and OLD.author_subject <> actor then
            raise exception 'SOCIAL_POST_AUTHOR_REQUIRED';
        end if;
    elsif TG_OP = 'DELETE' then
        if current_user in ('anon', 'authenticated')
           and OLD.author_subject <> actor then
            raise exception 'SOCIAL_POST_AUTHOR_REQUIRED';
        end if;
        return OLD;
    end if;

    NEW.body := public.vvip_social_text_normalize(NEW.body);
    if NEW.body is null or not (char_length(NEW.body) between 1 and 5000) then
        raise exception 'SOCIAL_POST_BODY_REQUIRED';
    end if;
    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

create trigger vvip_social_relationship_write_guard
before insert or update or delete on public.vvip_social_relationships
for each row execute function public.vvip_social_guard_relationship_write();

create trigger vvip_social_post_write_guard
before insert or update or delete on public.vvip_social_posts
for each row execute function public.vvip_social_guard_post_write();

alter table public.vvip_social_relationships enable row level security;
alter table public.vvip_social_relationships force row level security;
alter table public.vvip_social_posts enable row level security;
alter table public.vvip_social_posts force row level security;

revoke all privileges on table public.vvip_social_relationships from public, anon, authenticated;
revoke all privileges on table public.vvip_social_posts from public, anon, authenticated;

revoke all on function public.vvip_social_guard_relationship_write()
    from public, anon, authenticated;
revoke all on function public.vvip_social_guard_post_write()
    from public, anon, authenticated;

grant select, insert, update, delete on table public.vvip_social_relationships to authenticated;
grant select, insert, update, delete on table public.vvip_social_posts to authenticated;

create policy vvip_social_relationship_participant_read
on public.vvip_social_relationships
for select
to authenticated
using (
    (select public.vvip_marketplace_actor_id()) is not null
    and (
        requester_subject = (select public.vvip_marketplace_actor_id())
        or addressee_subject = (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_relationship_sender_create
on public.vvip_social_relationships
for insert
to authenticated
with check (
    requester_subject = (select public.vvip_marketplace_actor_id())
    and requester_subject <> addressee_subject
    and relationship_state = 'pending'
);

create policy vvip_social_relationship_recipient_accept
on public.vvip_social_relationships
for update
to authenticated
using (
    addressee_subject = (select public.vvip_marketplace_actor_id())
    and relationship_state = 'pending'
)
with check (
    addressee_subject = (select public.vvip_marketplace_actor_id())
    and relationship_state = 'friends'
);

create policy vvip_social_relationship_participant_remove
on public.vvip_social_relationships
for delete
to authenticated
using (
    requester_subject = (select public.vvip_marketplace_actor_id())
    or addressee_subject = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_post_visible_read
on public.vvip_social_posts
for select
to authenticated
using (
    (select public.vvip_marketplace_actor_id()) is not null
    and (
        author_subject = (select public.vvip_marketplace_actor_id())
        or audience = 'public'
        or (
            audience = 'friends'
            and exists (
                select 1
                from public.vvip_social_relationships relationship
                where relationship.relationship_state = 'friends'
                  and relationship.subject_low = least(
                      author_subject,
                      (select public.vvip_marketplace_actor_id())
                  )
                  and relationship.subject_high = greatest(
                      author_subject,
                      (select public.vvip_marketplace_actor_id())
                  )
            )
        )
    )
);

create policy vvip_social_post_owner_create
on public.vvip_social_posts
for insert
to authenticated
with check (
    author_subject = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_post_owner_update
on public.vvip_social_posts
for update
to authenticated
using (
    author_subject = (select public.vvip_marketplace_actor_id())
)
with check (
    author_subject = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_post_owner_delete
on public.vvip_social_posts
for delete
to authenticated
using (
    author_subject = (select public.vvip_marketplace_actor_id())
);

comment on table public.vvip_social_posts is
    'CURRENT Social Core post authority. Historical public.feed_posts remains legacy/test only.';
comment on table public.vvip_social_relationships is
    'CURRENT Social Core friendship-request and accepted-friendship authority.';

commit;

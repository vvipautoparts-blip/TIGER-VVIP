-- TIGER NEXUS 2026 — forward-only sector-specialized social publication.
-- Existing historical rows are not destructively reclassified without evidence.
-- All new/updated publishable social rows must bind to an enabled marketplace sector
-- and one owner-approved NEXUS intent. The former two-argument create RPC is removed.

begin;

alter table public.vvip_social_posts
    add column if not exists sector_key text,
    add column if not exists intent_class text;

alter table public.vvip_social_posts
    drop constraint if exists vvip_social_posts_sector_key_shape_check,
    drop constraint if exists vvip_social_posts_intent_class_check;

alter table public.vvip_social_posts
    add constraint vvip_social_posts_sector_key_shape_check
        check (sector_key is null or sector_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
    add constraint vvip_social_posts_intent_class_check
        check (intent_class is null or intent_class in ('OFFER', 'NEED', 'SERVICE', 'OPPORTUNITY'));

create index if not exists vvip_social_posts_sector_feed_idx
    on public.vvip_social_posts (sector_key, created_at desc, post_id desc)
    where sector_key is not null and intent_class is not null;

create or replace function public.vvip_social_guard_post_write()
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

    NEW.sector_key := nullif(btrim(NEW.sector_key), '');
    NEW.intent_class := upper(nullif(btrim(NEW.intent_class), ''));

    if NEW.sector_key is null then
        raise exception 'NEXUS_SECTOR_REQUIRED';
    end if;
    if NEW.intent_class is null
       or NEW.intent_class not in ('OFFER', 'NEED', 'SERVICE', 'OPPORTUNITY') then
        raise exception 'NEXUS_INTENT_REQUIRED';
    end if;
    if not exists (
        select 1
        from public.vvip_marketplace_sectors sector
        where sector.sector_key = NEW.sector_key
          and sector.is_enabled
    ) then
        raise exception 'NEXUS_SECTOR_NOT_ACTIVE';
    end if;

    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

-- Latest-only: the general-purpose two-argument create contract is no longer current.
revoke all on function public.vvip_social_post_create(text, text)
    from public, anon, authenticated;
drop function if exists public.vvip_social_post_create(text, text);

create function public.vvip_social_post_create(
    p_body text,
    p_audience text,
    p_sector_key text,
    p_intent_class text
)
returns public.vvip_social_posts
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
    normalized_body text;
    normalized_sector text := nullif(btrim(p_sector_key), '');
    normalized_intent text := upper(nullif(btrim(p_intent_class), ''));
    created public.vvip_social_posts%rowtype;
begin
    if actor is null then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if not public.vvip_social_actor_active() then
        raise exception 'SOCIAL_PROFILE_INACTIVE';
    end if;

    normalized_body := public.vvip_social_text_normalize(p_body);
    if normalized_body is null or not (char_length(normalized_body) between 1 and 5000) then
        raise exception 'SOCIAL_POST_BODY_REQUIRED';
    end if;
    if p_audience not in ('public', 'friends', 'only_me') then
        raise exception 'SOCIAL_POST_AUDIENCE_INVALID';
    end if;
    if normalized_sector is null
       or normalized_sector !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then
        raise exception 'NEXUS_SECTOR_REQUIRED';
    end if;
    if normalized_intent is null
       or normalized_intent not in ('OFFER', 'NEED', 'SERVICE', 'OPPORTUNITY') then
        raise exception 'NEXUS_INTENT_REQUIRED';
    end if;
    if not exists (
        select 1
        from public.vvip_marketplace_sectors sector
        where sector.sector_key = normalized_sector
          and sector.is_enabled
    ) then
        raise exception 'NEXUS_SECTOR_NOT_ACTIVE';
    end if;

    insert into public.vvip_social_posts (
        author_subject,
        body,
        audience,
        sector_key,
        intent_class
    ) values (
        actor,
        normalized_body,
        p_audience,
        normalized_sector,
        normalized_intent
    )
    returning * into created;

    return created;
end;
$function$;

revoke all on function public.vvip_social_post_create(text, text, text, text)
    from public, anon, authenticated;
grant execute on function public.vvip_social_post_create(text, text, text, text)
    to authenticated;

comment on column public.vvip_social_posts.sector_key is
    'TIGER NEXUS current activated-sector binding for new publishable social objects.';
comment on column public.vvip_social_posts.intent_class is
    'TIGER NEXUS current intent: OFFER, NEED, SERVICE, or OPPORTUNITY.';
comment on function public.vvip_social_post_create(text, text, text, text) is
    'TIGER NEXUS current social creation authority. Sector and intent are mandatory and server validated.';

commit;

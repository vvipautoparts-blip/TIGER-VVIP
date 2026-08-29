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

-- The feed remains subject-blind and privacy-authorized, but NEXUS classification is
-- carried through verbatim. Historical rows stay NULL; no generic fallback is fabricated.
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
  v_actor_profile_id uuid;
  v_limit integer := p_limit;
  v_cursor jsonb;
  v_cursor_version integer;
  v_cursor_kind text;
  v_cursor_profile_id uuid;
  v_before_created_at timestamptz;
  v_before_post_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_last jsonb;
  v_next_cursor text := null;
begin
  if v_actor is null or v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;

  if not public.vvip_social_actor_active() then
    raise exception 'SOCIAL_PROFILE_INACTIVE';
  end if;

  if v_limit is null or v_limit < 1 or v_limit > 100 then
    raise exception 'SOCIAL_FEED_LIMIT_INVALID';
  end if;

  select profile.profile_id
  into v_actor_profile_id
  from public.vvip_social_profile_projection as profile
  where profile.subject = v_actor
    and profile.profile_state = 'active'
  limit 1;

  if not found then
    raise exception 'SOCIAL_PROFILE_INACTIVE';
  end if;

  if p_cursor is not null then
    begin
      v_cursor := public.vvip_gate5_cursor_decode(p_cursor);

      if not (v_cursor ? 'v')
         or not (v_cursor ? 'kind')
         or not (v_cursor ? 'actor_profile_id')
         or not (v_cursor ? 'created_at')
         or not (v_cursor ? 'id') then
        raise exception 'GATE5_CURSOR_INVALID';
      end if;

      v_cursor_version := (v_cursor ->> 'v')::integer;
      v_cursor_kind := v_cursor ->> 'kind';
      v_cursor_profile_id := (v_cursor ->> 'actor_profile_id')::uuid;
      v_before_created_at := (v_cursor ->> 'created_at')::timestamptz;
      v_before_post_id := (v_cursor ->> 'id')::uuid;

      if v_cursor_version <> 2
         or v_cursor_kind <> 'social_feed'
         or v_before_created_at is null
         or v_before_post_id is null then
        raise exception 'GATE5_CURSOR_INVALID';
      end if;
    exception when others then
      if sqlerrm = 'GATE5_CURSOR_CONTEXT_MISMATCH' then
        raise;
      end if;
      raise exception 'GATE5_CURSOR_INVALID' using errcode = '22023';
    end;

    if v_cursor_profile_id <> v_actor_profile_id then
      raise exception 'GATE5_CURSOR_CONTEXT_MISMATCH' using errcode = '22023';
    end if;
  end if;

  select coalesce(
    jsonb_agg(feed_row.item order by feed_row.created_at desc, feed_row.post_id desc),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      post.post_id,
      post.created_at,
      jsonb_build_object(
        'post_id', post.post_id,
        'author_profile_id', case when profile.profile_state = 'active' then profile.profile_id else null end,
        'author_display_name', case when profile.profile_state = 'active' then profile.display_name else 'عضو غير متاح' end,
        'author_avatar_url', case when profile.profile_state = 'active' then profile.avatar_url else null end,
        'author_available', coalesce(profile.profile_state = 'active', false),
        'body', post.body,
        'audience', post.audience,
        'sector_key', post.sector_key,
        'intent_class', post.intent_class,
        'created_at', post.created_at,
        'updated_at', post.updated_at
      ) as item
    from public.vvip_social_posts as post
    left join public.vvip_social_profile_projection as profile
      on profile.subject = post.author_subject
    where public.vvip_social_can_view_post(post.post_id, v_actor)
      and (
        p_cursor is null
        or post.created_at < v_before_created_at
        or (
          post.created_at = v_before_created_at
          and post.post_id < v_before_post_id
        )
      )
    order by post.created_at desc, post.post_id desc
    limit (v_limit + 1)
  ) as feed_row;

  v_total := jsonb_array_length(v_rows);

  if v_total > v_limit then
    v_items := v_rows - v_limit;
  else
    v_items := v_rows;
  end if;

  if v_total > v_limit and jsonb_array_length(v_items) > 0 then
    v_last := v_items -> (jsonb_array_length(v_items) - 1);
    v_next_cursor := public.vvip_gate5_cursor_encode(
      jsonb_build_object(
        'v', 2,
        'kind', 'social_feed',
        'actor_profile_id', v_actor_profile_id,
        'created_at', v_last ->> 'created_at',
        'id', v_last ->> 'post_id'
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'next_cursor', v_next_cursor
  );
end;
$function$;

revoke all on function public.vvip_social_feed_read_keyset(text, integer)
  from public, anon, authenticated;
grant execute on function public.vvip_social_feed_read_keyset(text, integer)
  to authenticated;

-- Repost snapshots remain lineage-bound to the original NEXUS classification.
create or replace function public.vvip_social_guard_repost_snapshot_write()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_original_body text;
    v_original_sector text;
    v_original_intent text;
begin
    if coalesce(v_actor, '') like 'user\_%' escape '\'
       and exists (
           select 1
           from public.vvip_social_reposts as repost
           where repost.repost_post_id = old.post_id
       ) then
        if tg_op = 'DELETE' then
            raise exception 'SOCIAL_REPOST_SNAPSHOT_IMMUTABLE';
        end if;

        select original.body, original.sector_key, original.intent_class
          into v_original_body, v_original_sector, v_original_intent
          from public.vvip_social_reposts as repost
          join public.vvip_social_posts as original
            on original.post_id = repost.original_post_id
         where repost.repost_post_id = old.post_id
         limit 1;

        if not found
           or new.body is distinct from v_original_body
           or new.audience is distinct from old.audience
           or new.sector_key is distinct from v_original_sector
           or new.intent_class is distinct from v_original_intent then
            raise exception 'SOCIAL_REPOST_SNAPSHOT_IMMUTABLE';
        end if;
    end if;

    return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.vvip_social_guard_repost_snapshot_write()
  from public, anon, authenticated;

create or replace function public.vvip_social_sync_repost_snapshot()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    update public.vvip_social_posts as repost_post
       set body = new.body,
           sector_key = new.sector_key,
           intent_class = new.intent_class,
           updated_at = statement_timestamp()
     where repost_post.post_id in (
        select repost.repost_post_id
        from public.vvip_social_reposts as repost
        where repost.original_post_id = new.post_id
    );
    return new;
end;
$function$;

revoke all on function public.vvip_social_sync_repost_snapshot()
  from public, anon, authenticated;

drop trigger if exists vvip_social_repost_snapshot_sync on public.vvip_social_posts;
create trigger vvip_social_repost_snapshot_sync
after update of body, sector_key, intent_class on public.vvip_social_posts
for each row execute function public.vvip_social_sync_repost_snapshot();

create or replace function public.vvip_social_repost_post(p_original_post_id uuid, p_audience text)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_original_body text;
    v_original_audience text;
    v_original_sector text;
    v_original_intent text;
    v_existing_repost_post_id uuid;
    v_existing_audience text;
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

    if exists (
        select 1
        from public.vvip_social_reposts as parent_repost
        where parent_repost.repost_post_id = p_original_post_id
    ) then
        raise exception 'SOCIAL_REPOST_CHAIN_FORBIDDEN';
    end if;

    if not public.vvip_social_can_view_post(p_original_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    select post.body, post.audience, post.sector_key, post.intent_class
      into v_original_body, v_original_audience, v_original_sector, v_original_intent
      from public.vvip_social_posts as post
     where post.post_id = p_original_post_id;

    if not found then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    if v_original_sector is null or v_original_intent is null then
        raise exception 'NEXUS_REPOST_CLASSIFICATION_REQUIRED';
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

    perform pg_advisory_xact_lock(hashtextextended(v_actor || ':' || p_original_post_id::text, 0));

    select repost.repost_post_id, repost_post.audience
      into v_existing_repost_post_id, v_existing_audience
      from public.vvip_social_reposts as repost
      join public.vvip_social_posts as repost_post
        on repost_post.post_id = repost.repost_post_id
     where repost.original_post_id = p_original_post_id
       and repost.actor_subject = v_actor
     limit 1;

    if v_existing_repost_post_id is not null then
        update public.vvip_social_posts
           set body = v_original_body,
               sector_key = v_original_sector,
               intent_class = v_original_intent
         where post_id = v_existing_repost_post_id;

        return jsonb_build_object(
            'ok', true,
            'created', false,
            'original_post_id', p_original_post_id,
            'repost_post_id', v_existing_repost_post_id,
            'audience', v_existing_audience,
            'sector_key', v_original_sector,
            'intent_class', v_original_intent
        );
    end if;

    insert into public.vvip_social_posts (
        author_subject,
        body,
        audience,
        sector_key,
        intent_class
    ) values (
        v_actor,
        v_original_body,
        p_audience,
        v_original_sector,
        v_original_intent
    )
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
        'audience', p_audience,
        'sector_key', v_original_sector,
        'intent_class', v_original_intent
    );
end;
$function$;

revoke all on function public.vvip_social_repost_post(uuid, text)
  from public, anon, authenticated;
grant execute on function public.vvip_social_repost_post(uuid, text)
  to authenticated;

comment on column public.vvip_social_posts.sector_key is
    'TIGER NEXUS current activated-sector binding for new publishable social objects.';
comment on column public.vvip_social_posts.intent_class is
    'TIGER NEXUS current intent: OFFER, NEED, SERVICE, or OPPORTUNITY.';
comment on function public.vvip_social_post_create(text, text, text, text) is
    'TIGER NEXUS current social creation authority. Sector and intent are mandatory and server validated.';
comment on function public.vvip_social_feed_read_keyset(text, integer) is
    'TIGER NEXUS feed authority. Privacy is re-evaluated on every page and sector/intent are carried without fabrication.';
comment on function public.vvip_social_repost_post(uuid, text) is
    'TIGER NEXUS repost authority. Reposts inherit and remain bound to the original sector and intent.';

commit;

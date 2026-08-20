-- TIGER Gate 4 — Notification Intelligence 2026.
-- Repository/local rehearsal only. Production application is a separate protected gate.
-- PostgreSQL is durable truth; Realtime and push are transports only.

begin;

create table public.vvip_notification_inboxes (
    inbox_id uuid primary key default gen_random_uuid(),
    owner_subject text not null unique,
    channel_epoch bigint not null default 1 check (channel_epoch > 0),
    next_sequence bigint not null default 1 check (next_sequence > 0),
    last_sequence bigint not null default 0 check (last_sequence >= 0),
    unread_count bigint not null default 0 check (unread_count >= 0),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (public.vvip_social_subject_is_valid(owner_subject)),
    check (last_sequence < next_sequence)
);

create table public.vvip_notifications (
    notification_id uuid primary key default gen_random_uuid(),
    inbox_id uuid not null references public.vvip_notification_inboxes(inbox_id) on delete restrict,
    sequence bigint not null check (sequence > 0),
    event_key text not null check (char_length(event_key) between 1 and 200),
    category text not null check (category in (
        'social_message','social_relationship','social_comment','social_reaction',
        'marketplace_activity','security_account','system_integrity'
    )),
    template_key text not null check (char_length(template_key) between 1 and 120),
    template_args jsonb not null default '{}'::jsonb,
    object_type text check (object_type is null or char_length(object_type) between 1 and 64),
    object_id text check (object_id is null or char_length(object_id) between 1 and 160),
    actor_subject text,
    importance text not null check (importance in ('low','normal','high','critical')),
    sensitivity text not null check (sensitivity in ('low','private','sensitive','security')),
    created_at timestamptz not null default statement_timestamp(),
    expires_at timestamptz,
    read_at timestamptz,
    check (actor_subject is null or public.vvip_social_subject_is_valid(actor_subject)),
    unique (inbox_id, sequence),
    unique (inbox_id, event_key)
);

create table public.vvip_notification_preferences (
    owner_subject text not null,
    category text not null check (category in (
        'social_message','social_relationship','social_comment','social_reaction',
        'marketplace_activity','security_account','system_integrity'
    )),
    in_app_enabled boolean not null default true,
    push_enabled boolean not null default true,
    quiet_hours_enabled boolean not null default false,
    quiet_start time without time zone,
    quiet_end time without time zone,
    timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
    updated_at timestamptz not null default statement_timestamp(),
    primary key (owner_subject, category),
    check (public.vvip_social_subject_is_valid(owner_subject)),
    check (not push_enabled or in_app_enabled),
    check (not quiet_hours_enabled or (quiet_start is not null and quiet_end is not null))
);

create table public.vvip_notification_activity_leases (
    owner_subject text primary key,
    foreground boolean not null,
    view_scope text not null check (view_scope in ('none','notifications','conversation','post','listing','profile','security')),
    view_object_id text check (view_object_id is null or char_length(view_object_id) <= 160),
    lease_expires_at timestamptz not null,
    updated_at timestamptz not null default statement_timestamp(),
    check (public.vvip_social_subject_is_valid(owner_subject)),
    check (lease_expires_at <= updated_at + interval '90 seconds')
);

create table public.vvip_notification_endpoints (
    endpoint_id uuid primary key default gen_random_uuid(),
    owner_subject text not null,
    provider text not null check (provider in ('fake','webpush','apns','fcm')),
    platform text not null check (platform in ('test','web','ios','android')),
    endpoint_fingerprint text not null check (endpoint_fingerprint ~ '^[0-9a-f]{64}$'),
    endpoint_capability text not null check (char_length(endpoint_capability) between 16 and 4096),
    state text not null default 'active' check (state in ('active','revoked','invalid')),
    last_success_at timestamptz,
    last_failure_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (public.vvip_social_subject_is_valid(owner_subject)),
    unique (endpoint_fingerprint)
);

create table public.vvip_notification_dispatches (
    dispatch_id uuid primary key default gen_random_uuid(),
    notification_id uuid not null references public.vvip_notifications(notification_id) on delete restrict,
    endpoint_id uuid not null references public.vvip_notification_endpoints(endpoint_id) on delete restrict,
    provider text not null check (provider in ('fake','webpush','apns','fcm')),
    collapse_key text check (collapse_key is null or char_length(collapse_key) between 1 and 120),
    state text not null default 'pending' check (state in (
        'pending','leased','accepted','retry_wait','invalid_endpoint',
        'permanent_failure','expired','dead_letter','suppressed'
    )),
    attempt_count integer not null default 0 check (attempt_count between 0 and 5),
    next_attempt_at timestamptz not null default statement_timestamp(),
    lease_owner text check (lease_owner is null or char_length(lease_owner) between 1 and 120),
    lease_expires_at timestamptz,
    generation bigint not null default 1 check (generation > 0),
    last_error_class text check (last_error_class is null or char_length(last_error_class) <= 120),
    provider_message_ref text check (provider_message_ref is null or char_length(provider_message_ref) <= 240),
    expires_at timestamptz not null,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    unique (notification_id, endpoint_id)
);

create table public.vvip_notification_category_policies (
    category text primary key check (category in (
        'social_message','social_relationship','social_comment','social_reaction',
        'marketplace_activity','security_account','system_integrity'
    )),
    durable_required boolean not null,
    push_allowed boolean not null,
    user_can_disable boolean not null,
    default_sensitivity text not null check (default_sensitivity in ('low','private','sensitive','security')),
    default_ttl_seconds integer not null check (default_ttl_seconds between 60 and 604800),
    default_importance text not null check (default_importance in ('low','normal','high','critical')),
    collapse_mode text not null check (collapse_mode in ('none','category'))
);

insert into public.vvip_notification_category_policies (
    category,durable_required,push_allowed,user_can_disable,default_sensitivity,
    default_ttl_seconds,default_importance,collapse_mode
) values
    ('social_message',false,true,true,'private',86400,'high','none'),
    ('social_relationship',false,true,true,'low',86400,'normal','category'),
    ('social_comment',false,true,true,'private',86400,'normal','category'),
    ('social_reaction',false,true,true,'low',43200,'low','category'),
    ('marketplace_activity',false,true,true,'private',86400,'normal','category'),
    ('security_account',true,true,false,'security',86400,'critical','none'),
    ('system_integrity',true,true,false,'security',86400,'critical','none');

create table public.vvip_notification_kill_switches (
    scope_kind text not null check (scope_kind in ('global','provider','category','sensitive_preview')),
    scope_key text not null check (char_length(scope_key) between 1 and 120),
    blocked boolean not null default false,
    updated_at timestamptz not null default statement_timestamp(),
    primary key (scope_kind, scope_key)
);

insert into public.vvip_notification_kill_switches (scope_kind, scope_key, blocked) values
    ('global','background_push',false),
    ('sensitive_preview','all',false);

create index vvip_notifications_inbox_sequence_idx
    on public.vvip_notifications (inbox_id, sequence);
create index vvip_notifications_unread_idx
    on public.vvip_notifications (inbox_id, sequence) where read_at is null;
create index vvip_notification_endpoints_owner_idx
    on public.vvip_notification_endpoints (owner_subject, state, provider);
create index vvip_notification_dispatch_ready_idx
    on public.vvip_notification_dispatches (state, next_attempt_at, expires_at);
create index vvip_notification_dispatch_endpoint_idx
    on public.vvip_notification_dispatches (endpoint_id, state);

alter table public.vvip_notification_inboxes enable row level security;
alter table public.vvip_notification_inboxes force row level security;
alter table public.vvip_notifications enable row level security;
alter table public.vvip_notifications force row level security;
alter table public.vvip_notification_preferences enable row level security;
alter table public.vvip_notification_preferences force row level security;
alter table public.vvip_notification_activity_leases enable row level security;
alter table public.vvip_notification_activity_leases force row level security;
alter table public.vvip_notification_endpoints enable row level security;
alter table public.vvip_notification_endpoints force row level security;
alter table public.vvip_notification_dispatches enable row level security;
alter table public.vvip_notification_dispatches force row level security;
alter table public.vvip_notification_category_policies enable row level security;
alter table public.vvip_notification_category_policies force row level security;
alter table public.vvip_notification_kill_switches enable row level security;
alter table public.vvip_notification_kill_switches force row level security;

revoke all privileges on table public.vvip_notification_inboxes from public, anon, authenticated;
revoke all privileges on table public.vvip_notifications from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_preferences from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_activity_leases from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_endpoints from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_dispatches from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_category_policies from public, anon, authenticated;
revoke all privileges on table public.vvip_notification_kill_switches from public, anon, authenticated;

-- Legacy Global V1 notifications are preserved as historical bytes but are no longer a browser authority.
revoke all privileges on table public.vvip_notification_events from public, anon, authenticated;

grant select, insert, update on table public.vvip_notification_inboxes to service_role;
grant select, insert, update on table public.vvip_notifications to service_role;
grant select, insert, update on table public.vvip_notification_preferences to service_role;
grant select, insert, update, delete on table public.vvip_notification_activity_leases to service_role;
grant select, insert, update on table public.vvip_notification_endpoints to service_role;
grant select, insert, update on table public.vvip_notification_dispatches to service_role;
grant select on table public.vvip_notification_category_policies to service_role;
grant select, insert, update on table public.vvip_notification_kill_switches to service_role;

create or replace function public.vvip_notification_push_blocked(
    p_category text,
    p_provider text
)
returns boolean
language sql
stable
security definer set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_notification_kill_switches switch
        where switch.blocked
          and (
              (switch.scope_kind = 'global' and switch.scope_key = 'background_push')
              or (switch.scope_kind = 'provider' and switch.scope_key = p_provider)
              or (switch.scope_kind = 'category' and switch.scope_key = p_category)
          )
    );
$function$;

create or replace function public.vvip_notification_push_preview(
    p_category text,
    p_sensitivity text,
    p_template_key text,
    p_template_args jsonb
)
returns jsonb
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_sensitive_preview_blocked boolean;
begin
    select exists (
        select 1 from public.vvip_notification_kill_switches
        where scope_kind = 'sensitive_preview' and scope_key = 'all' and blocked
    ) into v_sensitive_preview_blocked;

    -- social_message push previews never include message body; generic preview only.
    if p_category = 'social_message' then
        return jsonb_build_object('title','VVIP TIGER','body','You have a new message');
    end if;
    if v_sensitive_preview_blocked or p_sensitivity in ('private','sensitive') then
        return jsonb_build_object('title','VVIP TIGER','body','You have a new notification');
    end if;
    if p_sensitivity = 'security' then
        return jsonb_build_object('title','VVIP TIGER Security','body','A security notification is available');
    end if;
    return jsonb_build_object(
        'title','VVIP TIGER',
        'body', case p_category
            when 'social_relationship' then 'You have a new social update'
            when 'social_comment' then 'You have a new comment'
            when 'social_reaction' then 'You have a new reaction'
            when 'marketplace_activity' then 'You have a marketplace update'
            else 'You have a new notification'
        end
    );
end;
$function$;

create or replace function public.vvip_notification_create(
    p_recipient text,
    p_event_key text,
    p_category text,
    p_template_key text,
    p_template_args jsonb default '{}'::jsonb,
    p_object_type text default null,
    p_object_id text default null,
    p_actor_subject text default null,
    p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_inbox public.vvip_notification_inboxes%rowtype;
    v_existing public.vvip_notifications%rowtype;
    v_notification public.vvip_notifications%rowtype;
    v_policy public.vvip_notification_category_policies%rowtype;
    v_pref public.vvip_notification_preferences%rowtype;
    v_has_pref boolean := false;
    v_in_app boolean;
    v_push boolean;
    v_quiet boolean := false;
    v_same_view boolean := false;
    v_expires_at timestamptz;
    v_topic text;
    v_dispatch_count integer := 0;
    v_timezone text := 'UTC';
    v_local_time time without time zone;
begin
    if not public.vvip_social_subject_is_valid(p_recipient) then
        raise exception 'TIGER_NOTIFICATION_RECIPIENT_INVALID';
    end if;
    if p_actor_subject is not null and not public.vvip_social_subject_is_valid(p_actor_subject) then
        raise exception 'TIGER_NOTIFICATION_ACTOR_INVALID';
    end if;
    if p_event_key is null or char_length(btrim(p_event_key)) = 0 or char_length(p_event_key) > 200 then
        raise exception 'TIGER_NOTIFICATION_EVENT_KEY_INVALID';
    end if;
    if p_template_key is null or char_length(btrim(p_template_key)) = 0 or char_length(p_template_key) > 120 then
        raise exception 'TIGER_NOTIFICATION_TEMPLATE_INVALID';
    end if;
    if p_template_args is null or jsonb_typeof(p_template_args) <> 'object' or pg_column_size(p_template_args) > 8192 then
        raise exception 'TIGER_NOTIFICATION_TEMPLATE_ARGS_INVALID';
    end if;

    select * into v_policy from public.vvip_notification_category_policies where category = p_category;
    if not found then
        raise exception 'TIGER_NOTIFICATION_CATEGORY_INVALID';
    end if;

    if p_expires_at is not null and p_expires_at <= statement_timestamp() then
        return jsonb_build_object('decision','expired_before_creation','created',false);
    end if;

    insert into public.vvip_notification_inboxes (owner_subject)
    values (p_recipient)
    on conflict (owner_subject) do nothing;

    select * into v_inbox
    from public.vvip_notification_inboxes
    where owner_subject = p_recipient
    for update;

    select * into v_existing
    from public.vvip_notifications
    where inbox_id = v_inbox.inbox_id and event_key = p_event_key;
    if found then
        return jsonb_build_object(
            'decision','duplicate',
            'created',false,
            'notification_id',v_existing.notification_id,
            'sequence',v_existing.sequence
        );
    end if;

    select * into v_pref
    from public.vvip_notification_preferences
    where owner_subject = p_recipient and category = p_category;
    v_has_pref := found;

    v_in_app := case when v_policy.durable_required then true else coalesce(v_pref.in_app_enabled, true) end;
    v_push := v_policy.push_allowed and coalesce(v_pref.push_enabled, true) and v_in_app;

    if not v_in_app then
        return jsonb_build_object('decision','disabled_optional_category','created',false);
    end if;

    if v_has_pref and v_pref.quiet_hours_enabled then
        v_timezone := v_pref.timezone;
        v_local_time := (statement_timestamp() at time zone v_timezone)::time;
        if v_pref.quiet_start <= v_pref.quiet_end then
            v_quiet := v_local_time >= v_pref.quiet_start and v_local_time < v_pref.quiet_end;
        else
            v_quiet := v_local_time >= v_pref.quiet_start or v_local_time < v_pref.quiet_end;
        end if;
    end if;

    select exists (
        select 1
        from public.vvip_notification_activity_leases lease
        where lease.owner_subject = p_recipient
          and lease.foreground
          and lease.lease_expires_at > statement_timestamp()
          and p_object_type is not null
          and lease.view_scope = p_object_type
          and lease.view_object_id is not distinct from p_object_id
    ) into v_same_view;

    v_expires_at := coalesce(
        p_expires_at,
        statement_timestamp() + make_interval(secs => v_policy.default_ttl_seconds)
    );

    insert into public.vvip_notifications (
        inbox_id,sequence,event_key,category,template_key,template_args,
        object_type,object_id,actor_subject,importance,sensitivity,expires_at
    ) values (
        v_inbox.inbox_id,v_inbox.next_sequence,p_event_key,p_category,p_template_key,p_template_args,
        p_object_type,p_object_id,p_actor_subject,v_policy.default_importance,v_policy.default_sensitivity,v_expires_at
    ) returning * into v_notification;

    update public.vvip_notification_inboxes
       set next_sequence = v_inbox.next_sequence + 1,
           last_sequence = v_inbox.next_sequence,
           unread_count = unread_count + 1,
           updated_at = statement_timestamp()
     where inbox_id = v_inbox.inbox_id;

    v_topic := 'notifications:' || v_inbox.inbox_id::text || ':epoch:' || v_inbox.channel_epoch::text;
    perform realtime.send(
        jsonb_build_object(
            'notification_id',v_notification.notification_id,
            'sequence',v_notification.sequence,
            'category',v_notification.category,
            'template_key',v_notification.template_key,
            'object_type',v_notification.object_type,
            'object_id',v_notification.object_id,
            'channel_epoch',v_inbox.channel_epoch
        ),
        'notification_created',
        v_topic,
        true
    );

    if v_push and not v_same_view and (not v_quiet or v_policy.default_importance in ('high','critical')) then
        insert into public.vvip_notification_dispatches (
            notification_id,endpoint_id,provider,collapse_key,expires_at
        )
        select
            v_notification.notification_id,
            endpoint.endpoint_id,
            endpoint.provider,
            case when v_policy.collapse_mode = 'category'
                 then p_category || ':' || coalesce(p_object_type,'global') || ':' || coalesce(p_object_id,'global')
                 else null end,
            v_expires_at
        from public.vvip_notification_endpoints endpoint
        where endpoint.owner_subject = p_recipient
          and endpoint.state = 'active'
          and not public.vvip_notification_push_blocked(p_category, endpoint.provider)
        on conflict (notification_id, endpoint_id) do nothing;
        get diagnostics v_dispatch_count = row_count;
    end if;

    return jsonb_build_object(
        'decision', case
            when v_dispatch_count > 0 then 'persist_realtime_and_push'
            when v_quiet and v_push then 'persist_and_defer_push'
            else 'persist_and_realtime'
        end,
        'created',true,
        'notification_id',v_notification.notification_id,
        'sequence',v_notification.sequence,
        'dispatch_count',v_dispatch_count,
        'same_view_suppressed',v_same_view
    );
end;
$function$;

create or replace function public.vvip_notification_list(
    after_sequence bigint default 0,
    p_limit integer default 50
)
returns table (
    notification_id uuid,
    sequence bigint,
    category text,
    template_key text,
    template_args jsonb,
    object_type text,
    object_id text,
    actor_subject text,
    importance text,
    sensitivity text,
    created_at timestamptz,
    expires_at timestamptz,
    read_at timestamptz
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_inbox uuid;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED';
    end if;
    if after_sequence is null or after_sequence < 0 then
        raise exception 'TIGER_NOTIFICATION_CURSOR_INVALID';
    end if;
    select inbox_id into v_inbox from public.vvip_notification_inboxes where owner_subject = v_actor;
    if v_inbox is null then return; end if;

    return query
    select n.notification_id,n.sequence,n.category,n.template_key,n.template_args,
           n.object_type,n.object_id,n.actor_subject,n.importance,n.sensitivity,
           n.created_at,n.expires_at,n.read_at
    from public.vvip_notifications n
    where n.inbox_id = v_inbox
      and n.sequence > after_sequence
    order by n.sequence asc
    limit (least(greatest(coalesce(p_limit,50),1),100));
end;
$function$;

create or replace function public.vvip_notification_mark_read(
    p_notification_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_inbox public.vvip_notification_inboxes%rowtype;
    v_notification public.vvip_notifications%rowtype;
    v_changed boolean := false;
    v_topic text;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    select * into v_inbox from public.vvip_notification_inboxes where owner_subject = v_actor for update;
    if not found then raise exception 'TIGER_NOTIFICATION_NOT_FOUND'; end if;
    select * into v_notification from public.vvip_notifications
     where notification_id = p_notification_id and inbox_id = v_inbox.inbox_id for update;
    if not found then raise exception 'TIGER_NOTIFICATION_NOT_FOUND'; end if;

    if v_notification.read_at is null then
        update public.vvip_notifications set read_at = statement_timestamp() where notification_id = p_notification_id;
        update public.vvip_notification_inboxes
           set unread_count = greatest(unread_count - 1,0), updated_at = statement_timestamp()
         where inbox_id = v_inbox.inbox_id;
        v_changed := true;
        v_topic := 'notifications:' || v_inbox.inbox_id::text || ':epoch:' || v_inbox.channel_epoch::text;
        perform realtime.send(
            jsonb_build_object('notification_id',p_notification_id,'sequence',v_notification.sequence,'channel_epoch',v_inbox.channel_epoch),
            'notification_read',v_topic,true
        );
    end if;

    return jsonb_build_object('notification_id',p_notification_id,'changed',v_changed);
end;
$function$;

create or replace function public.vvip_notification_mark_all_read(
    up_to_sequence bigint
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_inbox public.vvip_notification_inboxes%rowtype;
    v_changed integer := 0;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    if up_to_sequence is null or up_to_sequence < 0 then raise exception 'TIGER_NOTIFICATION_CURSOR_INVALID'; end if;
    select * into v_inbox from public.vvip_notification_inboxes where owner_subject = v_actor for update;
    if not found then return jsonb_build_object('changed',0,'unread_count',0); end if;
    if up_to_sequence > v_inbox.last_sequence then raise exception 'TIGER_NOTIFICATION_CURSOR_BEYOND_TAIL'; end if;

    with changed as (
        update public.vvip_notifications
           set read_at = statement_timestamp()
         where inbox_id = v_inbox.inbox_id and sequence <= up_to_sequence and read_at is null
         returning 1
    ) select count(*) into v_changed from changed;

    if v_changed > 0 then
        update public.vvip_notification_inboxes
           set unread_count = greatest(unread_count - v_changed,0), updated_at = statement_timestamp()
         where inbox_id = v_inbox.inbox_id;
    end if;
    return jsonb_build_object('changed',v_changed,'unread_count',greatest(v_inbox.unread_count - v_changed,0));
end;
$function$;

create or replace function public.vvip_notification_get_channel_ticket()
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_inbox public.vvip_notification_inboxes%rowtype;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    insert into public.vvip_notification_inboxes (owner_subject) values (v_actor) on conflict (owner_subject) do nothing;
    select * into v_inbox from public.vvip_notification_inboxes where owner_subject = v_actor;
    return jsonb_build_object(
        'inbox_id',v_inbox.inbox_id,
        'channel_epoch',v_inbox.channel_epoch,
        'topic','notifications:' || v_inbox.inbox_id::text || ':epoch:' || v_inbox.channel_epoch::text,
        'last_sequence',v_inbox.last_sequence,
        'unread_count',v_inbox.unread_count
    );
end;
$function$;

create or replace function public.vvip_notification_get_preferences()
returns table (
    category text,
    in_app_enabled boolean,
    push_enabled boolean,
    quiet_hours_enabled boolean,
    quiet_start time without time zone,
    quiet_end time without time zone,
    timezone text,
    durable_required boolean
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    return query
    select policy.category,
           case when policy.durable_required then true else coalesce(pref.in_app_enabled,true) end,
           coalesce(pref.push_enabled,true),
           coalesce(pref.quiet_hours_enabled,false),
           pref.quiet_start,pref.quiet_end,coalesce(pref.timezone,'UTC'),policy.durable_required
    from public.vvip_notification_category_policies policy
    left join public.vvip_notification_preferences pref
      on pref.owner_subject = v_actor and pref.category = policy.category
    order by policy.category;
end;
$function$;

create or replace function public.vvip_notification_update_preference(
    p_category text,
    p_in_app_enabled boolean,
    p_push_enabled boolean,
    p_quiet_hours_enabled boolean,
    p_quiet_start time without time zone,
    p_quiet_end time without time zone,
    p_timezone text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_policy public.vvip_notification_category_policies%rowtype;
    v_in_app boolean;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    select * into v_policy from public.vvip_notification_category_policies where category = p_category;
    if not found then raise exception 'TIGER_NOTIFICATION_CATEGORY_INVALID'; end if;
    if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
        raise exception 'TIGER_NOTIFICATION_TIMEZONE_INVALID';
    end if;
    if p_quiet_hours_enabled and (p_quiet_start is null or p_quiet_end is null) then
        raise exception 'TIGER_NOTIFICATION_QUIET_HOURS_INVALID';
    end if;
    v_in_app := case when v_policy.durable_required then true else coalesce(p_in_app_enabled,true) end;
    if coalesce(p_push_enabled,false) and not v_in_app then
        raise exception 'TIGER_NOTIFICATION_PUSH_REQUIRES_DURABLE_INBOX';
    end if;

    insert into public.vvip_notification_preferences (
        owner_subject,category,in_app_enabled,push_enabled,quiet_hours_enabled,
        quiet_start,quiet_end,timezone,updated_at
    ) values (
        v_actor,p_category,v_in_app,coalesce(p_push_enabled,false),coalesce(p_quiet_hours_enabled,false),
        p_quiet_start,p_quiet_end,p_timezone,statement_timestamp()
    ) on conflict (owner_subject,category) do update set
        in_app_enabled = excluded.in_app_enabled,
        push_enabled = excluded.push_enabled,
        quiet_hours_enabled = excluded.quiet_hours_enabled,
        quiet_start = excluded.quiet_start,
        quiet_end = excluded.quiet_end,
        timezone = excluded.timezone,
        updated_at = excluded.updated_at;

    return jsonb_build_object('category',p_category,'in_app_enabled',v_in_app,'push_enabled',coalesce(p_push_enabled,false));
end;
$function$;

create or replace function public.vvip_notification_update_activity_hint(
    p_foreground boolean,
    p_view_scope text,
    p_view_object_id text default null
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_expires timestamptz := statement_timestamp() + interval '90 seconds';
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    if p_view_scope not in ('none','notifications','conversation','post','listing','profile','security') then
        raise exception 'TIGER_NOTIFICATION_VIEW_SCOPE_INVALID';
    end if;
    if p_view_object_id is not null and char_length(p_view_object_id) > 160 then
        raise exception 'TIGER_NOTIFICATION_VIEW_OBJECT_INVALID';
    end if;
    insert into public.vvip_notification_activity_leases (
        owner_subject,foreground,view_scope,view_object_id,lease_expires_at,updated_at
    ) values (
        v_actor,coalesce(p_foreground,false),p_view_scope,p_view_object_id,v_expires,statement_timestamp()
    ) on conflict (owner_subject) do update set
        foreground = excluded.foreground,
        view_scope = excluded.view_scope,
        view_object_id = excluded.view_object_id,
        lease_expires_at = excluded.lease_expires_at,
        updated_at = excluded.updated_at;
    return jsonb_build_object('lease_expires_at',v_expires);
end;
$function$;

create or replace function public.vvip_notification_register_endpoint(
    p_provider text,
    p_platform text,
    p_endpoint_capability text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_fingerprint text;
    v_existing public.vvip_notification_endpoints%rowtype;
    v_endpoint public.vvip_notification_endpoints%rowtype;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    if p_provider not in ('fake','webpush','apns','fcm') then raise exception 'TIGER_NOTIFICATION_PROVIDER_INVALID'; end if;
    if p_platform not in ('test','web','ios','android') then raise exception 'TIGER_NOTIFICATION_PLATFORM_INVALID'; end if;
    if p_endpoint_capability is null or char_length(p_endpoint_capability) < 16 or char_length(p_endpoint_capability) > 4096 then
        raise exception 'TIGER_NOTIFICATION_ENDPOINT_INVALID';
    end if;
    v_fingerprint := encode(digest(convert_to(p_endpoint_capability,'UTF8'),'sha256'),'hex');
    select * into v_existing from public.vvip_notification_endpoints where endpoint_fingerprint = v_fingerprint for update;
    if found and v_existing.owner_subject <> v_actor then
        raise exception 'TIGER_NOTIFICATION_ENDPOINT_OWNERSHIP_CONFLICT';
    end if;
    if found then
        update public.vvip_notification_endpoints
           set provider = p_provider, platform = p_platform, endpoint_capability = p_endpoint_capability,
               state = 'active', updated_at = statement_timestamp()
         where endpoint_id = v_existing.endpoint_id
         returning * into v_endpoint;
    else
        insert into public.vvip_notification_endpoints (
            owner_subject,provider,platform,endpoint_fingerprint,endpoint_capability
        ) values (v_actor,p_provider,p_platform,v_fingerprint,p_endpoint_capability)
        returning * into v_endpoint;
    end if;
    return jsonb_build_object('endpoint_id',v_endpoint.endpoint_id,'endpoint_fingerprint',v_fingerprint,'state',v_endpoint.state);
end;
$function$;

create or replace function public.vvip_notification_revoke_endpoint(
    p_endpoint_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_changed integer;
begin
    if v_actor is null then raise exception 'TIGER_NOTIFICATION_AUTH_REQUIRED'; end if;
    update public.vvip_notification_endpoints
       set state = 'revoked', updated_at = statement_timestamp()
     where endpoint_id = p_endpoint_id and owner_subject = v_actor and state <> 'revoked';
    get diagnostics v_changed = row_count;
    if v_changed = 0 and not exists (
        select 1 from public.vvip_notification_endpoints where endpoint_id = p_endpoint_id and owner_subject = v_actor
    ) then raise exception 'TIGER_NOTIFICATION_ENDPOINT_NOT_FOUND'; end if;

    update public.vvip_notification_dispatches
       set state = 'suppressed', generation = generation + 1,
           lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp()
     where endpoint_id = p_endpoint_id and state in ('pending','retry_wait','leased');
    return jsonb_build_object('endpoint_id',p_endpoint_id,'revoked',true);
end;
$function$;

create or replace function public.vvip_notification_set_kill_switch(
    p_scope_kind text,
    p_scope_key text,
    p_blocked boolean
)
returns void
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    if p_scope_kind not in ('global','provider','category','sensitive_preview') then
        raise exception 'TIGER_NOTIFICATION_KILL_SWITCH_SCOPE_INVALID';
    end if;
    if p_scope_key is null or char_length(p_scope_key) = 0 or char_length(p_scope_key) > 120 then
        raise exception 'TIGER_NOTIFICATION_KILL_SWITCH_KEY_INVALID';
    end if;
    insert into public.vvip_notification_kill_switches (scope_kind,scope_key,blocked,updated_at)
    values (p_scope_kind,p_scope_key,coalesce(p_blocked,true),statement_timestamp())
    on conflict (scope_kind,scope_key) do update set blocked = excluded.blocked, updated_at = excluded.updated_at;

    if coalesce(p_blocked,true) and p_scope_kind in ('global','provider','category') then
        update public.vvip_notification_dispatches dispatch
           set state = 'suppressed', generation = generation + 1,
               lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp()
         from public.vvip_notifications notification
         where notification.notification_id = dispatch.notification_id
           and dispatch.state in ('pending','retry_wait','leased')
           and (
               (p_scope_kind = 'global' and p_scope_key = 'background_push')
               or (p_scope_kind = 'provider' and dispatch.provider = p_scope_key)
               or (p_scope_kind = 'category' and notification.category = p_scope_key)
           );
    end if;
end;
$function$;

create or replace function public.vvip_notification_claim_dispatches(
    p_limit integer,
    p_worker text
)
returns table (
    dispatch_id uuid,
    generation bigint,
    endpoint_capability text,
    provider text,
    notification_id uuid,
    category text,
    preview jsonb,
    object_type text,
    object_id text,
    ttl_seconds integer,
    importance text,
    collapse_key text
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
begin
    if p_worker is null or char_length(p_worker) < 3 or char_length(p_worker) > 120 then
        raise exception 'TIGER_NOTIFICATION_WORKER_INVALID';
    end if;

    update public.vvip_notification_dispatches
       set state = 'expired', generation = generation + 1, updated_at = statement_timestamp()
     where state in ('pending','retry_wait') and expires_at <= statement_timestamp();

    update public.vvip_notification_dispatches dispatch
       set state = 'suppressed', generation = generation + 1, updated_at = statement_timestamp()
      from public.vvip_notifications notification, public.vvip_notification_endpoints endpoint
     where notification.notification_id = dispatch.notification_id
       and endpoint.endpoint_id = dispatch.endpoint_id
       and dispatch.state in ('pending','retry_wait')
       and (endpoint.state <> 'active' or public.vvip_notification_push_blocked(notification.category,dispatch.provider));

    return query
    with candidates as (
        select dispatch.dispatch_id
        from public.vvip_notification_dispatches dispatch
        join public.vvip_notification_endpoints endpoint on endpoint.endpoint_id = dispatch.endpoint_id
        join public.vvip_notifications notification on notification.notification_id = dispatch.notification_id
        where dispatch.state in ('pending','retry_wait')
          and dispatch.next_attempt_at <= statement_timestamp()
          and dispatch.expires_at > statement_timestamp()
          and endpoint.state = 'active'
          and not public.vvip_notification_push_blocked(notification.category,dispatch.provider)
        order by dispatch.next_attempt_at, dispatch.created_at, dispatch.dispatch_id
        for update of dispatch skip locked
        limit (least(greatest(coalesce(p_limit,1),1),32))
    ), claimed as (
        update public.vvip_notification_dispatches dispatch
           set state = 'leased',
               attempt_count = dispatch.attempt_count + 1,
               generation = dispatch.generation + 1,
               lease_owner = p_worker,
               lease_expires_at = statement_timestamp() + interval '30 seconds',
               updated_at = statement_timestamp()
          from candidates
         where dispatch.dispatch_id = candidates.dispatch_id
         returning dispatch.*
    )
    select claimed.dispatch_id,
           claimed.generation,
           endpoint.endpoint_capability,
           claimed.provider,
           notification.notification_id,
           notification.category,
           public.vvip_notification_push_preview(notification.category,notification.sensitivity,notification.template_key,notification.template_args),
           notification.object_type,
           notification.object_id,
           greatest(0,extract(epoch from (claimed.expires_at - statement_timestamp()))::integer),
           notification.importance,
           claimed.collapse_key
    from claimed
    join public.vvip_notification_endpoints endpoint on endpoint.endpoint_id = claimed.endpoint_id
    join public.vvip_notifications notification on notification.notification_id = claimed.notification_id;
end;
$function$;

create or replace function public.vvip_notification_settle_dispatch(
    p_dispatch_id uuid,
    p_expected_generation bigint,
    p_result_class text,
    p_provider_message_ref text default null,
    p_error_class text default null,
    p_retry_after_seconds integer default null
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_dispatch public.vvip_notification_dispatches%rowtype;
    v_next timestamptz;
    v_backoff integer;
begin
    if p_result_class not in ('accepted','retryable','rate_limited','endpoint_invalid','permanent_failure') then
        raise exception 'TIGER_NOTIFICATION_PROVIDER_RESULT_INVALID';
    end if;
    select * into v_dispatch from public.vvip_notification_dispatches where dispatch_id = p_dispatch_id for update;
    if not found then raise exception 'TIGER_NOTIFICATION_DISPATCH_NOT_FOUND'; end if;
    if v_dispatch.state <> 'leased' or v_dispatch.generation <> p_expected_generation then
        raise exception 'TIGER_NOTIFICATION_STALE_WORKER';
    end if;
    if v_dispatch.expires_at <= statement_timestamp() then
        update public.vvip_notification_dispatches set state = 'expired', lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        return jsonb_build_object('state','expired');
    end if;

    if p_result_class = 'accepted' then
        update public.vvip_notification_dispatches set state = 'accepted', provider_message_ref = left(p_provider_message_ref,240), last_error_class = null, lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        update public.vvip_notification_endpoints endpoint set last_success_at = statement_timestamp(), updated_at = statement_timestamp() where endpoint.endpoint_id = v_dispatch.endpoint_id;
        return jsonb_build_object('state','accepted');
    elsif p_result_class = 'endpoint_invalid' then
        update public.vvip_notification_dispatches set state = 'invalid_endpoint', last_error_class = left(coalesce(p_error_class,'endpoint_invalid'),120), lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        update public.vvip_notification_endpoints endpoint set state = 'invalid', last_failure_at = statement_timestamp(), updated_at = statement_timestamp() where endpoint.endpoint_id = v_dispatch.endpoint_id;
        return jsonb_build_object('state','invalid_endpoint');
    elsif p_result_class = 'permanent_failure' then
        update public.vvip_notification_dispatches set state = 'permanent_failure', last_error_class = left(coalesce(p_error_class,'permanent_failure'),120), lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        update public.vvip_notification_endpoints endpoint set last_failure_at = statement_timestamp(), updated_at = statement_timestamp() where endpoint.endpoint_id = v_dispatch.endpoint_id;
        return jsonb_build_object('state','permanent_failure');
    end if;

    if v_dispatch.attempt_count >= 5 then
        update public.vvip_notification_dispatches set state = 'dead_letter', last_error_class = left(coalesce(p_error_class,p_result_class),120), lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        return jsonb_build_object('state','dead_letter');
    end if;

    if p_result_class = 'rate_limited' and p_retry_after_seconds is not null then
        v_backoff := least(greatest(p_retry_after_seconds,5),3600);
    else
        v_backoff := least(3600, (5 * power(2,greatest(v_dispatch.attempt_count - 1,0)))::integer)
                     + (abs(hashtextextended(v_dispatch.dispatch_id::text,v_dispatch.attempt_count)) % 11)::integer;
    end if;
    v_next := statement_timestamp() + make_interval(secs => v_backoff);
    if v_next >= v_dispatch.expires_at then
        update public.vvip_notification_dispatches set state = 'expired', last_error_class = left(coalesce(p_error_class,p_result_class),120), lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp() where dispatch_id = p_dispatch_id;
        return jsonb_build_object('state','expired');
    end if;

    update public.vvip_notification_dispatches
       set state = 'retry_wait', next_attempt_at = v_next,
           last_error_class = left(coalesce(p_error_class,p_result_class),120),
           lease_owner = null, lease_expires_at = null, updated_at = statement_timestamp()
     where dispatch_id = p_dispatch_id;
    return jsonb_build_object('state','retry_wait','next_attempt_at',v_next);
end;
$function$;

create or replace function public.vvip_notification_realtime_topic_authorized(
    p_topic text,
    p_extension text
)
returns boolean
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_inbox_id uuid;
    v_epoch bigint;
    v_parts text[];
begin
    if v_actor is null or p_extension <> 'broadcast' then return false; end if;
    v_parts := string_to_array(coalesce(p_topic,''),':');
    if cardinality(v_parts) <> 4 or v_parts[1] <> 'notifications' or v_parts[3] <> 'epoch' then return false; end if;
    begin
        v_inbox_id := v_parts[2]::uuid;
        v_epoch := v_parts[4]::bigint;
    exception when others then
        return false;
    end;
    if v_epoch <= 0 then return false; end if;
    return exists (
        select 1 from public.vvip_notification_inboxes inbox
        where inbox.inbox_id = v_inbox_id
          and inbox.owner_subject = v_actor
          and inbox.channel_epoch = v_epoch
    );
end;
$function$;

create policy vvip_notification_realtime_receive_current_epoch
on realtime.messages
for select
to authenticated
using (
    extension = 'broadcast'
    and public.vvip_notification_realtime_topic_authorized((select realtime.topic()), extension::text)
);

revoke all on function public.vvip_notification_push_blocked(text,text) from public, anon, authenticated;
revoke all on function public.vvip_notification_push_preview(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.vvip_notification_create(text,text,text,text,jsonb,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.vvip_notification_claim_dispatches(integer,text) from public, anon, authenticated;
revoke all on function public.vvip_notification_settle_dispatch(uuid,bigint,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.vvip_notification_set_kill_switch(text,text,boolean) from public, anon, authenticated;
revoke all on function public.vvip_notification_realtime_topic_authorized(text,text) from public, anon, authenticated;

revoke all on function public.vvip_notification_list(bigint,integer) from public, anon, authenticated;
revoke all on function public.vvip_notification_mark_read(uuid) from public, anon, authenticated;
revoke all on function public.vvip_notification_mark_all_read(bigint) from public, anon, authenticated;
revoke all on function public.vvip_notification_get_channel_ticket() from public, anon, authenticated;
revoke all on function public.vvip_notification_get_preferences() from public, anon, authenticated;
revoke all on function public.vvip_notification_update_preference(text,boolean,boolean,boolean,time without time zone,time without time zone,text) from public, anon, authenticated;
revoke all on function public.vvip_notification_update_activity_hint(boolean,text,text) from public, anon, authenticated;
revoke all on function public.vvip_notification_register_endpoint(text,text,text) from public, anon, authenticated;
revoke all on function public.vvip_notification_revoke_endpoint(uuid) from public, anon, authenticated;

grant execute on function public.vvip_notification_create(text,text,text,text,jsonb,text,text,text,timestamptz) to service_role;
grant execute on function public.vvip_notification_claim_dispatches(integer,text) to service_role;
grant execute on function public.vvip_notification_settle_dispatch(uuid,bigint,text,text,text,integer) to service_role;
grant execute on function public.vvip_notification_set_kill_switch(text,text,boolean) to service_role;

grant execute on function public.vvip_notification_list(bigint,integer) to authenticated;
grant execute on function public.vvip_notification_mark_read(uuid) to authenticated;
grant execute on function public.vvip_notification_mark_all_read(bigint) to authenticated;
grant execute on function public.vvip_notification_get_channel_ticket() to authenticated;
grant execute on function public.vvip_notification_get_preferences() to authenticated;
grant execute on function public.vvip_notification_update_preference(text,boolean,boolean,boolean,time without time zone,time without time zone,text) to authenticated;
grant execute on function public.vvip_notification_update_activity_hint(boolean,text,text) to authenticated;
grant execute on function public.vvip_notification_register_endpoint(text,text,text) to authenticated;
grant execute on function public.vvip_notification_revoke_endpoint(uuid) to authenticated;
-- RLS evaluation on realtime.messages needs this actor-scoped boolean helper only.
grant execute on function public.vvip_notification_realtime_topic_authorized(text,text) to authenticated;

comment on table public.vvip_notification_inboxes is 'Gate 4 durable notification inbox authority.';
comment on table public.vvip_notifications is 'Gate 4 semantic durable notification truth; provider transport is non-authoritative.';
comment on table public.vvip_notification_endpoints is 'Gate 4 service-protected push endpoint capability registry; raw capability is never browser-readable.';
comment on table public.vvip_notification_dispatches is 'Gate 4 fenced durable push outbox with exactly five attempts maximum.';

commit;

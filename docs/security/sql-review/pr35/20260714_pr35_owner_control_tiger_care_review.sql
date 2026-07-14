/* REVIEW ONLY — DO NOT APPLY
 * PR35 Owner Control + Tiger Care proposed PostgreSQL/Supabase design.
 * This file is not a migration. It deliberately finishes with ROLLBACK.
 * Production adoption requires an independent review, staging rehearsal,
 * Clerk JWT-template verification, backups, monitoring, and an apply plan.
 */
begin;

create type public.pr35_assignment_state as enum ('pending','active','suspended','revoked','expired');
create type public.pr35_scope_level as enum ('platform','sector','region','area','team');
create type public.pr35_ticket_priority as enum ('low','normal','high','urgent');
create type public.pr35_ticket_status as enum ('new','acknowledged','in_review','waiting_user','escalated','resolved','closed','cancelled');

create table public.roles (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,63}$'),
  authority_rank smallint not null check (authority_rank between 0 and 1000),
  is_owner_role boolean not null default false,
  label_ar text not null check (length(label_ar) between 1 and 100),
  label_en text not null check (length(label_en) between 1 and 100),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create unique index roles_single_owner_role on public.roles (is_owner_role) where is_owner_role;

create table public.permissions (
  id text primary key check (id ~ '^[a-z][a-z0-9_.]{2,127}$'),
  label_ar text not null check (length(label_ar) between 1 and 140),
  label_en text not null check (length(label_en) between 1 and 140),
  sensitive boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create table public.role_permissions (
  role_id text not null references public.roles(id) on delete restrict,
  permission_id text not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (role_id, permission_id)
);

create table public.user_role_assignments (
  id uuid primary key,
  clerk_user_id text not null check (length(clerk_user_id) between 3 and 255),
  role_id text not null references public.roles(id) on delete restrict,
  scope_level public.pr35_scope_level not null,
  sector_id uuid,
  region_id uuid,
  area_id uuid,
  team_id uuid,
  state public.pr35_assignment_state not null default 'pending',
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  granted_by_clerk_user_id text not null check (length(granted_by_clerk_user_id) between 3 and 255),
  grant_reason text not null check (length(btrim(grant_reason)) between 3 and 500),
  revoked_at timestamptz,
  revoked_by_clerk_user_id text,
  revocation_reason text check (revocation_reason is null or length(btrim(revocation_reason)) between 3 and 500),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint assignment_window check (starts_at < expires_at),
  constraint assignment_scope_shape check (
    (scope_level = 'platform' and sector_id is null and region_id is null and area_id is null and team_id is null) or
    (scope_level = 'sector' and sector_id is not null and region_id is null and area_id is null and team_id is null) or
    (scope_level = 'region' and sector_id is not null and region_id is not null and area_id is null and team_id is null) or
    (scope_level = 'area' and sector_id is not null and region_id is not null and area_id is not null and team_id is null) or
    (scope_level = 'team' and sector_id is not null and region_id is not null and area_id is not null and team_id is not null)
  ),
  constraint revoked_shape check ((state = 'revoked') = (revoked_at is not null and revoked_by_clerk_user_id is not null and revocation_reason is not null))
);

create unique index assignments_active_dedupe on public.user_role_assignments
  (clerk_user_id, role_id, scope_level, coalesce(sector_id,'00000000-0000-0000-0000-000000000000'),
   coalesce(region_id,'00000000-0000-0000-0000-000000000000'), coalesce(area_id,'00000000-0000-0000-0000-000000000000'),
   coalesce(team_id,'00000000-0000-0000-0000-000000000000'))
  where state in ('pending','active','suspended');
create index assignments_subject_page on public.user_role_assignments (clerk_user_id, created_at desc, id desc);
create index assignments_scope_active on public.user_role_assignments (scope_level, sector_id, region_id, area_id, team_id, expires_at)
  where state = 'active';

create table public.permission_requests (
  id uuid primary key,
  requester_clerk_user_id text not null check (length(requester_clerk_user_id) between 3 and 255),
  permission_id text not null references public.permissions(id) on delete restrict,
  requested_scope_level public.pr35_scope_level not null,
  sector_id uuid, region_id uuid, area_id uuid, team_id uuid,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by_clerk_user_id text,
  decision_reason text check (decision_reason is null or length(btrim(decision_reason)) between 3 and 500),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default statement_timestamp(),
  decided_at timestamptz,
  unique (requester_clerk_user_id, idempotency_key)
);
create index permission_requests_requester_page on public.permission_requests (requester_clerk_user_id, created_at desc, id desc);
create index permission_requests_pending_page on public.permission_requests (created_at, id) where status = 'pending';

create table public.tiger_care_tickets (
  id uuid primary key,
  requester_clerk_user_id text not null check (length(requester_clerk_user_id) between 3 and 255),
  category text not null check (category in ('management_contact','support','complaint_report','missing_category','rejection_appeal','account_issue','sector_access_request','fraud_safety','other')),
  priority public.pr35_ticket_priority not null default 'normal',
  status public.pr35_ticket_status not null default 'new',
  subject text not null check (length(btrim(subject)) between 1 and 160),
  description text not null check (length(btrim(description)) between 1 and 4000),
  scope_level public.pr35_scope_level not null default 'platform',
  sector_id uuid, region_id uuid, area_id uuid, team_id uuid,
  assigned_to_clerk_user_id text,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  unique (requester_clerk_user_id, idempotency_key)
);
create index care_tickets_requester_page on public.tiger_care_tickets (requester_clerk_user_id, created_at desc, id desc);
create index care_tickets_staff_queue on public.tiger_care_tickets (status, priority desc, created_at, id)
  where status not in ('closed','cancelled');
create index care_tickets_scope_page on public.tiger_care_tickets (scope_level, sector_id, region_id, area_id, team_id, created_at desc, id desc);

create table public.tiger_care_messages (
  id uuid primary key,
  ticket_id uuid not null references public.tiger_care_tickets(id) on delete restrict,
  author_clerk_user_id text not null check (length(author_clerk_user_id) between 3 and 255),
  body text not null check (length(btrim(body)) between 1 and 2000),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default statement_timestamp(),
  unique (author_clerk_user_id, idempotency_key)
);
create index care_messages_ticket_page on public.tiger_care_messages (ticket_id, created_at, id);

create table public.tiger_care_internal_notes (
  id uuid primary key,
  ticket_id uuid not null references public.tiger_care_tickets(id) on delete restrict,
  author_clerk_user_id text not null check (length(author_clerk_user_id) between 3 and 255),
  body text not null check (length(btrim(body)) between 1 and 2000),
  reason text not null check (length(btrim(reason)) between 3 and 500),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default statement_timestamp(),
  unique (author_clerk_user_id, idempotency_key)
);
create index care_notes_ticket_page on public.tiger_care_internal_notes (ticket_id, created_at desc, id desc);

create table public.tiger_care_escalations (
  id uuid primary key,
  ticket_id uuid not null references public.tiger_care_tickets(id) on delete restrict,
  from_team_id uuid,
  to_team_id uuid not null,
  escalated_by_clerk_user_id text not null,
  reason text not null check (length(btrim(reason)) between 3 and 500),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default statement_timestamp(),
  unique (escalated_by_clerk_user_id, idempotency_key)
);
create index care_escalations_ticket_page on public.tiger_care_escalations (ticket_id, created_at desc, id desc);

create table public.admin_activity_logs (
  id uuid primary key,
  actor_clerk_user_id text not null,
  action text not null check (length(action) between 3 and 128),
  target_type text not null check (length(target_type) between 2 and 64),
  target_id text not null check (length(target_id) between 1 and 255),
  scope_level public.pr35_scope_level not null,
  sector_id uuid, region_id uuid, area_id uuid, team_id uuid,
  reason text not null check (length(btrim(reason)) between 3 and 500),
  correlation_key text not null check (length(correlation_key) between 8 and 128),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  previous_hash text,
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192),
  created_at timestamptz not null default statement_timestamp(),
  unique (actor_clerk_user_id, idempotency_key),
  unique (event_hash)
);
create index admin_logs_scope_page on public.admin_activity_logs (scope_level, sector_id, region_id, area_id, team_id, created_at desc, id desc);
create index admin_logs_correlation on public.admin_activity_logs (correlation_key);

-- Justified only as a transactional outbox for confirmed adapter receipts.
-- It contains delivery metadata, never message bodies, secrets, or provider credentials.
create table public.notification_outbox (
  id uuid primary key,
  ticket_id uuid references public.tiger_care_tickets(id) on delete restrict,
  recipient_clerk_user_id text not null,
  event_type text not null check (event_type in ('care_request_received','care_message_added','care_status_changed')),
  status text not null default 'pending' check (status in ('pending','processing','confirmed','failed','cancelled')),
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 128),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  available_at timestamptz not null default statement_timestamp(),
  confirmed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);
create index notification_outbox_worker_page on public.notification_outbox (available_at, id) where status in ('pending','failed');

-- Clerk JWT template prerequisite: auth.jwt()->>'sub' must be the Clerk user ID.
create function public.pr35_clerk_user_id() returns text
language sql stable security invoker
set search_path = pg_catalog, public
as $$ select nullif(auth.jwt()->>'sub','') $$;

create function public.pr35_has_permission(required_permission text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(bool_or(true), false)
  from public.user_role_assignments a
  join public.role_permissions rp on rp.role_id = a.role_id and rp.permission_id = required_permission
  where a.clerk_user_id = public.pr35_clerk_user_id()
    and a.state = 'active' and statement_timestamp() >= a.starts_at and statement_timestamp() < a.expires_at
$$;

create function public.pr35_scope_allowed(required_permission text, resource_level public.pr35_scope_level,
  resource_sector uuid, resource_region uuid, resource_area uuid, resource_team uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(bool_or(
    a.scope_level = 'platform' or
    (a.scope_level = 'sector' and a.sector_id = resource_sector) or
    (a.scope_level = 'region' and a.sector_id = resource_sector and a.region_id = resource_region) or
    (a.scope_level = 'area' and a.sector_id = resource_sector and a.region_id = resource_region and a.area_id = resource_area) or
    (a.scope_level = 'team' and a.sector_id = resource_sector and a.region_id = resource_region and a.area_id = resource_area and a.team_id = resource_team)
  ), false)
  from public.user_role_assignments a
  join public.role_permissions rp on rp.role_id = a.role_id and rp.permission_id = required_permission
  where a.clerk_user_id = public.pr35_clerk_user_id()
    and a.state = 'active' and statement_timestamp() >= a.starts_at and statement_timestamp() < a.expires_at
$$;

revoke all on function public.pr35_has_permission(text) from public, anon;
revoke all on function public.pr35_scope_allowed(text, public.pr35_scope_level, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.pr35_has_permission(text) to authenticated;
grant execute on function public.pr35_scope_allowed(text, public.pr35_scope_level, uuid, uuid, uuid, uuid) to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.permission_requests enable row level security;
alter table public.tiger_care_tickets enable row level security;
alter table public.tiger_care_messages enable row level security;
alter table public.tiger_care_internal_notes enable row level security;
alter table public.tiger_care_escalations enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.notification_outbox enable row level security;

create policy roles_authorized_read on public.roles for select to authenticated
  using (public.pr35_has_permission('authorization.assignment.read'));
create policy permissions_authorized_read on public.permissions for select to authenticated
  using (public.pr35_has_permission('authorization.assignment.read'));
create policy role_permissions_authorized_read on public.role_permissions for select to authenticated
  using (public.pr35_has_permission('authorization.assignment.read'));

create policy assignments_own_or_authorized_read on public.user_role_assignments for select to authenticated using (
  clerk_user_id = public.pr35_clerk_user_id() or
  public.pr35_scope_allowed('authorization.assignment.read', scope_level, sector_id, region_id, area_id, team_id)
);
-- No direct INSERT/UPDATE/DELETE policy: a reviewed trusted RPC must lock the
-- actor grants, deny self-assignment, enforce permission/rank/scope ceilings,
-- require reason + audit in one transaction, and require owner authority for
-- any owner-role assignment or revocation. Expiry/revocation is effective on
-- every permission check; sessions gain no durable authorization claim.

create policy permission_requests_own_read on public.permission_requests for select to authenticated
  using (requester_clerk_user_id = public.pr35_clerk_user_id());
create policy permission_requests_own_insert on public.permission_requests for insert to authenticated
  with check (requester_clerk_user_id = public.pr35_clerk_user_id() and status = 'pending' and decided_by_clerk_user_id is null);

create policy tickets_requester_read on public.tiger_care_tickets for select to authenticated
  using (requester_clerk_user_id = public.pr35_clerk_user_id());
create policy tickets_scoped_staff_read on public.tiger_care_tickets for select to authenticated
  using (public.pr35_scope_allowed('care.ticket.read.scoped', scope_level, sector_id, region_id, area_id, team_id));
create policy tickets_requester_insert on public.tiger_care_tickets for insert to authenticated
  with check (requester_clerk_user_id = public.pr35_clerk_user_id() and status = 'new' and assigned_to_clerk_user_id is null);
-- No requester UPDATE/DELETE. Status, assignment, escalation, and resolution
-- require reviewed RPCs with permission/scope re-evaluation and audit append.

create policy messages_ticket_participant_read on public.tiger_care_messages for select to authenticated using (
  exists (select 1 from public.tiger_care_tickets t where t.id = ticket_id and
    (t.requester_clerk_user_id = public.pr35_clerk_user_id() or
     public.pr35_scope_allowed('care.ticket.read.scoped', t.scope_level, t.sector_id, t.region_id, t.area_id, t.team_id)))
);
create policy messages_requester_insert on public.tiger_care_messages for insert to authenticated with check (
  author_clerk_user_id = public.pr35_clerk_user_id() and
  exists (select 1 from public.tiger_care_tickets t where t.id = ticket_id and t.requester_clerk_user_id = public.pr35_clerk_user_id())
);

create policy internal_notes_explicit_staff_read on public.tiger_care_internal_notes for select to authenticated using (
  public.pr35_has_permission('care.internal_note.read') and exists (
    select 1 from public.tiger_care_tickets t where t.id = ticket_id and
    public.pr35_scope_allowed('care.internal_note.read', t.scope_level, t.sector_id, t.region_id, t.area_id, t.team_id))
);
-- No normal-user or direct INSERT policy exists for internal notes.
create policy escalations_scoped_staff_read on public.tiger_care_escalations for select to authenticated using (
  exists (select 1 from public.tiger_care_tickets t where t.id = ticket_id and
    public.pr35_scope_allowed('care.ticket.read.scoped', t.scope_level, t.sector_id, t.region_id, t.area_id, t.team_id))
);

create policy audit_scoped_read on public.admin_activity_logs for select to authenticated
  using (public.pr35_scope_allowed('audit.event.read.scoped', scope_level, sector_id, region_id, area_id, team_id));
-- Append-only audit: no authenticated INSERT/UPDATE/DELETE policies. Only a
-- separately reviewed transactional RPC may append after validating the hash.
revoke insert, update, delete, truncate on public.admin_activity_logs from authenticated, anon;
revoke all on public.notification_outbox from authenticated, anon;

-- Immutable history and identity columns. Install this trigger on append-only
-- and identity-bearing tables only after staging review.
create function public.pr35_reject_mutation() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$ begin raise exception using errcode = '42501', message = 'immutable_record'; end $$;
create trigger admin_activity_logs_no_update_delete before update or delete on public.admin_activity_logs
  for each row execute function public.pr35_reject_mutation();
create trigger care_messages_no_update_delete before update or delete on public.tiger_care_messages
  for each row execute function public.pr35_reject_mutation();
create trigger care_notes_no_update_delete before update or delete on public.tiger_care_internal_notes
  for each row execute function public.pr35_reject_mutation();
create trigger care_escalations_no_update_delete before update or delete on public.tiger_care_escalations
  for each row execute function public.pr35_reject_mutation();

-- Proposed RPC checklist (not implemented here): SECURITY DEFINER functions
-- must SET search_path = pg_catalog, public; revoke PUBLIC/anon execute; accept
-- bounded inputs and idempotency/correlation keys; lock affected assignments;
-- derive actor only from pr35_clerk_user_id(); reject actor-supplied identity;
-- reject self-elevation, authority-rank ceiling, scope widening and owner-role
-- changes by non-owner; append audit atomically; return a confirmed receipt.

-- Rollback/test plan:
-- 1. Apply only to an isolated staging database after backup and lint review.
-- 2. Verify Clerk JWT sub, authenticated role, and forced cross-user IDOR cases.
-- 3. Exercise pending/suspended/revoked/expired grants and concurrent revocation.
-- 4. Test platform/sector/region/area/team containment and sibling-scope denial.
-- 5. Verify requester ticket/message isolation and zero normal-user note access.
-- 6. Attempt audit/message/note/escalation UPDATE, DELETE, TRUNCATE and direct INSERT.
-- 7. Replay idempotency keys, paginate with (created_at,id), inspect query plans.
-- 8. Test owner-only owner mutation, self-grant, permission/rank ceiling, rollback.
-- Rollback is a separately reviewed down script restoring prior grants/policies;
-- never drop evidence tables until export/retention requirements are satisfied.

rollback;

-- VVIP TIGER Project Control — schema only. Review on Development/Staging before any Production use.
create schema if not exists project_control;

create table if not exists project_control.source_documents (
  source_id text primary key,
  file_name text not null,
  sha256 text not null,
  size_bytes bigint not null,
  canonical boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);

create table if not exists project_control.phases (
  code text primary key check (code ~ '^G[0-9]{2}$'),
  title text not null,
  order_index integer not null unique,
  goal text,
  duration_text text,
  cumulative_percent numeric(5,2),
  responsibility text,
  transition_gate text,
  wave text not null,
  priority text not null,
  workflow_status text not null default 'backlog' check (workflow_status in ('backlog','ready','in_progress','blocked','review','qa','done','archived')),
  baseline_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_control.tasks (
  code text primary key check (code ~ '^G[0-9]{2}-[0-9]{2}$'),
  phase_code text not null references project_control.phases(code) on update cascade on delete restrict,
  order_index integer not null unique,
  title text not null,
  goal text,
  user_benefit text,
  platform_benefit text,
  prerequisites text,
  responsible_roles text,
  estimate_text text,
  reference_path text,
  wave text not null,
  priority text not null,
  workflow_status text not null default 'backlog' check (workflow_status in ('backlog','ready','in_progress','blocked','review','qa','done','archived')),
  baseline_status text,
  source_document text,
  source_heading text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_tasks_phase_idx on project_control.tasks(phase_code, order_index);
create index if not exists project_tasks_status_idx on project_control.tasks(workflow_status, priority);

create table if not exists project_control.task_steps (
  id bigint generated always as identity primary key,
  task_code text not null references project_control.tasks(code) on update cascade on delete cascade,
  section text not null,
  step_order integer not null,
  content text not null,
  unique(task_code, section, step_order)
);

create table if not exists project_control.task_acceptance (
  id bigint generated always as identity primary key,
  task_code text not null references project_control.tasks(code) on update cascade on delete cascade,
  criterion_type text not null,
  content text not null,
  unique(task_code, criterion_type)
);

create table if not exists project_control.task_dependencies (
  task_code text not null references project_control.tasks(code) on update cascade on delete cascade,
  depends_on_task_code text not null references project_control.tasks(code) on update cascade on delete restrict,
  dependency_type text not null default 'recommended_sequence',
  primary key(task_code, depends_on_task_code),
  check (task_code <> depends_on_task_code)
);

create table if not exists project_control.status_history (
  id bigint generated always as identity primary key,
  task_code text not null references project_control.tasks(code) on update cascade on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now()
);

create table if not exists project_control.decisions (
  id text primary key,
  title text not null,
  decision text not null,
  reason text,
  affected_tasks text[] not null default '{}',
  owner text,
  status text not null default 'proposed',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_control.risks (
  id text primary key,
  title text not null,
  description text,
  probability smallint check (probability between 1 and 5),
  impact smallint check (impact between 1 and 5),
  owner text,
  mitigation text,
  contingency text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_control.artifacts (
  id text primary key,
  task_code text references project_control.tasks(code) on update cascade on delete set null,
  artifact_type text not null,
  name text not null,
  path_or_url text,
  version text,
  sha256 text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function project_control.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_phases_set_updated_at on project_control.phases;
create trigger project_phases_set_updated_at before update on project_control.phases
for each row execute function project_control.set_updated_at();

drop trigger if exists project_tasks_set_updated_at on project_control.tasks;
create trigger project_tasks_set_updated_at before update on project_control.tasks
for each row execute function project_control.set_updated_at();

drop trigger if exists project_risks_set_updated_at on project_control.risks;
create trigger project_risks_set_updated_at before update on project_control.risks
for each row execute function project_control.set_updated_at();

create or replace view project_control.phase_progress as
select
  p.code,
  p.title,
  p.order_index,
  p.workflow_status,
  count(t.code) as task_count,
  count(t.code) filter (where t.workflow_status = 'done') as done_count,
  case when count(t.code) = 0 then 0
       else round(100.0 * count(t.code) filter (where t.workflow_status = 'done') / count(t.code), 2)
  end as completion_percent
from project_control.phases p
left join project_control.tasks t on t.phase_code = p.code
group by p.code, p.title, p.order_index, p.workflow_status;

-- Internal planning data: deny browser roles by default. Access through a reviewed server/API layer.
revoke all on schema project_control from public, anon, authenticated;
revoke all on all tables in schema project_control from public, anon, authenticated;
revoke all on all sequences in schema project_control from public, anon, authenticated;
grant usage on schema project_control to service_role;
grant all on all tables in schema project_control to service_role;
grant all on all sequences in schema project_control to service_role;

-- Global control-plane extensions.
create table if not exists project_control.requirements (
  requirement_id text primary key,
  task_code text not null references project_control.tasks(code) on update cascade on delete cascade,
  requirement_type text not null,
  requirement_text text not null,
  source_document text not null,
  source_heading text,
  workflow_status text not null default 'backlog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_requirements_task_idx on project_control.requirements(task_code, requirement_type);

create table if not exists project_control.requirement_links (
  requirement_id text not null references project_control.requirements(requirement_id) on update cascade on delete cascade,
  entity_type text not null check (entity_type in ('test_case','artifact','decision','risk','launch_gate','api','screen','database_policy')),
  entity_id text not null,
  link_type text not null default 'implemented_by',
  primary key(requirement_id, entity_type, entity_id)
);

create table if not exists project_control.vendors (
  vendor_id text primary key,
  service text not null,
  vendor text not null,
  countries text,
  data_classification text,
  cost_model text,
  exit_plan text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_control.launch_gates (
  gate_id text primary key,
  gate_name text not null,
  criterion text not null,
  evidence_required text not null,
  owner text not null,
  status text not null default 'not_started' check (status in ('not_started','blocked','review','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_control.strategic_backlog (
  item_id text primary key,
  title text not null,
  description text not null,
  origin text,
  target_release text,
  priority text not null,
  status text not null default 'backlog',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_control.country_capabilities (
  country_code char(2) primary key,
  country_name text not null,
  launch_status text not null default 'blocked_pending_review',
  browse_public_enabled boolean not null default true,
  signup_enabled boolean not null default false,
  listing_enabled boolean not null default false,
  messaging_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  minimum_age smallint not null default 18 check (minimum_age between 13 and 99),
  legal_review_status text not null default 'pending',
  data_region text,
  default_currency text,
  supported_languages text[] not null default '{}',
  prohibited_categories_policy text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists project_control.scale_targets (
  target_id text primary key,
  metric text not null,
  target_value numeric not null,
  unit text not null,
  percentile text,
  environment text not null default 'production',
  gate_id text references project_control.launch_gates(gate_id) on update cascade on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists project_control.search_facets (
  facet_id text primary key,
  facet_key text not null unique,
  label_ar text not null,
  label_en text not null,
  data_type text not null,
  applies_to text not null,
  sort_order integer not null unique,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists project_control.test_cases (
  test_case_id text primary key,
  module text not null,
  task_code text references project_control.tasks(code) on update cascade on delete set null,
  title text not null,
  preconditions text,
  steps jsonb not null default '[]'::jsonb,
  expected_result text not null,
  automation_level text not null,
  severity text not null,
  status text not null default 'planned',
  updated_at timestamptz not null default now()
);

create table if not exists project_control.evidence_records (
  evidence_id text primary key,
  entity_type text not null,
  entity_id text not null,
  evidence_type text not null,
  path_or_url text,
  sha256 text,
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create or replace view project_control.launch_readiness as
select
  count(*) as gate_count,
  count(*) filter (where status = 'approved') as approved_count,
  case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status='approved') / count(*), 2) end as completion_percent
from project_control.launch_gates;

alter table project_control.requirements enable row level security;
alter table project_control.requirement_links enable row level security;
alter table project_control.vendors enable row level security;
alter table project_control.launch_gates enable row level security;
alter table project_control.strategic_backlog enable row level security;
alter table project_control.country_capabilities enable row level security;
alter table project_control.scale_targets enable row level security;
alter table project_control.search_facets enable row level security;
alter table project_control.test_cases enable row level security;
alter table project_control.evidence_records enable row level security;

revoke all on all tables in schema project_control from public, anon, authenticated;
revoke all on all sequences in schema project_control from public, anon, authenticated;
grant all on all tables in schema project_control to service_role;
grant all on all sequences in schema project_control to service_role;

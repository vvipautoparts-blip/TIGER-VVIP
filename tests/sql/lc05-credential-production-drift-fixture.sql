\set ON_ERROR_STOP on

create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.otp_codes enable row level security;
grant select, insert, update, delete, truncate, references, trigger on table public.otp_codes to anon, authenticated;
create policy otp_select_open on public.otp_codes for select to anon, authenticated using (true);
create policy otp_insert_open on public.otp_codes for insert to anon, authenticated with check (true);
create policy otp_update_open on public.otp_codes for update to anon, authenticated using (true) with check (true);

create table public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null,
  expires_at timestamptz not null,
  verified_at timestamptz
);
alter table public.email_verifications enable row level security;
grant select, insert, update, delete, truncate, references, trigger on table public.email_verifications to anon, authenticated;
create policy "Service role only" on public.email_verifications for all to public using (false);

select 'LC05_PRODUCTION_DRIFT_FIXTURE=READY' as result;

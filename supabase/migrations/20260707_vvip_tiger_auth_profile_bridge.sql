-- VVIP TIGER Auth Profile Bridge
-- Safe migration: adds Clerk bridge fields to public.profiles without deleting old data.

alter table public.profiles add column if not exists clerk_user_id text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists trial_start_at timestamptz;
alter table public.profiles add column if not exists trial_end_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_clerk_user_id_unique_idx
on public.profiles (clerk_user_id)
where clerk_user_id is not null;

create index if not exists profiles_email_idx
on public.profiles (email);

create index if not exists profiles_account_status_idx
on public.profiles (account_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_account_status_check
    check (account_status in ('active', 'pending', 'suspended', 'closed'));
  end if;
end $$;

create or replace function public.set_vvip_tiger_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_vvip_tiger_updated_at on public.profiles;

create trigger profiles_set_vvip_tiger_updated_at
before update on public.profiles
for each row
execute function public.set_vvip_tiger_updated_at();

comment on column public.profiles.clerk_user_id is 'VVIP TIGER Clerk user id bridge.';
comment on column public.profiles.account_status is 'VVIP TIGER account status.';
comment on column public.profiles.trial_start_at is 'VVIP TIGER free trial start date.';
comment on column public.profiles.trial_end_at is 'VVIP TIGER free trial end date.';

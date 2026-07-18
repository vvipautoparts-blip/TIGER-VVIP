-- Bootstrap the legacy OTP table before historical OTP policy migrations.
-- Schema creation only: this file does not authorize remote execution
-- and does not create, widen, or approve any access policy.

create table if not exists public.otp_codes (
  id bigserial primary key,
  phone text not null,
  code text not null,
  purpose text not null default 'registration',
  expires_at timestamp with time zone not null,
  consumed boolean not null default false,
  created_at timestamp with time zone not null default now()
);

-- VVIP TIGER OTP direct-client lockdown.
--
-- OTP records contain security-sensitive verification material.
-- Browser roles must not read, create, or mutate these rows directly.
-- Approved OTP operations must use a separately reviewed server-side workflow.
--
-- This migration deletes no rows and creates no client-access policy.

begin;

alter table public.otp_codes
enable row level security;

drop policy if exists "Users can manage otp by phone"
on public.otp_codes;

drop policy if exists "otp_select_open"
on public.otp_codes;

drop policy if exists "otp_insert_open"
on public.otp_codes;

drop policy if exists "otp_update_open"
on public.otp_codes;

revoke all privileges
on table public.otp_codes
from anon, authenticated;

revoke all privileges
on sequence public.otp_codes_id_seq
from anon, authenticated;

commit;

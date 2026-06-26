alter table public.otp_codes enable row level security;

drop policy if exists "Users can manage otp by phone" on public.otp_codes;
drop policy if exists "otp_select_open" on public.otp_codes;
drop policy if exists "otp_insert_open" on public.otp_codes;
drop policy if exists "otp_update_open" on public.otp_codes;

create policy "otp_select_open"
on public.otp_codes
for select
to anon, authenticated
using (true);

create policy "otp_insert_open"
on public.otp_codes
for insert
to anon, authenticated
with check (true);

create policy "otp_update_open"
on public.otp_codes
for update
to anon, authenticated
using (true)
with check (true);

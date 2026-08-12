-- VVIP TIGER LC-07 legacy OTP sequence isolation.
--
-- LC-05 already isolates legacy credential tables when they exist. This
-- forward-only follow-up closes the remaining sequence ACL surface without
-- synthesizing legacy objects in clean environments.
--
-- No table, sequence, policy, user data, or modern phone OTP object is created
-- or mutated by this migration.

begin;

do $legacy_otp_sequence_isolation$
begin
  if to_regclass('public.otp_codes_id_seq') is null then
    null;
  else
    execute 'revoke all privileges on sequence public.otp_codes_id_seq from public, anon, authenticated';
  end if;
end
$legacy_otp_sequence_isolation$;

commit;

\set ON_ERROR_STOP on

do $canonical_absence$
begin
  if to_regclass('public.otp_codes') is not null then
    raise exception 'LC05_CANONICAL_OTP_CODES_SYNTHESIZED';
  end if;
  if to_regclass('public.email_verifications') is not null then
    raise exception 'LC05_CANONICAL_EMAIL_VERIFICATIONS_SYNTHESIZED';
  end if;
  if to_regclass('public.phone_otp_challenges') is null then
    raise exception 'LC05_MODERN_PHONE_OTP_STORE_MISSING';
  end if;
end
$canonical_absence$;

select 'LC05_CANONICAL_NO_SYNTHESIS=PASS' as result;

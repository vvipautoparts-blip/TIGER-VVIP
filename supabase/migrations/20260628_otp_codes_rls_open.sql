-- Legacy OTP compatibility and security hardening migration.
--
-- The current migration chain does not create public.otp_codes, so its absence
-- on a clean database is valid. Repository audits also document mixed current
-- authentication paths: Clerk is the V2.0 target identity/session provider,
-- but runtime unification is not complete. No active runtime code depends on
-- this legacy table.
--
-- Behaviour:
-- 1. If the legacy table does not exist, safely skip without creating it.
-- 2. If it exists in an older environment, enable RLS, remove the known
--    permissive policies, and revoke public client access.

DO $$
BEGIN
  IF to_regclass('public.otp_codes') IS NULL THEN
    RAISE NOTICE
      'Skipping legacy otp_codes hardening: public.otp_codes does not exist.';
  ELSE
    EXECUTE
      'ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY';

    EXECUTE
      'DROP POLICY IF EXISTS "Users can manage otp by phone"
       ON public.otp_codes';

    EXECUTE
      'DROP POLICY IF EXISTS otp_select_open
       ON public.otp_codes';

    EXECUTE
      'DROP POLICY IF EXISTS otp_insert_open
       ON public.otp_codes';

    EXECUTE
      'DROP POLICY IF EXISTS otp_update_open
       ON public.otp_codes';

    EXECUTE
      'REVOKE ALL PRIVILEGES ON TABLE public.otp_codes FROM PUBLIC';

    EXECUTE
      'REVOKE ALL PRIVILEGES ON TABLE public.otp_codes
       FROM anon, authenticated';

    RAISE NOTICE
      'Legacy otp_codes table secured and permissive policies removed.';
  END IF;
END
$$;

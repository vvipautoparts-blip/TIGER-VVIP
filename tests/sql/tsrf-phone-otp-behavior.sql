\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.phone_otp_challenges', 'SELECT')
     OR has_table_privilege('authenticated', 'public.phone_otp_challenges', 'SELECT') THEN
    RAISE EXCEPTION 'browser roles must not read phone_otp_challenges';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.issue_phone_otp_challenge(uuid,text,text,text,timestamptz,timestamptz,integer)',
       'EXECUTE'
     ) OR has_function_privilege(
       'authenticated',
       'public.consume_phone_otp_challenge(uuid,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'browser roles must not execute OTP authority RPCs';
  END IF;
END;
$$;

SET LOCAL ROLE service_role;

-- Happy path + single use.
SELECT public.issue_phone_otp_challenge(
  '10000000-0000-4000-8000-000000000001'::uuid,
  repeat('a', 64),
  'login',
  repeat('1', 64),
  now() + interval '10 minutes',
  now() + interval '60 seconds',
  5
);

DO $$
BEGIN
  IF NOT public.mark_phone_otp_delivery(
    '10000000-0000-4000-8000-000000000001'::uuid,
    true
  ) THEN
    RAISE EXCEPTION 'delivery transition must succeed exactly once';
  END IF;

  IF public.consume_phone_otp_challenge(
    '10000000-0000-4000-8000-000000000001'::uuid,
    repeat('a', 64),
    'login',
    repeat('1', 64)
  ) <> 'VERIFIED' THEN
    RAISE EXCEPTION 'valid delivered challenge must verify';
  END IF;

  IF public.consume_phone_otp_challenge(
    '10000000-0000-4000-8000-000000000001'::uuid,
    repeat('a', 64),
    'login',
    repeat('1', 64)
  ) <> 'INVALID' THEN
    RAISE EXCEPTION 'consumed challenge replay must be rejected';
  END IF;
END;
$$;

-- Cooldown remains authoritative even after successful consumption.
DO $$
BEGIN
  BEGIN
    PERFORM public.issue_phone_otp_challenge(
      '10000000-0000-4000-8000-000000000002'::uuid,
      repeat('a', 64),
      'login',
      repeat('2', 64),
      now() + interval '10 minutes',
      now() + interval '60 seconds',
      5
    );
    RAISE EXCEPTION 'expected OTP_COOLDOWN';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'OTP_COOLDOWN' THEN
        RAISE;
      END IF;
  END;
END;
$$;

-- Pending delivery is never verifiable, even with the correct digest.
SELECT public.issue_phone_otp_challenge(
  '20000000-0000-4000-8000-000000000001'::uuid,
  repeat('e', 64),
  'delivery_gate',
  repeat('3', 64),
  now() + interval '10 minutes',
  now() + interval '60 seconds',
  5
);

DO $$
DECLARE
  result text;
  attempts integer;
BEGIN
  result := public.consume_phone_otp_challenge(
    '20000000-0000-4000-8000-000000000001'::uuid,
    repeat('e', 64),
    'delivery_gate',
    repeat('3', 64)
  );
  IF result <> 'INVALID' THEN
    RAISE EXCEPTION 'pending delivery must not verify';
  END IF;

  SELECT attempt_count INTO attempts
  FROM public.phone_otp_challenges
  WHERE id = '20000000-0000-4000-8000-000000000001'::uuid;

  IF attempts <> 0 THEN
    RAISE EXCEPTION 'delivery-gated rejection must not burn a code attempt';
  END IF;
END;
$$;

-- Wrong attempts atomically lock the challenge on the configured maximum.
SELECT public.issue_phone_otp_challenge(
  '30000000-0000-4000-8000-000000000001'::uuid,
  repeat('d', 64),
  'attempt_lock',
  repeat('4', 64),
  now() + interval '10 minutes',
  now() + interval '60 seconds',
  5
);
SELECT public.mark_phone_otp_delivery(
  '30000000-0000-4000-8000-000000000001'::uuid,
  true
);

DO $$
DECLARE
  i integer;
  result text;
  attempts integer;
  consumed timestamptz;
BEGIN
  FOR i IN 1..5 LOOP
    result := public.consume_phone_otp_challenge(
      '30000000-0000-4000-8000-000000000001'::uuid,
      repeat('d', 64),
      'attempt_lock',
      repeat('9', 64)
    );
    IF result <> 'INVALID' THEN
      RAISE EXCEPTION 'wrong code attempt % must be invalid', i;
    END IF;
  END LOOP;

  SELECT attempt_count, consumed_at
    INTO attempts, consumed
  FROM public.phone_otp_challenges
  WHERE id = '30000000-0000-4000-8000-000000000001'::uuid;

  IF attempts <> 5 OR consumed IS NULL THEN
    RAISE EXCEPTION 'max attempts must consume/lock the challenge';
  END IF;

  IF public.consume_phone_otp_challenge(
    '30000000-0000-4000-8000-000000000001'::uuid,
    repeat('d', 64),
    'attempt_lock',
    repeat('4', 64)
  ) <> 'INVALID' THEN
    RAISE EXCEPTION 'correct code after lockout must remain invalid';
  END IF;
END;
$$;

-- Hourly issuance cap is enforced under the same phone+purpose authority key.
INSERT INTO public.phone_otp_challenges (
  id, phone_hash, purpose, code_digest, created_at, expires_at,
  cooldown_until, attempt_count, max_attempts, consumed_at, delivery_status
)
SELECT
  ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  repeat('c', 64),
  'rate_limit',
  repeat('5', 64),
  now() - interval '10 minutes',
  now() + interval '10 minutes',
  now() - interval '1 second',
  0,
  5,
  now() - interval '5 minutes',
  'delivered'
FROM generate_series(1, 5) AS n;

DO $$
BEGIN
  BEGIN
    PERFORM public.issue_phone_otp_challenge(
      '40000000-0000-4000-8000-000000000099'::uuid,
      repeat('c', 64),
      'rate_limit',
      repeat('6', 64),
      now() + interval '10 minutes',
      now() + interval '60 seconds',
      5
    );
    RAISE EXCEPTION 'expected OTP_RATE_LIMITED';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'OTP_RATE_LIMITED' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;

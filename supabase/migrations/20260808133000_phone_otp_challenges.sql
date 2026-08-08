BEGIN;

CREATE TABLE public.phone_otp_challenges (
  id uuid PRIMARY KEY,
  phone_hash text NOT NULL,
  purpose text NOT NULL,
  code_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  cooldown_until timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending',
  CONSTRAINT phone_otp_challenges_purpose_check
    CHECK (purpose ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT phone_otp_challenges_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT phone_otp_challenges_max_attempts_check
    CHECK (max_attempts BETWEEN 1 AND 10),
  CONSTRAINT phone_otp_challenges_expiry_check
    CHECK (expires_at > created_at),
  CONSTRAINT phone_otp_challenges_cooldown_check
    CHECK (cooldown_until >= created_at),
  CONSTRAINT phone_otp_challenges_delivery_status_check
    CHECK (delivery_status IN ('pending', 'delivered', 'failed'))
);

ALTER TABLE public.phone_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otp_challenges FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.phone_otp_challenges FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.phone_otp_challenges FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.phone_otp_challenges TO service_role;

CREATE INDEX phone_otp_challenges_rate_idx
  ON public.phone_otp_challenges (phone_hash, purpose, created_at DESC);

CREATE INDEX phone_otp_challenges_active_idx
  ON public.phone_otp_challenges (id, consumed_at, expires_at, delivery_status);

CREATE OR REPLACE FUNCTION public.issue_phone_otp_challenge(
  p_challenge_id uuid,
  p_phone_hash text,
  p_purpose text,
  p_code_digest text,
  p_expires_at timestamptz,
  p_cooldown_until timestamptz,
  p_max_attempts integer DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF p_challenge_id IS NULL
     OR p_phone_hash IS NULL
     OR length(p_phone_hash) < 32
     OR p_purpose IS NULL
     OR p_purpose !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
     OR p_code_digest IS NULL
     OR length(p_code_digest) < 32
     OR p_expires_at <= now()
     OR p_cooldown_until < now()
     OR p_max_attempts < 1
     OR p_max_attempts > 10 THEN
    RAISE EXCEPTION 'OTP_INVALID_ISSUE_REQUEST';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_phone_hash || ':' || p_purpose, 0));

  IF EXISTS (
    SELECT 1
    FROM public.phone_otp_challenges
    WHERE phone_hash = p_phone_hash
      AND purpose = p_purpose
      AND consumed_at IS NULL
      AND cooldown_until > now()
  ) THEN
    RAISE EXCEPTION 'OTP_COOLDOWN';
  END IF;

  SELECT count(*)::integer
    INTO recent_count
  FROM public.phone_otp_challenges
  WHERE phone_hash = p_phone_hash
    AND purpose = p_purpose
    AND created_at >= now() - interval '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'OTP_RATE_LIMITED';
  END IF;

  UPDATE public.phone_otp_challenges
  SET consumed_at = now()
  WHERE phone_hash = p_phone_hash
    AND purpose = p_purpose
    AND consumed_at IS NULL;

  INSERT INTO public.phone_otp_challenges (
    id,
    phone_hash,
    purpose,
    code_digest,
    expires_at,
    cooldown_until,
    max_attempts,
    delivery_status
  )
  VALUES (
    p_challenge_id,
    p_phone_hash,
    p_purpose,
    p_code_digest,
    p_expires_at,
    p_cooldown_until,
    p_max_attempts,
    'pending'
  );

  RETURN p_challenge_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_phone_otp_delivery(
  p_challenge_id uuid,
  p_delivered boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.phone_otp_challenges
  SET delivery_status = CASE WHEN p_delivered THEN 'delivered' ELSE 'failed' END,
      consumed_at = CASE WHEN p_delivered THEN consumed_at ELSE COALESCE(consumed_at, now()) END
  WHERE id = p_challenge_id
    AND consumed_at IS NULL
    AND delivery_status = 'pending';

  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_phone_otp_challenge(
  p_challenge_id uuid,
  p_phone_hash text,
  p_purpose text,
  p_code_digest text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  challenge public.phone_otp_challenges%ROWTYPE;
  next_attempt integer;
BEGIN
  SELECT *
    INTO challenge
  FROM public.phone_otp_challenges
  WHERE id = p_challenge_id
    AND phone_hash = p_phone_hash
    AND purpose = p_purpose
  FOR UPDATE;

  IF NOT FOUND
     OR challenge.consumed_at IS NOT NULL
     OR challenge.expires_at <= now()
     OR challenge.delivery_status <> 'delivered'
     OR challenge.attempt_count >= challenge.max_attempts THEN
    RETURN 'INVALID';
  END IF;

  IF challenge.code_digest <> p_code_digest THEN
    next_attempt := challenge.attempt_count + 1;

    UPDATE public.phone_otp_challenges
    SET attempt_count = next_attempt,
        consumed_at = CASE
          WHEN next_attempt >= challenge.max_attempts THEN now()
          ELSE consumed_at
        END
    WHERE id = p_challenge_id
      AND consumed_at IS NULL;

    RETURN 'INVALID';
  END IF;

  UPDATE public.phone_otp_challenges
  SET consumed_at = now()
  WHERE id = p_challenge_id
    AND consumed_at IS NULL;

  RETURN 'VERIFIED';
END;
$$;

REVOKE ALL ON FUNCTION public.issue_phone_otp_challenge(
  uuid, text, text, text, timestamptz, timestamptz, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_phone_otp_challenge(
  uuid, text, text, text, timestamptz, timestamptz, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.mark_phone_otp_delivery(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_phone_otp_delivery(uuid, boolean)
  TO service_role;

REVOKE ALL ON FUNCTION public.consume_phone_otp_challenge(
  uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_phone_otp_challenge(
  uuid, text, text, text
) TO service_role;

COMMIT;

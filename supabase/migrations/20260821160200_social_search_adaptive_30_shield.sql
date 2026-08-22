-- VVIP TIGER P0-C Adaptive 30 Shield.
-- Forward-only repository migration. No remote/Production application is performed here.
-- The thirtieth accepted search starts a 30-second server-authoritative cooldown;
-- subsequent searches fail closed until the cooldown expires, then the actor resumes normally.

BEGIN;

ALTER TABLE public.vvip_social_search_budget
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz;

REVOKE ALL ON TABLE public.vvip_social_search_budget FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_search_consume_budget(
  p_actor_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_now timestamptz := statement_timestamp();
  v_window timestamptz := date_trunc('minute', v_now);
  v_existing_window timestamptz;
  v_existing_count integer;
  v_existing_blocked_until timestamptz;
  v_next_count integer;
BEGIN
  IF p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('vvip_social_search_budget:' || p_actor_profile_id::text, 0)
  );

  SELECT
    budget.window_started_at,
    budget.request_count,
    budget.blocked_until
  INTO
    v_existing_window,
    v_existing_count,
    v_existing_blocked_until
  FROM public.vvip_social_search_budget AS budget
  WHERE budget.actor_profile_id = p_actor_profile_id
  FOR UPDATE;

  IF FOUND AND v_existing_blocked_until > v_now THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  IF FOUND AND v_existing_blocked_until IS NOT NULL AND v_existing_blocked_until <= v_now THEN
    UPDATE public.vvip_social_search_budget AS budget
    SET
      window_started_at = v_window,
      request_count = 1,
      blocked_until = NULL,
      updated_at = v_now
    WHERE budget.actor_profile_id = p_actor_profile_id;
    RETURN;
  END IF;

  -- Defensive compatibility for a pre-shield row already at the historical ceiling.
  IF FOUND AND v_existing_window = v_window AND v_existing_count >= 30 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  IF FOUND AND v_existing_window = v_window THEN
    v_next_count := v_existing_count + 1;
    IF v_next_count = 30 THEN
      UPDATE public.vvip_social_search_budget AS budget
      SET
        request_count = v_next_count,
        blocked_until = v_now + interval '30 seconds',
        updated_at = v_now
      WHERE budget.actor_profile_id = p_actor_profile_id;
    ELSE
      UPDATE public.vvip_social_search_budget AS budget
      SET
        request_count = v_next_count,
        blocked_until = NULL,
        updated_at = v_now
      WHERE budget.actor_profile_id = p_actor_profile_id;
    END IF;
  ELSIF FOUND THEN
    UPDATE public.vvip_social_search_budget AS budget
    SET
      window_started_at = v_window,
      request_count = 1,
      blocked_until = NULL,
      updated_at = v_now
    WHERE budget.actor_profile_id = p_actor_profile_id;
  ELSE
    INSERT INTO public.vvip_social_search_budget (
      actor_profile_id,
      window_started_at,
      request_count,
      blocked_until,
      updated_at
    ) VALUES (
      p_actor_profile_id,
      v_window,
      1,
      NULL,
      v_now
    );
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_search_consume_budget(uuid)
  FROM PUBLIC, anon, authenticated;

COMMIT;

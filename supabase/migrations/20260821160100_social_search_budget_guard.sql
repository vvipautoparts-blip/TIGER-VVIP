-- VVIP TIGER P0-C forward-only search budget guard.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Serializes the per-profile budget so request 31 fails with the canonical opaque error
-- before the table's integrity CHECK can observe an out-of-range counter.

BEGIN;

CREATE OR REPLACE FUNCTION public.vvip_social_search_consume_budget(
  p_actor_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_window timestamptz := date_trunc('minute', statement_timestamp());
  v_existing_window timestamptz;
  v_existing_count integer;
BEGIN
  IF p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('vvip_social_search_budget:' || p_actor_profile_id::text, 0)
  );

  SELECT
    budget.window_started_at,
    budget.request_count
  INTO
    v_existing_window,
    v_existing_count
  FROM public.vvip_social_search_budget AS budget
  WHERE budget.actor_profile_id = p_actor_profile_id
  FOR UPDATE;

  IF FOUND AND v_existing_window = v_window AND v_existing_count >= 30 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  IF FOUND THEN
    UPDATE public.vvip_social_search_budget AS budget
    SET
      window_started_at = v_window,
      request_count = CASE
        WHEN v_existing_window = v_window THEN v_existing_count + 1
        ELSE 1
      END,
      updated_at = statement_timestamp()
    WHERE budget.actor_profile_id = p_actor_profile_id;
  ELSE
    INSERT INTO public.vvip_social_search_budget (
      actor_profile_id,
      window_started_at,
      request_count,
      updated_at
    ) VALUES (
      p_actor_profile_id,
      v_window,
      1,
      statement_timestamp()
    );
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_search_consume_budget(uuid)
  FROM PUBLIC, anon, authenticated;

COMMIT;

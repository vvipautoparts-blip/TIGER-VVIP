-- VVIP TIGER P0 Social account lifecycle read surface.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- The browser supplies no identity; the authenticated subject is derived inside PostgreSQL.

BEGIN;

CREATE OR REPLACE FUNCTION public.vvip_social_get_my_lifecycle_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile_id uuid;
  v_profile_state text;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  SELECT profile.profile_id, profile.profile_state
  INTO v_profile_id, v_profile_state
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'state', 'missing',
      'profile_id', NULL
    );
  END IF;

  IF v_profile_state NOT IN ('active', 'deactivated', 'deleted') THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_STATE_INVALID';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'state', v_profile_state,
    'profile_id', v_profile_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_get_my_lifecycle_state()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_get_my_lifecycle_state() TO authenticated;

COMMENT ON FUNCTION public.vvip_social_get_my_lifecycle_state() IS
  'CURRENT subject-blind Social lifecycle state for the authenticated actor; returns only state and profile UUID.';

COMMIT;

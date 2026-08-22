BEGIN;

REVOKE ALL ON TABLE public.vvip_social_profile_projection FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_deactivate_my_social_profile()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile public.vvip_social_profile_projection%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_AUTH_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor, 0));

  SELECT p.* INTO v_profile
  FROM public.vvip_social_profile_projection AS p
  WHERE p.subject = v_actor
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_NOT_FOUND';
  END IF;

  IF v_profile.profile_state = 'deleted' THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_DELETED_TERMINAL';
  END IF;

  IF v_profile.profile_state = 'active' THEN
    UPDATE public.vvip_social_profile_projection SET profile_state = 'deactivated', updated_at = statement_timestamp() WHERE subject = v_actor AND profile_state = 'active' RETURNING * INTO v_profile;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SOCIAL_PROFILE_LIFECYCLE_CONFLICT';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_deactivated',
    'profile', jsonb_build_object(
      'profile_id', v_profile.profile_id,
      'profile_state', v_profile.profile_state,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'business_name', v_profile.business_name,
      'location', v_profile.location,
      'specialization', v_profile.specialization,
      'business_description', v_profile.business_description
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_reactivate_my_social_profile()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile public.vvip_social_profile_projection%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_AUTH_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor, 0));

  SELECT p.* INTO v_profile
  FROM public.vvip_social_profile_projection AS p
  WHERE p.subject = v_actor
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_NOT_FOUND';
  END IF;

  IF v_profile.profile_state = 'deleted' THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_DELETED_TERMINAL';
  END IF;

  IF v_profile.profile_state = 'deactivated' THEN
    UPDATE public.vvip_social_profile_projection SET profile_state = 'active', updated_at = statement_timestamp() WHERE subject = v_actor AND profile_state = 'deactivated' RETURNING * INTO v_profile;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SOCIAL_PROFILE_LIFECYCLE_CONFLICT';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_active',
    'profile', jsonb_build_object(
      'profile_id', v_profile.profile_id,
      'profile_state', v_profile.profile_state,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'business_name', v_profile.business_name,
      'location', v_profile.location,
      'specialization', v_profile.specialization,
      'business_description', v_profile.business_description
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_mark_social_profile_deleted(
  p_subject text
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_profile public.vvip_social_profile_projection%ROWTYPE;
BEGIN
  IF p_subject IS NULL OR char_length(p_subject) > 133 OR p_subject !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_SUBJECT_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_subject, 0));

  UPDATE public.vvip_social_profile_projection SET profile_state = 'deleted', display_name = 'Deleted member', avatar_url = NULL, business_name = NULL, location = NULL, specialization = NULL, business_description = NULL, updated_at = statement_timestamp() WHERE subject = p_subject RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'profile_missing',
      'profile', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_deleted',
    'profile', jsonb_build_object(
      'profile_id', v_profile.profile_id,
      'profile_state', v_profile.profile_state,
      'display_name', v_profile.display_name
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_deactivate_my_social_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_deactivate_my_social_profile() FROM anon;
REVOKE ALL ON FUNCTION public.vvip_deactivate_my_social_profile() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_deactivate_my_social_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.vvip_reactivate_my_social_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_reactivate_my_social_profile() FROM anon;
REVOKE ALL ON FUNCTION public.vvip_reactivate_my_social_profile() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_reactivate_my_social_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.vvip_mark_social_profile_deleted(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_mark_social_profile_deleted(text) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_mark_social_profile_deleted(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.vvip_mark_social_profile_deleted(text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.vvip_mark_social_profile_deleted(text) TO service_role;

COMMIT;

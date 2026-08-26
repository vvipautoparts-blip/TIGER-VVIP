BEGIN;

REVOKE ALL ON TABLE public.vvip_social_profile_projection FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_get_my_social_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile public.vvip_social_profile_projection%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_AUTH_REQUIRED';
  END IF;

  SELECT p.* INTO v_profile
  FROM public.vvip_social_profile_projection AS p
  WHERE p.subject = v_actor
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'profile_missing',
      'profile', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_loaded',
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

CREATE OR REPLACE FUNCTION public.vvip_upsert_my_social_profile(
  p_display_name text,
  p_avatar_url text,
  p_business_name text,
  p_location text,
  p_specialization text,
  p_business_description text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_state text;
  v_profile_id uuid;
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_avatar_url text := nullif(btrim(coalesce(p_avatar_url, '')), '');
  v_business_name text := nullif(btrim(coalesce(p_business_name, '')), '');
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_specialization text := nullif(btrim(coalesce(p_specialization, '')), '');
  v_business_description text := nullif(btrim(coalesce(p_business_description, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_AUTH_REQUIRED';
  END IF;

  IF char_length(v_display_name) < 1 OR char_length(v_display_name) > 160 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_DISPLAY_NAME_INVALID';
  END IF;
  IF coalesce(char_length(v_avatar_url), 0) > 2048 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_AVATAR_URL_INVALID';
  END IF;
  IF coalesce(char_length(v_business_name), 0) > 200 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_BUSINESS_NAME_INVALID';
  END IF;
  IF coalesce(char_length(v_location), 0) > 200 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_LOCATION_INVALID';
  END IF;
  IF coalesce(char_length(v_specialization), 0) > 200 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_SPECIALIZATION_INVALID';
  END IF;
  IF coalesce(char_length(v_business_description), 0) > 2000 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_DESCRIPTION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor, 0));

  SELECT p.profile_state, p.profile_id
  INTO v_state, v_profile_id
  FROM public.vvip_social_profile_projection AS p
  WHERE p.subject = v_actor
  LIMIT 1;

  IF FOUND AND v_state <> 'active' THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_MUTATION_DISABLED';
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.vvip_social_profile_projection (
      subject,
      profile_state,
      display_name,
      avatar_url,
      business_name,
      location,
      specialization,
      business_description
    ) VALUES (
      v_actor,
      'active',
      v_display_name,
      v_avatar_url,
      v_business_name,
      v_location,
      v_specialization,
      v_business_description
    )
    RETURNING profile_id INTO v_profile_id;
  ELSE
    UPDATE public.vvip_social_profile_projection SET display_name = v_display_name, avatar_url = v_avatar_url, business_name = v_business_name, location = v_location, specialization = v_specialization, business_description = v_business_description, updated_at = statement_timestamp() WHERE subject = v_actor AND profile_state = 'active' RETURNING profile_id INTO v_profile_id;

    IF v_profile_id IS NULL THEN
      RAISE EXCEPTION 'SOCIAL_PROFILE_MUTATION_DISABLED';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_saved',
    'profile', (
      SELECT jsonb_build_object(
        'profile_id', p.profile_id,
        'profile_state', p.profile_state,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'business_name', p.business_name,
        'location', p.location,
        'specialization', p.specialization,
        'business_description', p.business_description
      )
      FROM public.vvip_social_profile_projection AS p
      WHERE p.profile_id = v_profile_id
      LIMIT 1
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_get_my_social_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_get_my_social_profile() FROM anon;
REVOKE ALL ON FUNCTION public.vvip_get_my_social_profile() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_get_my_social_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.vvip_upsert_my_social_profile(text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_upsert_my_social_profile(text,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_upsert_my_social_profile(text,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_upsert_my_social_profile(text,text,text,text,text,text) TO authenticated;

COMMIT;

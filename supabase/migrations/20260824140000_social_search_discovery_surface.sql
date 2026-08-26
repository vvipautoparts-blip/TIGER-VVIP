-- VVIP TIGER P0 Social Search and Discovery surface.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- Browser inputs are query/limit only; identity and visibility are resolved inside PostgreSQL.

BEGIN;

CREATE OR REPLACE FUNCTION public.vvip_social_search_discovery(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_query text := lower(btrim(p_query));
  v_profiles jsonb := '[]'::jsonb;
  v_posts jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_query IS NULL OR char_length(v_query) < 2 OR char_length(v_query) > 100 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_QUERY_INVALID';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 25 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_LIMIT_INVALID';
  END IF;

  SELECT coalesce(
    jsonb_agg(candidate.item ORDER BY candidate.match_rank, candidate.display_name, candidate.profile_id),
    '[]'::jsonb
  )
  INTO v_profiles
  FROM (
    SELECT
      profile.profile_id,
      profile.display_name,
      CASE
        WHEN lower(profile.display_name) = v_query THEN 0
        WHEN position(v_query IN lower(profile.display_name)) = 1 THEN 1
        ELSE 2
      END AS match_rank,
      jsonb_build_object(
        'profile_id', profile.profile_id,
        'display_name', profile.display_name,
        'avatar_url', profile.avatar_url,
        'business_name', profile.business_name,
        'location', profile.location,
        'specialization', profile.specialization,
        'viewer_is_following', EXISTS (
          SELECT 1
          FROM public.vvip_social_follows AS follow_row
          WHERE follow_row.follower_subject = v_actor
            AND follow_row.followee_subject = profile.subject
        )
      ) AS item
    FROM public.vvip_social_profile_projection AS profile
    WHERE profile.profile_state = 'active'
      AND profile.subject <> v_actor
      AND NOT public.vvip_social_is_blocked_pair(v_actor, profile.subject)
      AND position(
        v_query IN lower(concat_ws(
          ' ', profile.display_name, profile.business_name,
          profile.location, profile.specialization
        ))
      ) > 0
    ORDER BY match_rank, profile.display_name, profile.profile_id
    LIMIT p_limit
  ) AS candidate;

  SELECT coalesce(
    jsonb_agg(candidate.item ORDER BY candidate.created_at DESC, candidate.post_id DESC),
    '[]'::jsonb
  )
  INTO v_posts
  FROM (
    SELECT
      post.post_id,
      post.created_at,
      jsonb_build_object(
        'post_id', post.post_id,
        'author_profile_id', CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
        'author_display_name', CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
        'author_avatar_url', CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
        'author_available', coalesce(profile.profile_state = 'active', false),
        'body', post.body,
        'audience', post.audience,
        'created_at', post.created_at,
        'updated_at', post.updated_at
      ) AS item
    FROM public.vvip_social_posts AS post
    LEFT JOIN public.vvip_social_profile_projection AS profile
      ON profile.subject = post.author_subject
    WHERE position(v_query IN lower(post.body)) > 0
      AND public.vvip_social_can_view_post(post.post_id, v_actor)
    ORDER BY post.created_at DESC, post.post_id DESC
    LIMIT p_limit
  ) AS candidate;

  RETURN jsonb_build_object(
    'ok', true,
    'query', v_query,
    'profiles', v_profiles,
    'posts', v_posts
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_discover_profiles(
  p_limit integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profiles jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 25 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_LIMIT_INVALID';
  END IF;

  SELECT coalesce(
    jsonb_agg(candidate.item ORDER BY candidate.viewer_is_following, candidate.follower_count DESC, candidate.created_at DESC, candidate.profile_id),
    '[]'::jsonb
  )
  INTO v_profiles
  FROM (
    SELECT
      profile.profile_id,
      profile.created_at,
      EXISTS (
        SELECT 1
        FROM public.vvip_social_follows AS viewer_follow
        WHERE viewer_follow.follower_subject = v_actor
          AND viewer_follow.followee_subject = profile.subject
      ) AS viewer_is_following,
      (
        SELECT count(*)
        FROM public.vvip_social_follows AS follower
        JOIN public.vvip_social_profile_projection AS active_follower
          ON active_follower.subject = follower.follower_subject
         AND active_follower.profile_state = 'active'
        WHERE follower.followee_subject = profile.subject
      ) AS follower_count,
      jsonb_build_object(
        'profile_id', profile.profile_id,
        'display_name', profile.display_name,
        'avatar_url', profile.avatar_url,
        'business_name', profile.business_name,
        'location', profile.location,
        'specialization', profile.specialization,
        'viewer_is_following', EXISTS (
          SELECT 1
          FROM public.vvip_social_follows AS viewer_follow
          WHERE viewer_follow.follower_subject = v_actor
            AND viewer_follow.followee_subject = profile.subject
        )
      ) AS item
    FROM public.vvip_social_profile_projection AS profile
    WHERE profile.profile_state = 'active'
      AND profile.subject <> v_actor
      AND NOT public.vvip_social_is_blocked_pair(v_actor, profile.subject)
    ORDER BY viewer_is_following, follower_count DESC, profile.created_at DESC, profile.profile_id
    LIMIT p_limit
  ) AS candidate;

  RETURN jsonb_build_object('ok', true, 'profiles', v_profiles);
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_search_discovery(text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_discover_profiles(integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_search_discovery(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_discover_profiles(integer) TO authenticated;

COMMENT ON FUNCTION public.vvip_social_search_discovery(text, integer) IS
  'CURRENT subject-blind bounded Social people/content search; each profile and post result is lifecycle, block, and visibility authorized.';
COMMENT ON FUNCTION public.vvip_social_discover_profiles(integer) IS
  'CURRENT subject-blind bounded Social profile discovery; inactive, self, and blocked profiles are excluded.';

COMMIT;

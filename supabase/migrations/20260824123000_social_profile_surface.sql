-- VVIP TIGER P0 Profile surface and actor-bound timeline.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- Browser payloads expose safe profile UUID presentation only; authorization subjects stay inside PostgreSQL.

BEGIN;

CREATE INDEX IF NOT EXISTS vvip_social_posts_profile_timeline_idx
  ON public.vvip_social_posts (author_subject, created_at DESC, post_id DESC);

CREATE OR REPLACE FUNCTION public.vvip_get_public_profile(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile public.vvip_social_profile_projection%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT profile.*
  INTO v_profile
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND
     OR (
       v_profile.subject <> v_actor
       AND public.vvip_social_is_blocked_pair(v_actor, v_profile.subject)
     ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile_id', v_profile.profile_id,
    'display_name', v_profile.display_name,
    'avatar_url', v_profile.avatar_url,
    'business_name', v_profile.business_name,
    'location', v_profile.location,
    'specialization', v_profile.specialization,
    'business_description', v_profile.business_description
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_get_public_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_get_public_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_get_profile_surface(
  p_profile_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_profile_id uuid;
  v_target public.vvip_social_profile_projection%ROWTYPE;
  v_is_owner boolean := false;
  v_is_friend boolean := false;
  v_friends_count bigint := 0;
  v_followers_count bigint := 0;
  v_following_count bigint := 0;
  v_posts_count bigint := 0;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT profile.profile_id
  INTO v_actor_profile_id
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT profile.*
  INTO v_target
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = coalesce(p_profile_id, v_actor_profile_id)
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND
     OR (
       v_target.subject <> v_actor
       AND public.vvip_social_is_blocked_pair(v_actor, v_target.subject)
     ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'profile_unavailable',
      'profile', NULL
    );
  END IF;

  v_is_owner := v_target.subject = v_actor;

  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.vvip_social_relationships AS relationship
      WHERE relationship.relationship_state = 'friends'
        AND relationship.subject_low = least(v_actor, v_target.subject)
        AND relationship.subject_high = greatest(v_actor, v_target.subject)
    ) INTO v_is_friend;
  END IF;

  SELECT count(*)
  INTO v_friends_count
  FROM public.vvip_social_relationships AS relationship
  JOIN public.vvip_social_profile_projection AS friend
    ON friend.subject = CASE
      WHEN relationship.subject_low = v_target.subject THEN relationship.subject_high
      ELSE relationship.subject_low
    END
    AND friend.profile_state = 'active'
  WHERE relationship.relationship_state = 'friends'
    AND v_target.subject IN (relationship.subject_low, relationship.subject_high);

  SELECT count(*)
  INTO v_followers_count
  FROM public.vvip_social_follows AS follow_row
  JOIN public.vvip_social_profile_projection AS follower
    ON follower.subject = follow_row.follower_subject
    AND follower.profile_state = 'active'
  WHERE follow_row.followee_subject = v_target.subject;

  SELECT count(*)
  INTO v_following_count
  FROM public.vvip_social_follows AS follow_row
  JOIN public.vvip_social_profile_projection AS followee
    ON followee.subject = follow_row.followee_subject
    AND followee.profile_state = 'active'
  WHERE follow_row.follower_subject = v_target.subject;

  SELECT count(*)
  INTO v_posts_count
  FROM public.vvip_social_posts AS post
  WHERE post.author_subject = v_target.subject
    AND public.vvip_social_can_view_post(post.post_id, v_actor);

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'profile_loaded',
    'profile', jsonb_build_object(
      'profile_id', v_target.profile_id,
      'display_name', v_target.display_name,
      'avatar_url', v_target.avatar_url,
      'business_name', v_target.business_name,
      'location', v_target.location,
      'specialization', v_target.specialization,
      'business_description', v_target.business_description,
      'viewer_is_owner', v_is_owner,
      'friends_count', v_friends_count,
      'followers_count', v_followers_count,
      'following_count', v_following_count,
      'posts_count', v_posts_count,
      'is_friend', CASE WHEN v_is_owner THEN false ELSE v_is_friend END,
      'can_message', CASE WHEN v_is_owner THEN false ELSE v_is_friend END
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_list_profile_posts(
  p_profile_id uuid,
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_profile_id uuid;
  v_target_subject text;
  v_cursor jsonb;
  v_cursor_version integer;
  v_cursor_kind text;
  v_cursor_actor_profile_id uuid;
  v_cursor_target_profile_id uuid;
  v_before_created_at timestamptz;
  v_before_post_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_last jsonb;
  v_next_cursor text := NULL;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_TARGET_REQUIRED';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_TIMELINE_LIMIT_INVALID';
  END IF;

  SELECT profile.profile_id
  INTO v_actor_profile_id
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT profile.subject
  INTO v_target_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND
     OR (
       v_target_subject <> v_actor
       AND public.vvip_social_is_blocked_pair(v_actor, v_target_subject)
     ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'items', '[]'::jsonb,
      'next_cursor', NULL
    );
  END IF;

  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := public.vvip_gate5_cursor_decode(p_cursor);

      IF NOT (v_cursor ? 'v')
         OR NOT (v_cursor ? 'kind')
         OR NOT (v_cursor ? 'actor_profile_id')
         OR NOT (v_cursor ? 'target_profile_id')
         OR NOT (v_cursor ? 'created_at')
         OR NOT (v_cursor ? 'id') THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;

      v_cursor_version := (v_cursor ->> 'v')::integer;
      v_cursor_kind := v_cursor ->> 'kind';
      v_cursor_actor_profile_id := (v_cursor ->> 'actor_profile_id')::uuid;
      v_cursor_target_profile_id := (v_cursor ->> 'target_profile_id')::uuid;
      v_before_created_at := (v_cursor ->> 'created_at')::timestamptz;
      v_before_post_id := (v_cursor ->> 'id')::uuid;

      IF v_cursor_version <> 2
         OR v_cursor_kind <> 'social_profile_timeline'
         OR v_cursor_actor_profile_id IS NULL
         OR v_cursor_target_profile_id IS NULL
         OR v_before_created_at IS NULL
         OR v_before_post_id IS NULL THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
    END;

    IF v_cursor_actor_profile_id <> v_actor_profile_id
       OR v_cursor_target_profile_id <> p_profile_id THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT coalesce(
    jsonb_agg(timeline_row.item ORDER BY timeline_row.created_at DESC, timeline_row.post_id DESC),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      post.post_id,
      post.created_at,
      jsonb_build_object(
        'post_id', post.post_id,
        'author_profile_id', p_profile_id,
        'author_display_name', target.display_name,
        'author_avatar_url', target.avatar_url,
        'author_available', true,
        'body', post.body,
        'audience', post.audience,
        'created_at', post.created_at,
        'updated_at', post.updated_at
      ) AS item
    FROM public.vvip_social_posts AS post
    JOIN public.vvip_social_profile_projection AS target
      ON target.subject = post.author_subject
      AND target.profile_id = p_profile_id
      AND target.profile_state = 'active'
    WHERE post.author_subject = v_target_subject
      AND public.vvip_social_can_view_post(post.post_id, v_actor)
      AND (
        p_cursor IS NULL
        OR post.created_at < v_before_created_at
        OR (
          post.created_at = v_before_created_at
          AND post.post_id < v_before_post_id
        )
      )
    ORDER BY post.created_at DESC, post.post_id DESC
    LIMIT (p_limit + 1)
  ) AS timeline_row;

  v_total := jsonb_array_length(v_rows);
  IF v_total > p_limit THEN
    v_items := v_rows - p_limit;
  ELSE
    v_items := v_rows;
  END IF;

  IF v_total > p_limit AND jsonb_array_length(v_items) > 0 THEN
    v_last := v_items -> (jsonb_array_length(v_items) - 1);
    v_next_cursor := public.vvip_gate5_cursor_encode(
      jsonb_build_object(
        'v', 2,
        'kind', 'social_profile_timeline',
        'actor_profile_id', v_actor_profile_id,
        'target_profile_id', p_profile_id,
        'created_at', v_last ->> 'created_at',
        'id', v_last ->> 'post_id'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'items', v_items,
    'next_cursor', v_next_cursor
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_get_profile_surface(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_list_profile_posts(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_get_profile_surface(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_list_profile_posts(uuid, text, integer) TO authenticated;

COMMENT ON FUNCTION public.vvip_social_get_profile_surface(uuid) IS
  'CURRENT subject-blind P0 Profile surface with block, lifecycle, viewer capability, and safe aggregate enforcement.';
COMMENT ON FUNCTION public.vvip_social_list_profile_posts(uuid, text, integer) IS
  'CURRENT actor-and-target-bound P0 Profile timeline; every page rechecks current post visibility and block authority.';

COMMIT;

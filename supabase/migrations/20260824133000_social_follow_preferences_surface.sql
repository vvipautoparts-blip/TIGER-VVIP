-- VVIP TIGER P0 Follow and feed-preference convergence.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- Browser contracts use profile UUIDs; Clerk subjects remain internal authorization identifiers.

BEGIN;

CREATE TABLE public.vvip_social_feed_preferences (
  preference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_subject text NOT NULL
    CHECK (actor_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  target_subject text NOT NULL
    CHECK (target_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  muted boolean NOT NULL DEFAULT false,
  snoozed_until timestamptz,
  rank_mode text NOT NULL DEFAULT 'normal'
    CHECK (rank_mode IN ('normal', 'prefer', 'deprioritize')),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (actor_subject <> target_subject),
  UNIQUE (actor_subject, target_subject)
);

CREATE INDEX vvip_social_feed_preferences_actor_idx
  ON public.vvip_social_feed_preferences (actor_subject, updated_at DESC, target_subject);

ALTER TABLE public.vvip_social_feed_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_feed_preferences FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_feed_preferences FROM PUBLIC, anon, authenticated;

-- Retire browser execution of the historical subject-input follow surface. The
-- functions stay present only so old migrations remain forward-replayable.
REVOKE ALL ON FUNCTION public.vvip_social_follow_state(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_follow_user(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_unfollow_user(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_get_relationship_controls(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_target_subject text;
  v_following boolean := false;
  v_muted boolean := false;
  v_snoozed_until timestamptz := NULL;
  v_rank_mode text := 'normal';
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_FOLLOW_TARGET_REQUIRED';
  END IF;

  SELECT profile.subject
  INTO v_target_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  IF v_target_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_SELF_FOLLOW_DENIED';
  END IF;

  IF public.vvip_social_is_blocked_pair(v_actor, v_target_subject) THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.vvip_social_follows AS follow_row
    WHERE follow_row.follower_subject = v_actor
      AND follow_row.followee_subject = v_target_subject
  ) INTO v_following;

  SELECT
    preference.muted,
    CASE
      WHEN preference.snoozed_until > statement_timestamp() THEN preference.snoozed_until
      ELSE NULL
    END,
    preference.rank_mode
  INTO v_muted, v_snoozed_until, v_rank_mode
  FROM public.vvip_social_feed_preferences AS preference
  WHERE preference.actor_subject = v_actor
    AND preference.target_subject = v_target_subject
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'profile_id', p_profile_id,
    'following', v_following,
    'muted', coalesce(v_muted, false),
    'snoozed_until', v_snoozed_until,
    'rank_mode', coalesce(v_rank_mode, 'normal')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_follow_profile(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_target_subject text;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_FOLLOW_TARGET_REQUIRED';
  END IF;

  SELECT profile.subject
  INTO v_target_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  IF v_target_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_SELF_FOLLOW_DENIED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(least(v_actor, v_target_subject) || ':' || greatest(v_actor, v_target_subject), 0)
  );

  IF public.vvip_social_is_blocked_pair(v_actor, v_target_subject) THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.vvip_social_follows (follower_subject, followee_subject)
  VALUES (v_actor, v_target_subject)
  ON CONFLICT (follower_subject, followee_subject) DO NOTHING;

  RETURN public.vvip_social_get_relationship_controls(p_profile_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_unfollow_profile(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_target_subject text;
  v_row_count integer := 0;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_FOLLOW_TARGET_REQUIRED';
  END IF;

  SELECT profile.subject
  INTO v_target_subject
  FROM public.vvip_social_profile_projection AS profile
  JOIN public.vvip_social_follows AS follow_row
    ON follow_row.followee_subject = profile.subject
   AND follow_row.follower_subject = v_actor
  WHERE profile.profile_id = p_profile_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'profile_id', p_profile_id,
      'following', false,
      'changed', false
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(least(v_actor, v_target_subject) || ':' || greatest(v_actor, v_target_subject), 0)
  );

  DELETE FROM public.vvip_social_follows AS follow_row WHERE follow_row.follower_subject = v_actor
    AND follow_row.followee_subject = v_target_subject;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'profile_id', p_profile_id,
    'following', false,
    'changed', v_row_count > 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_list_feed_preferences()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', listed.profile_id,
        'muted', listed.muted,
        'snoozed_until', listed.snoozed_until,
        'rank_mode', listed.rank_mode
      )
      ORDER BY listed.updated_at DESC, listed.profile_id DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT
      profile.profile_id,
      preference.muted,
      CASE
        WHEN preference.snoozed_until > statement_timestamp() THEN preference.snoozed_until
        ELSE NULL
      END AS snoozed_until,
      preference.rank_mode,
      preference.updated_at
    FROM public.vvip_social_feed_preferences AS preference
    JOIN public.vvip_social_profile_projection AS profile
      ON profile.subject = preference.target_subject
     AND profile.profile_state = 'active'
    WHERE preference.actor_subject = v_actor
      AND NOT public.vvip_social_is_blocked_pair(v_actor, preference.target_subject)
    ORDER BY preference.updated_at DESC, profile.profile_id DESC
    LIMIT 500
  ) AS listed;

  RETURN jsonb_build_object(
    'ok', true,
    'items', v_items
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_set_feed_preference(
  p_profile_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_target_subject text;
  v_muted boolean := false;
  v_snoozed_until timestamptz := NULL;
  v_rank_mode text := 'normal';
  v_existing boolean := false;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_FEED_PREFERENCE_TARGET_REQUIRED';
  END IF;

  IF p_action IS NULL OR p_action NOT IN (
    'mute', 'unmute', 'snooze_24h', 'snooze_7d', 'unsnooze',
    'prefer', 'deprioritize', 'normal'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_FEED_PREFERENCE_ACTION_INVALID';
  END IF;

  SELECT profile.subject
  INTO v_target_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  IF v_target_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_SELF_PREFERENCE_DENIED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor || ':social-feed-preferences', 0));
  PERFORM pg_advisory_xact_lock(
    hashtextextended(least(v_actor, v_target_subject) || ':' || greatest(v_actor, v_target_subject), 0)
  );

  IF public.vvip_social_is_blocked_pair(v_actor, v_target_subject) THEN
    RAISE EXCEPTION 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE';
  END IF;

  SELECT preference.muted, preference.snoozed_until, preference.rank_mode, true
  INTO v_muted, v_snoozed_until, v_rank_mode, v_existing
  FROM public.vvip_social_feed_preferences AS preference
  WHERE preference.actor_subject = v_actor
    AND preference.target_subject = v_target_subject
  LIMIT 1;

  IF NOT FOUND THEN
    v_muted := false;
    v_snoozed_until := NULL;
    v_rank_mode := 'normal';
    v_existing := false;
  END IF;

  IF v_snoozed_until IS NOT NULL AND v_snoozed_until <= statement_timestamp() THEN
    v_snoozed_until := NULL;
  END IF;

  IF NOT v_existing AND (
    SELECT count(*)
    FROM public.vvip_social_feed_preferences AS preference
    WHERE preference.actor_subject = v_actor
  ) >= 500 THEN
    RAISE EXCEPTION 'SOCIAL_FEED_PREFERENCE_LIMIT_REACHED';
  END IF;

  CASE p_action
    WHEN 'mute' THEN v_muted := true;
    WHEN 'unmute' THEN v_muted := false;
    WHEN 'snooze_24h' THEN v_snoozed_until := statement_timestamp() + interval '24 hours';
    WHEN 'snooze_7d' THEN v_snoozed_until := statement_timestamp() + interval '7 days';
    WHEN 'unsnooze' THEN v_snoozed_until := NULL;
    WHEN 'prefer' THEN v_rank_mode := 'prefer';
    WHEN 'deprioritize' THEN v_rank_mode := 'deprioritize';
    WHEN 'normal' THEN v_rank_mode := 'normal';
    ELSE RAISE EXCEPTION 'SOCIAL_FEED_PREFERENCE_ACTION_INVALID';
  END CASE;

  IF NOT v_muted
     AND (v_snoozed_until IS NULL OR v_snoozed_until <= statement_timestamp())
     AND v_rank_mode = 'normal' THEN
    DELETE FROM public.vvip_social_feed_preferences AS preference WHERE preference.actor_subject = v_actor
      AND preference.target_subject = v_target_subject;
  ELSE
    INSERT INTO public.vvip_social_feed_preferences (
      actor_subject,
      target_subject,
      muted,
      snoozed_until,
      rank_mode,
      updated_at
    ) VALUES (
      v_actor,
      v_target_subject,
      v_muted,
      v_snoozed_until,
      v_rank_mode,
      statement_timestamp()
    )
    ON CONFLICT (actor_subject, target_subject) DO UPDATE SET
      muted = EXCLUDED.muted,
      snoozed_until = EXCLUDED.snoozed_until,
      rank_mode = EXCLUDED.rank_mode,
      updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN public.vvip_social_get_relationship_controls(p_profile_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_block_profile(
  p_peer_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_peer_subject text;
  v_row_count integer := 0;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_peer_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_PEER_REQUIRED';
  END IF;

  SELECT profile.subject
  INTO v_peer_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_peer_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_PEER_NOT_AVAILABLE';
  END IF;

  IF v_peer_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_SELF_DENIED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(least(v_actor, v_peer_subject) || ':' || greatest(v_actor, v_peer_subject), 0)
  );

  INSERT INTO public.vvip_social_blocks (
    blocker_subject,
    blocked_subject
  ) VALUES (
    v_actor,
    v_peer_subject
  )
  ON CONFLICT (blocker_subject, blocked_subject) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  DELETE FROM public.vvip_social_relationships AS relationship WHERE relationship.subject_low = least(v_actor, v_peer_subject)
    AND relationship.subject_high = greatest(v_actor, v_peer_subject);
  DELETE FROM public.vvip_social_follows AS follow_row WHERE (follow_row.follower_subject = v_actor AND follow_row.followee_subject = v_peer_subject)
    OR (follow_row.follower_subject = v_peer_subject AND follow_row.followee_subject = v_actor);
  DELETE FROM public.vvip_social_feed_preferences AS preference WHERE (preference.actor_subject = v_actor AND preference.target_subject = v_peer_subject)
    OR (preference.actor_subject = v_peer_subject AND preference.target_subject = v_actor);

  RETURN jsonb_build_object(
    'ok', true,
    'peer_profile_id', p_peer_profile_id,
    'blocked', true,
    'changed', v_row_count > 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_get_relationship_controls(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_follow_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_unfollow_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_list_feed_preferences()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_set_feed_preference(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_block_profile(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_get_relationship_controls(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_follow_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_unfollow_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_list_feed_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_set_feed_preference(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_block_profile(uuid) TO authenticated;

COMMENT ON TABLE public.vvip_social_feed_preferences IS
  'Private current-actor feed presentation controls. Rows are RPC-only and never public social-graph data.';

COMMIT;

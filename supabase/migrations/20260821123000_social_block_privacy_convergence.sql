-- VVIP TIGER P0 Messaging prerequisite: current-authority block/privacy convergence.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Clerk subjects remain internal authorization identifiers; browser-facing peer selection uses profile UUIDs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vvip_social_blocks (
  block_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_subject text NOT NULL
    CHECK (blocker_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  blocked_subject text NOT NULL
    CHECK (blocked_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (blocker_subject <> blocked_subject),
  UNIQUE (blocker_subject, blocked_subject)
);

CREATE INDEX IF NOT EXISTS vvip_social_blocks_blocked_idx
  ON public.vvip_social_blocks (blocked_subject, created_at DESC);

ALTER TABLE public.vvip_social_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_blocks FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_blocks FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_blocks FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_blocks FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_is_blocked_pair(
  p_left_subject text,
  p_right_subject text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT CASE
    WHEN p_left_subject IS NULL
      OR p_right_subject IS NULL
      OR p_left_subject !~ '^user_[A-Za-z0-9_-]{6,128}$'
      OR p_right_subject !~ '^user_[A-Za-z0-9_-]{6,128}$'
      OR p_left_subject = p_right_subject
    THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.vvip_social_blocks AS block_row
      WHERE (
        block_row.blocker_subject = p_left_subject
        AND block_row.blocked_subject = p_right_subject
      ) OR (
        block_row.blocker_subject = p_right_subject
        AND block_row.blocked_subject = p_left_subject
      )
    )
  END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_is_blocked_pair(text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_block_profile(
  p_peer_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
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

  DELETE FROM public.vvip_social_relationships AS relationship
  WHERE relationship.subject_low = least(v_actor, v_peer_subject)
    AND relationship.subject_high = greatest(v_actor, v_peer_subject);

  RETURN jsonb_build_object(
    'ok', true,
    'peer_profile_id', p_peer_profile_id,
    'blocked', true,
    'changed', v_row_count > 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_unblock_profile(
  p_peer_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
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

  DELETE FROM public.vvip_social_blocks AS block_row
  WHERE block_row.blocker_subject = v_actor
    AND block_row.blocked_subject = v_peer_subject;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'peer_profile_id', p_peer_profile_id,
    'blocked', false,
    'changed', v_row_count > 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_block_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_unblock_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_block_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_unblock_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_can_view_post(
  p_post_id uuid,
  p_actor text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    p_actor IS NOT NULL
    AND p_actor ~ '^user_[A-Za-z0-9_-]{6,128}$'
    AND EXISTS (
      SELECT 1
      FROM public.vvip_social_posts AS post
      WHERE post.post_id = p_post_id
        AND (
          post.author_subject = p_actor
          OR (
            NOT public.vvip_social_is_blocked_pair(post.author_subject, p_actor)
            AND (
              post.audience = 'public'
              OR (
                post.audience = 'friends'
                AND EXISTS (
                  SELECT 1
                  FROM public.vvip_social_relationships AS relationship
                  WHERE relationship.relationship_state = 'friends'
                    AND relationship.subject_low = least(post.author_subject, p_actor)
                    AND relationship.subject_high = greatest(post.author_subject, p_actor)
                )
              )
            )
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_can_view_post(uuid, text)
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.vvip_social_blocks IS
  'CURRENT directional Social block authority. Clerk subjects are private authorization data; browser mutation uses profile UUID RPCs only.';

COMMIT;

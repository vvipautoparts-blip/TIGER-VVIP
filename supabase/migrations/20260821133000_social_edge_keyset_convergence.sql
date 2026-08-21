-- VVIP TIGER P0-D edge convergence: subject-blind actor-bound keyset feed authority.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Cursor opacity is transport-only; every page is re-authorized by current PostgreSQL privacy authority.

BEGIN;

CREATE INDEX IF NOT EXISTS vvip_social_posts_feed_keyset_idx
  ON public.vvip_social_posts (created_at DESC, post_id DESC);

CREATE OR REPLACE FUNCTION public.vvip_gate5_cursor_encode(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
DECLARE
  v_text text;
BEGIN
  IF p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object'
     OR octet_length(p_payload::text) > 1024 THEN
    RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
  END IF;

  v_text := encode(convert_to(p_payload::text, 'UTF8'), 'base64');
  RETURN rtrim(replace(replace(v_text, '+', '-'), '/', '_'), '=');
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_gate5_cursor_decode(p_cursor text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
DECLARE
  v_base64 text;
  v_padding integer;
  v_payload jsonb;
BEGIN
  IF p_cursor IS NULL
     OR char_length(p_cursor) < 8
     OR char_length(p_cursor) > 2048
     OR p_cursor !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
  END IF;

  v_base64 := replace(replace(p_cursor, '-', '+'), '_', '/');
  v_padding := char_length(v_base64) % 4;

  IF v_padding = 1 THEN
    RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
  ELSIF v_padding = 2 THEN
    v_base64 := v_base64 || '==';
  ELSIF v_padding = 3 THEN
    v_base64 := v_base64 || '=';
  END IF;

  BEGIN
    v_payload := convert_from(decode(v_base64, 'base64'), 'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
  END;

  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
  END IF;

  RETURN v_payload;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_encode(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_encode(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_encode(jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_decode(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_decode(text) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_gate5_cursor_decode(text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_feed_read_keyset(
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
  v_limit integer := p_limit;
  v_cursor jsonb;
  v_cursor_version integer;
  v_cursor_kind text;
  v_cursor_profile_id uuid;
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

  IF v_limit IS NULL OR v_limit < 1 OR v_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_FEED_LIMIT_INVALID';
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

  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := public.vvip_gate5_cursor_decode(p_cursor);

      IF NOT (v_cursor ? 'v')
         OR NOT (v_cursor ? 'kind')
         OR NOT (v_cursor ? 'actor_profile_id')
         OR NOT (v_cursor ? 'created_at')
         OR NOT (v_cursor ? 'id') THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;

      v_cursor_version := (v_cursor ->> 'v')::integer;
      v_cursor_kind := v_cursor ->> 'kind';
      v_cursor_profile_id := (v_cursor ->> 'actor_profile_id')::uuid;
      v_before_created_at := (v_cursor ->> 'created_at')::timestamptz;
      v_before_post_id := (v_cursor ->> 'id')::uuid;

      IF v_cursor_version <> 2
         OR v_cursor_kind <> 'social_feed'
         OR v_before_created_at IS NULL
         OR v_before_post_id IS NULL THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'GATE5_CURSOR_CONTEXT_MISMATCH' THEN
        RAISE;
      END IF;
      RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
    END;

    IF v_cursor_profile_id <> v_actor_profile_id THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(feed_row.item ORDER BY feed_row.created_at DESC, feed_row.post_id DESC),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      post.post_id,
      post.created_at,
      jsonb_build_object(
        'post_id', post.post_id,
        'author_profile_id', CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
        'author_display_name', CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
        'author_avatar_url', CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
        'author_available', COALESCE(profile.profile_state = 'active', false),
        'body', post.body,
        'audience', post.audience,
        'created_at', post.created_at,
        'updated_at', post.updated_at
      ) AS item
    FROM public.vvip_social_posts AS post
    LEFT JOIN public.vvip_social_profile_projection AS profile
      ON profile.subject = post.author_subject
    WHERE public.vvip_social_can_view_post(post.post_id, v_actor)
      AND (
        p_cursor IS NULL
        OR post.created_at < v_before_created_at
        OR (
          post.created_at = v_before_created_at
          AND post.post_id < v_before_post_id
        )
      )
    ORDER BY post.created_at DESC, post.post_id DESC
    LIMIT (v_limit + 1)
  ) AS feed_row;

  v_total := jsonb_array_length(v_rows);

  IF v_total > v_limit THEN
    v_items := v_rows - v_limit;
  ELSE
    v_items := v_rows;
  END IF;

  IF v_total > v_limit AND jsonb_array_length(v_items) > 0 THEN
    v_last := v_items -> (jsonb_array_length(v_items) - 1);
    v_next_cursor := public.vvip_gate5_cursor_encode(
      jsonb_build_object(
        'v', 2,
        'kind', 'social_feed',
        'actor_profile_id', v_actor_profile_id,
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

REVOKE ALL ON FUNCTION public.vvip_social_feed_read_keyset(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_feed_read_keyset(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_feed_read_keyset(text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_feed_read_keyset(text, integer) TO authenticated;

COMMENT ON FUNCTION public.vvip_social_feed_read_keyset(text, integer) IS
  'P0-D CURRENT feed keyset authority. Cursor binds opaque active profile UUID; each page rechecks current Social privacy/block authority and returns safe author projection only.';

COMMIT;

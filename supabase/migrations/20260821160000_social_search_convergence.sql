-- VVIP TIGER P0-C Social Search convergence.
-- Repository migration only. Production/Staging application remains a separate protected gate.
-- Search discovers candidates; current privacy, block and lifecycle authorities decide every emitted row.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vvip_social_search_budget (
  actor_profile_id uuid PRIMARY KEY
    REFERENCES public.vvip_social_profile_projection(profile_id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count BETWEEN 1 AND 30),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

ALTER TABLE public.vvip_social_search_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_search_budget FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_search_budget FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_search_budget FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_search_budget FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_search_normalize(p_query text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
DECLARE
  v_query text := normalize(COALESCE(p_query, ''), NFKC);
BEGIN
  v_query := replace(v_query, 'ـ', '');
  v_query := translate(
    v_query,
    '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹إأآٱىؤئÏï',
    '01234567890123456789اااايويIi'
  );
  v_query := regexp_replace(v_query, '[ؐ-ًؚ-ٰٟۖ-ۭ]', '', 'g');
  v_query := lower(v_query);
  v_query := regexp_replace(v_query, '[^[:alnum:]]+', ' ', 'g');
  v_query := regexp_replace(btrim(v_query), '[[:space:]]+', ' ', 'g');
  RETURN v_query;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_search_normalize(text)
  FROM PUBLIC, anon, authenticated;

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
  v_count integer;
BEGIN
  IF p_actor_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  INSERT INTO public.vvip_social_search_budget AS budget (
    actor_profile_id,
    window_started_at,
    request_count,
    updated_at
  ) VALUES (
    p_actor_profile_id,
    v_window,
    1,
    statement_timestamp()
  )
  ON CONFLICT (actor_profile_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN budget.window_started_at = EXCLUDED.window_started_at
        THEN budget.window_started_at
      ELSE EXCLUDED.window_started_at
    END,
    request_count = CASE
      WHEN budget.window_started_at = EXCLUDED.window_started_at
        THEN budget.request_count + 1
      ELSE 1
    END,
    updated_at = statement_timestamp()
  RETURNING request_count INTO v_count;

  IF v_count > 30 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_search_consume_budget(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_search_people(
  p_query text,
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_profile_id uuid;
  v_query text;
  v_query_digest text;
  v_cursor jsonb;
  v_cursor_version integer;
  v_cursor_kind text;
  v_cursor_profile_id uuid;
  v_cursor_digest text;
  v_before_rank integer;
  v_before_key text;
  v_before_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_last jsonb;
  v_last_rank integer;
  v_last_key text;
  v_next_cursor text := NULL;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_query IS NULL OR char_length(p_query) > 512 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_QUERY_INVALID' USING ERRCODE = '22023';
  END IF;
  v_query := public.vvip_social_search_normalize(p_query);
  IF char_length(v_query) < 2 OR char_length(v_query) > 160 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_QUERY_INVALID' USING ERRCODE = '22023';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_LIMIT_INVALID' USING ERRCODE = '22023';
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

  v_query_digest := encode(sha256(convert_to(v_query, 'UTF8')), 'hex');
  PERFORM public.vvip_social_search_consume_budget(v_actor_profile_id);

  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
      IF NOT (v_cursor ? 'v')
         OR NOT (v_cursor ? 'kind')
         OR NOT (v_cursor ? 'actor_profile_id')
         OR NOT (v_cursor ? 'query_digest')
         OR NOT (v_cursor ? 'rank')
         OR NOT (v_cursor ? 'key')
         OR NOT (v_cursor ? 'id') THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;

      v_cursor_version := (v_cursor ->> 'v')::integer;
      v_cursor_kind := v_cursor ->> 'kind';
      v_cursor_profile_id := (v_cursor ->> 'actor_profile_id')::uuid;
      v_cursor_digest := v_cursor ->> 'query_digest';
      v_before_rank := (v_cursor ->> 'rank')::integer;
      v_before_key := v_cursor ->> 'key';
      v_before_id := (v_cursor ->> 'id')::uuid;

      IF v_cursor_version <> 3
         OR v_cursor_kind <> 'social_search_people'
         OR v_before_rank NOT BETWEEN 0 AND 3
         OR v_before_key IS NULL
         OR v_before_id IS NULL THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'GATE5_CURSOR_CONTEXT_MISMATCH' THEN
        RAISE;
      END IF;
      RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
    END;

    IF v_cursor_profile_id <> v_actor_profile_id
       OR v_cursor_digest <> v_query_digest THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(search_row.item ORDER BY search_row.match_rank, search_row.name_key COLLATE "C", search_row.profile_id),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      candidate.profile_id,
      candidate.match_rank,
      candidate.name_key,
      jsonb_build_object(
        'profile_id', candidate.profile_id,
        'display_name', candidate.display_name,
        'avatar_url', candidate.avatar_url,
        'business_name', candidate.business_name,
        'location', candidate.location,
        'specialization', candidate.specialization
      ) AS item
    FROM (
      SELECT
        profile.profile_id,
        profile.subject,
        profile.display_name,
        profile.avatar_url,
        profile.business_name,
        profile.location,
        profile.specialization,
        public.vvip_social_search_normalize(profile.display_name) AS name_key,
        CASE
          WHEN public.vvip_social_search_normalize(profile.display_name) = v_query THEN 0
          WHEN public.vvip_social_search_normalize(profile.display_name) LIKE v_query || '%' THEN 1
          WHEN public.vvip_social_search_normalize(profile.display_name) LIKE '%' || v_query || '%' THEN 2
          ELSE 3
        END AS match_rank
      FROM public.vvip_social_profile_projection AS profile
      WHERE profile.profile_state = 'active'
        AND profile.profile_id <> v_actor_profile_id
        AND NOT public.vvip_social_is_blocked_pair(profile.subject, v_actor)
        AND (
          public.vvip_social_search_normalize(profile.display_name) LIKE '%' || v_query || '%'
          OR public.vvip_social_search_normalize(COALESCE(profile.business_name, '')) LIKE '%' || v_query || '%'
          OR public.vvip_social_search_normalize(COALESCE(profile.location, '')) LIKE '%' || v_query || '%'
          OR public.vvip_social_search_normalize(COALESCE(profile.specialization, '')) LIKE '%' || v_query || '%'
        )
    ) AS candidate
    WHERE p_cursor IS NULL
       OR candidate.match_rank > v_before_rank
       OR (
         candidate.match_rank = v_before_rank
         AND candidate.name_key COLLATE "C" > v_before_key COLLATE "C"
       )
       OR (
         candidate.match_rank = v_before_rank
         AND candidate.name_key = v_before_key
         AND candidate.profile_id > v_before_id
       )
    ORDER BY candidate.match_rank, candidate.name_key COLLATE "C", candidate.profile_id
    LIMIT (p_limit + 1)
  ) AS search_row;

  v_total := jsonb_array_length(v_rows);
  IF v_total > p_limit THEN
    v_items := v_rows - p_limit;
  ELSE
    v_items := v_rows;
  END IF;

  IF v_total > p_limit AND jsonb_array_length(v_items) > 0 THEN
    v_last := v_items -> (jsonb_array_length(v_items) - 1);
    SELECT
      CASE
        WHEN public.vvip_social_search_normalize(profile.display_name) = v_query THEN 0
        WHEN public.vvip_social_search_normalize(profile.display_name) LIKE v_query || '%' THEN 1
        WHEN public.vvip_social_search_normalize(profile.display_name) LIKE '%' || v_query || '%' THEN 2
        ELSE 3
      END,
      public.vvip_social_search_normalize(profile.display_name)
    INTO v_last_rank, v_last_key
    FROM public.vvip_social_profile_projection AS profile
    WHERE profile.profile_id = (v_last ->> 'profile_id')::uuid
      AND profile.profile_state = 'active';

    IF v_last_rank IS NULL OR v_last_key IS NULL THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;

    v_next_cursor := public.vvip_gate5_cursor_encode(
      jsonb_build_object(
        'v', 3,
        'kind', 'social_search_people',
        'actor_profile_id', v_actor_profile_id,
        'query_digest', v_query_digest,
        'rank', v_last_rank,
        'key', v_last_key,
        'id', v_last ->> 'profile_id'
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

CREATE OR REPLACE FUNCTION public.vvip_social_search_posts(
  p_query text,
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_profile_id uuid;
  v_query text;
  v_query_digest text;
  v_cursor jsonb;
  v_cursor_version integer;
  v_cursor_kind text;
  v_cursor_profile_id uuid;
  v_cursor_digest text;
  v_before_rank integer;
  v_before_created_at timestamptz;
  v_before_id uuid;
  v_rows jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_last jsonb;
  v_last_rank integer;
  v_next_cursor text := NULL;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_query IS NULL OR char_length(p_query) > 512 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_QUERY_INVALID' USING ERRCODE = '22023';
  END IF;
  v_query := public.vvip_social_search_normalize(p_query);
  IF char_length(v_query) < 2 OR char_length(v_query) > 160 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_QUERY_INVALID' USING ERRCODE = '22023';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'SOCIAL_SEARCH_LIMIT_INVALID' USING ERRCODE = '22023';
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

  v_query_digest := encode(sha256(convert_to(v_query, 'UTF8')), 'hex');
  PERFORM public.vvip_social_search_consume_budget(v_actor_profile_id);

  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := public.vvip_gate5_cursor_decode(p_cursor);
      IF NOT (v_cursor ? 'v')
         OR NOT (v_cursor ? 'kind')
         OR NOT (v_cursor ? 'actor_profile_id')
         OR NOT (v_cursor ? 'query_digest')
         OR NOT (v_cursor ? 'rank')
         OR NOT (v_cursor ? 'created_at')
         OR NOT (v_cursor ? 'id') THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;

      v_cursor_version := (v_cursor ->> 'v')::integer;
      v_cursor_kind := v_cursor ->> 'kind';
      v_cursor_profile_id := (v_cursor ->> 'actor_profile_id')::uuid;
      v_cursor_digest := v_cursor ->> 'query_digest';
      v_before_rank := (v_cursor ->> 'rank')::integer;
      v_before_created_at := (v_cursor ->> 'created_at')::timestamptz;
      v_before_id := (v_cursor ->> 'id')::uuid;

      IF v_cursor_version <> 3
         OR v_cursor_kind <> 'social_search_posts'
         OR v_before_rank NOT BETWEEN 0 AND 1
         OR v_before_created_at IS NULL
         OR v_before_id IS NULL THEN
        RAISE EXCEPTION 'GATE5_CURSOR_INVALID';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'GATE5_CURSOR_CONTEXT_MISMATCH' THEN
        RAISE;
      END IF;
      RAISE EXCEPTION 'GATE5_CURSOR_INVALID' USING ERRCODE = '22023';
    END;

    IF v_cursor_profile_id <> v_actor_profile_id
       OR v_cursor_digest <> v_query_digest THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(search_row.item ORDER BY search_row.match_rank, search_row.created_at DESC, search_row.post_id DESC),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      candidate.post_id,
      candidate.created_at,
      candidate.match_rank,
      jsonb_build_object(
        'post_id', candidate.post_id,
        'author_profile_id', candidate.profile_id,
        'author_display_name', candidate.display_name,
        'author_avatar_url', candidate.avatar_url,
        'author_available', true,
        'body', candidate.body,
        'audience', candidate.audience,
        'created_at', candidate.created_at,
        'updated_at', candidate.updated_at
      ) AS item
    FROM (
      SELECT
        post.post_id,
        post.body,
        post.audience,
        post.created_at,
        post.updated_at,
        profile.profile_id,
        profile.display_name,
        profile.avatar_url,
        CASE
          WHEN public.vvip_social_search_normalize(post.body) LIKE v_query || '%' THEN 0
          ELSE 1
        END AS match_rank
      FROM public.vvip_social_posts AS post
      JOIN public.vvip_social_profile_projection AS profile
        ON profile.subject = post.author_subject
       AND profile.profile_state = 'active'
      WHERE public.vvip_social_search_normalize(post.body) LIKE '%' || v_query || '%'
        AND public.vvip_social_can_view_post(post.post_id, v_actor)
    ) AS candidate
    WHERE p_cursor IS NULL
       OR candidate.match_rank > v_before_rank
       OR (
         candidate.match_rank = v_before_rank
         AND candidate.created_at < v_before_created_at
       )
       OR (
         candidate.match_rank = v_before_rank
         AND candidate.created_at = v_before_created_at
         AND candidate.post_id < v_before_id
       )
    ORDER BY candidate.match_rank, candidate.created_at DESC, candidate.post_id DESC
    LIMIT (p_limit + 1)
  ) AS search_row;

  v_total := jsonb_array_length(v_rows);
  IF v_total > p_limit THEN
    v_items := v_rows - p_limit;
  ELSE
    v_items := v_rows;
  END IF;

  IF v_total > p_limit AND jsonb_array_length(v_items) > 0 THEN
    v_last := v_items -> (jsonb_array_length(v_items) - 1);
    SELECT
      CASE
        WHEN public.vvip_social_search_normalize(post.body) LIKE v_query || '%' THEN 0
        ELSE 1
      END
    INTO v_last_rank
    FROM public.vvip_social_posts AS post
    WHERE post.post_id = (v_last ->> 'post_id')::uuid;

    IF v_last_rank IS NULL THEN
      RAISE EXCEPTION 'GATE5_CURSOR_CONTEXT_MISMATCH' USING ERRCODE = '22023';
    END IF;

    v_next_cursor := public.vvip_gate5_cursor_encode(
      jsonb_build_object(
        'v', 3,
        'kind', 'social_search_posts',
        'actor_profile_id', v_actor_profile_id,
        'query_digest', v_query_digest,
        'rank', v_last_rank,
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

REVOKE ALL ON FUNCTION public.vvip_social_search_people(text, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_search_posts(text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_search_people(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_search_posts(text, text, integer) TO authenticated;

COMMENT ON TABLE public.vvip_social_search_budget IS
  'P0-C private per-profile Social Search budget authority. Browser roles have no direct table privileges.';
COMMENT ON FUNCTION public.vvip_social_search_people(text, text, integer) IS
  'P0-C People search. Safe public projection only; active/block filters and actor/query-bound keyset are rechecked every page.';
COMMENT ON FUNCTION public.vvip_social_search_posts(text, text, integer) IS
  'P0-C Post search. Current post privacy/block/lifecycle authorization is rechecked before every emitted row.';

COMMIT;

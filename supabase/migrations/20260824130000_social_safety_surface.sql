-- VVIP TIGER P0 Safety surface: private block controls and append-only reports.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- Browser inputs and outputs use presentation UUIDs only; Clerk subjects stay inside PostgreSQL.

BEGIN;

CREATE TABLE public.vvip_social_reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_subject text NOT NULL
    CHECK (reporter_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  target_kind text NOT NULL
    CHECK (target_kind IN ('profile', 'post')),
  target_id uuid NOT NULL,
  target_subject text NOT NULL
    CHECK (target_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  reason text NOT NULL
    CHECK (reason IN ('spam', 'harassment', 'hate', 'violence', 'nudity', 'fraud', 'other')),
  details text
    CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (reporter_subject <> target_subject),
  UNIQUE (reporter_subject, target_kind, target_id, reason)
);

CREATE INDEX vvip_social_reports_moderation_queue_idx
  ON public.vvip_social_reports (status, created_at, report_id);

ALTER TABLE public.vvip_social_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_reports FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_reports FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_block_state(
  p_peer_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_blocked_by_viewer boolean := false;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.vvip_social_profile_projection AS profile
    JOIN public.vvip_social_blocks AS block_row
      ON block_row.blocked_subject = profile.subject
    WHERE profile.profile_id = p_peer_profile_id
      AND block_row.blocker_subject = v_actor
  ) INTO v_blocked_by_viewer;

  RETURN jsonb_build_object(
    'ok', true,
    'peer_profile_id', p_peer_profile_id,
    'blocked_by_viewer', v_blocked_by_viewer
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_list_my_blocks(
  p_limit integer DEFAULT 50
)
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

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_LIMIT_INVALID';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', listed.profile_id,
        'display_name', listed.display_name,
        'avatar_url', listed.avatar_url,
        'profile_available', listed.profile_available,
        'blocked_at', listed.blocked_at
      )
      ORDER BY listed.blocked_at DESC, listed.profile_id DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT
      profile.profile_id,
      CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END AS display_name,
      CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END AS avatar_url,
      profile.profile_state = 'active' AS profile_available,
      block_row.created_at AS blocked_at
    FROM public.vvip_social_blocks AS block_row
    JOIN public.vvip_social_profile_projection AS profile
      ON profile.subject = block_row.blocked_subject
    WHERE block_row.blocker_subject = v_actor
    ORDER BY block_row.created_at DESC, profile.profile_id DESC
    LIMIT p_limit
  ) AS listed;

  RETURN jsonb_build_object(
    'ok', true,
    'items', v_items
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_unblock_profile(
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
  JOIN public.vvip_social_blocks AS block_row
    ON block_row.blocked_subject = profile.subject
   AND block_row.blocker_subject = v_actor
  WHERE profile.profile_id = p_peer_profile_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'peer_profile_id', p_peer_profile_id,
      'blocked', false,
      'changed', false
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(least(v_actor, v_peer_subject) || ':' || greatest(v_actor, v_peer_subject), 0)
  );

  DELETE FROM public.vvip_social_blocks AS block_row WHERE block_row.blocker_subject = v_actor
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

CREATE OR REPLACE FUNCTION public.vvip_social_submit_report(
  p_target_kind text,
  p_target_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_target_subject text;
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_report_id uuid;
  v_duplicate boolean := false;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_target_kind IS NULL OR p_target_kind NOT IN ('profile', 'post') THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_TARGET_KIND_INVALID';
  END IF;

  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_TARGET_REQUIRED';
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN ('spam', 'harassment', 'hate', 'violence', 'nudity', 'fraud', 'other') THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_REASON_INVALID';
  END IF;

  IF char_length(v_details) > 1000 THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_DETAILS_INVALID';
  END IF;

  IF p_target_kind = 'profile' THEN
    SELECT profile.subject
    INTO v_target_subject
    FROM public.vvip_social_profile_projection AS profile
    WHERE profile.profile_id = p_target_id
      AND profile.profile_state = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SOCIAL_REPORT_TARGET_NOT_AVAILABLE';
    END IF;
  ELSE
    IF NOT public.vvip_social_can_view_post(p_target_id, v_actor) THEN
      RAISE EXCEPTION 'SOCIAL_REPORT_TARGET_NOT_VISIBLE';
    END IF;

    SELECT post.author_subject
    INTO v_target_subject
    FROM public.vvip_social_posts AS post
    WHERE post.post_id = p_target_id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SOCIAL_REPORT_TARGET_NOT_VISIBLE';
    END IF;
  END IF;

  IF v_target_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_SELF_DENIED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_actor || ':social-report-submit', 0)
  );

  SELECT report.report_id
  INTO v_report_id
  FROM public.vvip_social_reports AS report
  WHERE report.reporter_subject = v_actor
    AND report.target_kind = p_target_kind
    AND report.target_id = p_target_id
    AND report.reason = p_reason
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'report_id', v_report_id,
      'status', 'received',
      'duplicate', true
    );
  END IF;

  IF (
    SELECT count(*)
    FROM public.vvip_social_reports AS report
    WHERE report.reporter_subject = v_actor
      AND report.created_at >= statement_timestamp() - interval '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION 'SOCIAL_REPORT_RATE_LIMITED';
  END IF;

  INSERT INTO public.vvip_social_reports (
    reporter_subject,
    target_kind,
    target_id,
    target_subject,
    reason,
    details
  ) VALUES (
    v_actor,
    p_target_kind,
    p_target_id,
    v_target_subject,
    p_reason,
    v_details
  )
  ON CONFLICT (reporter_subject, target_kind, target_id, reason) DO NOTHING
  RETURNING report_id INTO v_report_id;

  IF NOT FOUND THEN
    v_duplicate := true;
    SELECT report.report_id
    INTO v_report_id
    FROM public.vvip_social_reports AS report
    WHERE report.reporter_subject = v_actor
      AND report.target_kind = p_target_kind
      AND report.target_id = p_target_id
      AND report.reason = p_reason
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'report_id', v_report_id,
    'status', 'received',
    'duplicate', v_duplicate
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_block_state(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_list_my_blocks(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_block_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_unblock_profile(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_submit_report(text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_block_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_list_my_blocks(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_block_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_unblock_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_submit_report(text, uuid, text, text) TO authenticated;

COMMIT;

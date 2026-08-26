BEGIN;

CREATE OR REPLACE FUNCTION public.vvip_social_actor_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
  WITH actor AS (
    SELECT public.vvip_marketplace_actor_id() AS subject
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.vvip_social_profile_projection AS profile, actor
    WHERE actor.subject IS NOT NULL
      AND profile.subject = actor.subject
      AND profile.profile_state = 'active'
  );
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_actor_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_actor_active() FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_actor_active() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_actor_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_guard_active_actor_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
BEGIN
  IF v_actor IS NOT NULL AND NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_guard_active_actor_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_guard_active_actor_mutation() FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_guard_active_actor_mutation() FROM authenticated;

CREATE TRIGGER vvip_social_active_actor_posts
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_posts
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE TRIGGER vvip_social_active_actor_comments
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_comments
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE TRIGGER vvip_social_active_actor_reactions
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_reactions
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE TRIGGER vvip_social_active_actor_bookmarks
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_bookmarks
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE TRIGGER vvip_social_active_actor_follows
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_follows
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE TRIGGER vvip_social_active_actor_relationships
BEFORE INSERT OR UPDATE OR DELETE ON public.vvip_social_relationships
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_guard_active_actor_mutation();

CREATE OR REPLACE FUNCTION public.vvip_social_feed_page(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_post_id uuid DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  author_profile_id uuid,
  author_display_name text,
  author_avatar_url text,
  author_available boolean,
  body text,
  audience text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
BEGIN
  IF v_actor IS NULL OR v_actor NOT LIKE 'user\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_FEED_LIMIT_INVALID';
  END IF;

  IF (p_before_created_at IS NULL) <> (p_before_post_id IS NULL) THEN
    RAISE EXCEPTION 'SOCIAL_FEED_CURSOR_INVALID';
  END IF;

  RETURN QUERY
  SELECT
    post.post_id,
    CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
    CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
    CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
    COALESCE(profile.profile_state = 'active', false),
    post.body,
    post.audience,
    post.created_at,
    post.updated_at
  FROM public.vvip_social_posts AS post
  LEFT JOIN public.vvip_social_profile_projection AS profile
    ON profile.subject = post.author_subject
  WHERE public.vvip_social_can_view_post(post.post_id, v_actor)
    AND (
      p_before_created_at IS NULL
      OR post.created_at < p_before_created_at
      OR (
        post.created_at = p_before_created_at
        AND post.post_id < p_before_post_id
      )
    )
  ORDER BY post.created_at DESC, post.post_id DESC
  LIMIT (p_limit + 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_post_create(
  p_body text,
  p_audience text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_profile public.vvip_social_profile_projection%ROWTYPE;
  v_post public.vvip_social_posts%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR v_actor NOT LIKE 'user\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_body IS NULL OR char_length(btrim(p_body)) < 1 OR char_length(btrim(p_body)) > 5000 THEN
    RAISE EXCEPTION 'SOCIAL_POST_BODY_INVALID';
  END IF;

  IF p_audience IS NULL OR p_audience NOT IN ('public', 'friends', 'only_me') THEN
    RAISE EXCEPTION 'SOCIAL_POST_AUDIENCE_INVALID';
  END IF;

  SELECT profile.*
  INTO v_profile
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  INSERT INTO public.vvip_social_posts (
    author_subject,
    body,
    audience
  ) VALUES (
    v_actor,
    btrim(p_body),
    p_audience
  )
  RETURNING * INTO v_post;

  RETURN jsonb_build_object(
    'post_id', v_post.post_id,
    'author_profile_id', v_profile.profile_id,
    'author_display_name', v_profile.display_name,
    'author_avatar_url', v_profile.avatar_url,
    'author_available', true,
    'body', v_post.body,
    'audience', v_post.audience,
    'created_at', v_post.created_at,
    'updated_at', v_post.updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_comment_list(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_actor_active boolean := public.vvip_social_actor_active();
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL OR v_actor NOT LIKE 'user\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_COMMENT_POST_REQUIRED';
  END IF;

  IF NOT public.vvip_social_can_view_post(p_post_id, v_actor) THEN
    RAISE EXCEPTION 'SOCIAL_COMMENT_POST_NOT_VISIBLE';
  END IF;

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'comment_id', comment.comment_id,
          'post_id', comment.post_id,
          'parent_comment_id', comment.parent_comment_id,
          'author_profile_id', CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
          'author_display_name', CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
          'author_avatar_url', CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
          'author_available', COALESCE(profile.profile_state = 'active', false),
          'body', comment.body,
          'created_at', comment.created_at,
          'updated_at', comment.updated_at,
          'viewer_can_edit', comment.author_subject = v_actor AND v_actor_active
        )
        ORDER BY
          COALESCE(parent.created_at, comment.created_at),
          CASE WHEN comment.parent_comment_id IS NULL THEN 0 ELSE 1 END,
          comment.created_at,
          comment.comment_id
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  INTO v_items, v_total
  FROM public.vvip_social_comments AS comment
  LEFT JOIN public.vvip_social_comments AS parent
    ON parent.comment_id = comment.parent_comment_id
  LEFT JOIN public.vvip_social_profile_projection AS profile
    ON profile.subject = comment.author_subject
  WHERE comment.post_id = p_post_id;

  RETURN jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'total', v_total,
    'items', v_items
  );
END;
$function$;

REVOKE SELECT ON TABLE public.vvip_social_posts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.vvip_social_posts FROM authenticated;

REVOKE ALL ON FUNCTION public.vvip_social_feed_page(integer, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_feed_page(integer, timestamptz, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_feed_page(integer, timestamptz, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_feed_page(integer, timestamptz, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.vvip_social_post_create(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_post_create(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_post_create(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_post_create(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.vvip_social_comment_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_social_comment_list(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_social_comment_list(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_comment_list(uuid) TO authenticated;

COMMIT;

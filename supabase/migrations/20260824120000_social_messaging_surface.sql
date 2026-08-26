-- VVIP TIGER P0 Messaging conversation/contact discovery surface.
-- Forward-only repository migration. Production/Staging application remains a protected gate.
-- Browser payloads use safe profile UUID projection only; Clerk subjects remain internal.

BEGIN;

CREATE OR REPLACE FUNCTION public.vvip_social_list_conversations(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  conversation_id uuid,
  peer_profile_id uuid,
  peer_display_name text,
  peer_avatar_url text,
  peer_available boolean,
  can_message boolean,
  last_message_sequence bigint,
  last_read_sequence bigint,
  unread_count bigint,
  last_message_body text,
  last_message_viewer_is_sender boolean,
  last_message_at timestamptz,
  activity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_LIMIT_INVALID';
  END IF;

  RETURN QUERY
  WITH actor_conversations AS (
    SELECT
      conversation.*,
      CASE
        WHEN conversation.subject_low = v_actor THEN conversation.subject_high
        ELSE conversation.subject_low
      END AS peer_subject,
      coalesce(cursor.last_read_sequence, 0) AS viewer_last_read_sequence
    FROM public.vvip_social_conversations AS conversation
    JOIN public.vvip_social_conversation_members AS member
      ON member.conversation_id = conversation.conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
    LEFT JOIN public.vvip_social_read_cursors AS cursor
      ON cursor.conversation_id = conversation.conversation_id
      AND cursor.member_subject = v_actor
    WHERE v_actor IN (conversation.subject_low, conversation.subject_high)
  )
  SELECT
    conversation.conversation_id,
    CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
    CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
    CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
    coalesce(profile.profile_state = 'active', false),
    coalesce(profile.profile_state = 'active', false)
      AND NOT public.vvip_social_is_blocked_pair(v_actor, conversation.peer_subject),
    conversation.last_message_sequence,
    conversation.viewer_last_read_sequence,
    (
      SELECT count(*)
      FROM public.vvip_social_messages AS unread_message
      WHERE unread_message.conversation_id = conversation.conversation_id
        AND unread_message.sequence > conversation.viewer_last_read_sequence
        AND unread_message.sender_subject <> v_actor
    ),
    last_message.body,
    CASE WHEN last_message.message_id IS NULL THEN NULL ELSE last_message.sender_subject = v_actor END,
    last_message.created_at,
    coalesce(conversation.last_message_at, conversation.created_at)
  FROM actor_conversations AS conversation
  LEFT JOIN public.vvip_social_profile_projection AS profile
    ON profile.subject = conversation.peer_subject
  LEFT JOIN public.vvip_social_messages AS last_message
    ON last_message.conversation_id = conversation.conversation_id
    AND last_message.sequence = conversation.last_message_sequence
  ORDER BY
    coalesce(conversation.last_message_at, conversation.created_at) DESC,
    conversation.conversation_id DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_list_message_contacts(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  peer_profile_id uuid,
  peer_display_name text,
  peer_avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_LIMIT_INVALID';
  END IF;

  RETURN QUERY
  SELECT
    profile.profile_id,
    profile.display_name,
    profile.avatar_url
  FROM public.vvip_social_relationships AS relationship
  JOIN public.vvip_social_profile_projection AS profile
    ON profile.subject = CASE
      WHEN relationship.subject_low = v_actor THEN relationship.subject_high
      ELSE relationship.subject_low
    END
    AND profile.profile_state = 'active'
  WHERE relationship.relationship_state = 'friends'
    AND v_actor IN (relationship.subject_low, relationship.subject_high)
    AND NOT public.vvip_social_is_blocked_pair(
      v_actor,
      CASE
        WHEN relationship.subject_low = v_actor THEN relationship.subject_high
        ELSE relationship.subject_low
      END
    )
  ORDER BY profile.display_name ASC, profile.profile_id ASC
  LIMIT p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.vvip_social_list_conversations(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_list_message_contacts(integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_list_conversations(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_list_message_contacts(integer) TO authenticated;

COMMENT ON FUNCTION public.vvip_social_list_conversations(integer) IS
  'CURRENT subject-blind direct-conversation discovery with durable unread state.';
COMMENT ON FUNCTION public.vvip_social_list_message_contacts(integer) IS
  'CURRENT subject-blind active friend projection for starting direct conversations.';

COMMIT;

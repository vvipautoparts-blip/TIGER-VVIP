-- VVIP TIGER P0 Messaging clean convergence 2026.
-- Repository/local rehearsal only. Production/Staging application remains a separate protected gate.
-- PostgreSQL is durable truth. Supabase Realtime is private transport only.
-- Clerk user_* subjects are internal authorization identifiers and never browser presentation identity.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vvip_social_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_kind text NOT NULL DEFAULT 'direct'
    CHECK (conversation_kind = 'direct'),
  subject_low text NOT NULL
    CHECK (subject_low ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  subject_high text NOT NULL
    CHECK (subject_high ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  channel_epoch bigint NOT NULL DEFAULT 1
    CHECK (channel_epoch > 0),
  membership_version bigint NOT NULL DEFAULT 1
    CHECK (membership_version > 0),
  next_sequence bigint NOT NULL DEFAULT 1
    CHECK (next_sequence > 0),
  last_message_sequence bigint NOT NULL DEFAULT 0
    CHECK (last_message_sequence >= 0),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (subject_low < subject_high),
  CHECK (last_message_sequence < next_sequence),
  UNIQUE (subject_low, subject_high)
);

CREATE TABLE IF NOT EXISTS public.vvip_social_conversation_members (
  conversation_id uuid NOT NULL
    REFERENCES public.vvip_social_conversations (conversation_id) ON DELETE RESTRICT,
  member_subject text NOT NULL
    CHECK (member_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  membership_state text NOT NULL DEFAULT 'active'
    CHECK (membership_state = 'active'),
  joined_version bigint NOT NULL DEFAULT 1
    CHECK (joined_version > 0),
  joined_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (conversation_id, member_subject)
);

CREATE TABLE IF NOT EXISTS public.vvip_social_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.vvip_social_conversations (conversation_id) ON DELETE RESTRICT,
  sequence bigint NOT NULL
    CHECK (sequence > 0),
  sender_subject text NOT NULL
    CHECK (sender_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  client_message_id uuid NOT NULL,
  body text NOT NULL
    CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (conversation_id, sequence),
  UNIQUE (conversation_id, sender_subject, client_message_id)
);

CREATE TABLE IF NOT EXISTS public.vvip_social_read_cursors (
  conversation_id uuid NOT NULL
    REFERENCES public.vvip_social_conversations (conversation_id) ON DELETE RESTRICT,
  member_subject text NOT NULL
    CHECK (member_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  last_read_sequence bigint NOT NULL DEFAULT 0
    CHECK (last_read_sequence >= 0),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (conversation_id, member_subject)
);

CREATE INDEX IF NOT EXISTS vvip_social_conversation_members_member_idx
  ON public.vvip_social_conversation_members (member_subject, conversation_id);
CREATE INDEX IF NOT EXISTS vvip_social_messages_conversation_sequence_idx
  ON public.vvip_social_messages (conversation_id, sequence);
CREATE INDEX IF NOT EXISTS vvip_social_read_cursors_member_idx
  ON public.vvip_social_read_cursors (member_subject, conversation_id);

ALTER TABLE public.vvip_social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_conversation_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_read_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_read_cursors FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_conversation_members FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.vvip_social_read_cursors FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vvip_social_open_direct_conversation(
  p_peer_profile_id uuid,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_peer_subject text;
  v_subject_low text;
  v_subject_high text;
  v_conversation public.vvip_social_conversations%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_peer_profile_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_PEER_REQUIRED';
  END IF;

  IF p_idempotency_key IS NOT NULL
     AND (char_length(btrim(p_idempotency_key)) < 1 OR char_length(p_idempotency_key) > 128) THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_IDEMPOTENCY_KEY_INVALID';
  END IF;

  SELECT profile.subject
  INTO v_peer_subject
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.profile_id = p_peer_profile_id
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE';
  END IF;

  IF v_peer_subject = v_actor THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_SELF_CONVERSATION_DENIED';
  END IF;

  IF public.vvip_social_is_blocked_pair(v_actor, v_peer_subject) THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_ACTIVE';
  END IF;

  v_subject_low := least(v_actor, v_peer_subject);
  v_subject_high := greatest(v_actor, v_peer_subject);

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_subject_low || ':' || v_subject_high, 0)
  );

  SELECT conversation.*
  INTO v_conversation
  FROM public.vvip_social_conversations AS conversation
  WHERE conversation.subject_low = v_subject_low
    AND conversation.subject_high = v_subject_high
  FOR UPDATE;

  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.vvip_social_relationships AS relationship
      WHERE relationship.relationship_state = 'friends'
        AND relationship.subject_low = v_subject_low
        AND relationship.subject_high = v_subject_high
    ) THEN
      RAISE EXCEPTION 'SOCIAL_MESSAGE_FRIENDSHIP_REQUIRED';
    END IF;

    INSERT INTO public.vvip_social_conversations (
      subject_low,
      subject_high
    ) VALUES (
      v_subject_low,
      v_subject_high
    )
    RETURNING * INTO v_conversation;
  END IF;

  INSERT INTO public.vvip_social_conversation_members (
    conversation_id,
    member_subject,
    joined_version
  ) VALUES
    (v_conversation.conversation_id, v_subject_low, v_conversation.membership_version),
    (v_conversation.conversation_id, v_subject_high, v_conversation.membership_version)
  ON CONFLICT (conversation_id, member_subject) DO NOTHING;

  INSERT INTO public.vvip_social_read_cursors (
    conversation_id,
    member_subject
  ) VALUES
    (v_conversation.conversation_id, v_subject_low),
    (v_conversation.conversation_id, v_subject_high)
  ON CONFLICT (conversation_id, member_subject) DO NOTHING;

  RETURN jsonb_build_object(
    'conversation_id', v_conversation.conversation_id,
    'channel_epoch', v_conversation.channel_epoch,
    'membership_version', v_conversation.membership_version,
    'created_at', v_conversation.created_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_send_message(
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_peer_subject text;
  v_body text;
  v_sequence bigint;
  v_topic text;
  v_conversation public.vvip_social_conversations%ROWTYPE;
  v_existing public.vvip_social_messages%ROWTYPE;
  v_message public.vvip_social_messages%ROWTYPE;
  v_sender_profile_id uuid;
  v_sender_display_name text;
  v_sender_avatar_url text;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_conversation_id IS NULL OR p_client_message_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_ID_INVALID';
  END IF;

  v_body := btrim(coalesce(p_body, ''));
  IF v_body = '' OR char_length(v_body) > 4000 THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_BODY_INVALID';
  END IF;

  SELECT
    profile.profile_id,
    profile.display_name,
    profile.avatar_url
  INTO
    v_sender_profile_id,
    v_sender_display_name,
    v_sender_avatar_url
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.vvip_social_conversations AS conversation
  WHERE conversation.conversation_id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_conversation_members AS member
    WHERE member.conversation_id = v_conversation.conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  v_peer_subject := CASE
    WHEN v_conversation.subject_low = v_actor THEN v_conversation.subject_high
    WHEN v_conversation.subject_high = v_actor THEN v_conversation.subject_low
    ELSE NULL
  END;

  IF v_peer_subject IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_profile_projection AS peer_profile
    WHERE peer_profile.subject = v_peer_subject
      AND peer_profile.profile_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE';
  END IF;

  IF public.vvip_social_is_blocked_pair(v_actor, v_peer_subject) THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_ACTIVE';
  END IF;

  SELECT message.*
  INTO v_existing
  FROM public.vvip_social_messages AS message
  WHERE message.conversation_id = v_conversation.conversation_id
    AND message.sender_subject = v_actor
    AND message.client_message_id = p_client_message_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'message_id', v_existing.message_id,
      'conversation_id', v_existing.conversation_id,
      'sequence', v_existing.sequence,
      'sender_profile_id', v_sender_profile_id,
      'sender_display_name', v_sender_display_name,
      'sender_avatar_url', v_sender_avatar_url,
      'sender_available', true,
      'body', v_existing.body,
      'created_at', v_existing.created_at,
      'channel_epoch', v_conversation.channel_epoch,
      'idempotent_replay', true
    );
  END IF;

  v_sequence := v_conversation.next_sequence;

  INSERT INTO public.vvip_social_messages (
    conversation_id,
    sequence,
    sender_subject,
    client_message_id,
    body
  ) VALUES (
    v_conversation.conversation_id,
    v_sequence,
    v_actor,
    p_client_message_id,
    v_body
  )
  RETURNING * INTO v_message;

  UPDATE public.vvip_social_conversations AS conversation SET next_sequence = v_sequence + 1, last_message_sequence = v_sequence, last_message_at = v_message.created_at, updated_at = statement_timestamp() WHERE conversation.conversation_id = v_conversation.conversation_id;

  v_topic := 'conversation:' || v_conversation.conversation_id::text
    || ':epoch:' || v_conversation.channel_epoch::text;

  PERFORM realtime.send(
    jsonb_build_object(
      'conversation_id', v_conversation.conversation_id,
      'message_id', v_message.message_id,
      'sequence', v_message.sequence,
      'sender_profile_id', v_sender_profile_id,
      'sender_display_name', v_sender_display_name,
      'sender_avatar_url', v_sender_avatar_url,
      'sender_available', true,
      'body', v_message.body,
      'created_at', v_message.created_at,
      'channel_epoch', v_conversation.channel_epoch
    ),
    'message_created',
    v_topic,
    true
  );

  RETURN jsonb_build_object(
    'message_id', v_message.message_id,
    'conversation_id', v_message.conversation_id,
    'sequence', v_message.sequence,
    'sender_profile_id', v_sender_profile_id,
    'sender_display_name', v_sender_display_name,
    'sender_avatar_url', v_sender_avatar_url,
    'sender_available', true,
    'body', v_message.body,
    'created_at', v_message.created_at,
    'channel_epoch', v_conversation.channel_epoch,
    'idempotent_replay', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_list_messages(
  p_conversation_id uuid,
  p_after_sequence bigint DEFAULT 0,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  sequence bigint,
  sender_profile_id uuid,
  sender_display_name text,
  sender_avatar_url text,
  sender_available boolean,
  viewer_is_sender boolean,
  body text,
  created_at timestamptz
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

  IF p_conversation_id IS NULL OR p_after_sequence IS NULL OR p_after_sequence < 0 THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_CURSOR_INVALID';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_LIMIT_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_conversation_members AS member
    WHERE member.conversation_id = p_conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  RETURN QUERY
  SELECT
    message.message_id,
    message.conversation_id,
    message.sequence,
    CASE WHEN profile.profile_state = 'active' THEN profile.profile_id ELSE NULL END,
    CASE WHEN profile.profile_state = 'active' THEN profile.display_name ELSE 'عضو غير متاح' END,
    CASE WHEN profile.profile_state = 'active' THEN profile.avatar_url ELSE NULL END,
    COALESCE(profile.profile_state = 'active', false),
    message.sender_subject = v_actor,
    message.body,
    message.created_at
  FROM public.vvip_social_messages AS message
  LEFT JOIN public.vvip_social_profile_projection AS profile
    ON profile.subject = message.sender_subject
  WHERE message.conversation_id = p_conversation_id
    AND message.sequence > p_after_sequence
  ORDER BY message.sequence ASC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_mark_read(
  p_conversation_id uuid,
  p_sequence bigint
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_conversation public.vvip_social_conversations%ROWTYPE;
  v_previous bigint := 0;
  v_effective bigint := 0;
  v_updated_at timestamptz;
  v_reader_profile_id uuid;
  v_topic text;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_conversation_id IS NULL OR p_sequence IS NULL OR p_sequence < 0 THEN
    RAISE EXCEPTION 'SOCIAL_READ_CURSOR_INVALID';
  END IF;

  SELECT profile.profile_id
  INTO v_reader_profile_id
  FROM public.vvip_social_profile_projection AS profile
  WHERE profile.subject = v_actor
    AND profile.profile_state = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.vvip_social_conversations AS conversation
  WHERE conversation.conversation_id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_conversation_members AS member
    WHERE member.conversation_id = p_conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  IF p_sequence > v_conversation.last_message_sequence THEN
    RAISE EXCEPTION 'SOCIAL_READ_CURSOR_BEYOND_TAIL';
  END IF;

  SELECT cursor.last_read_sequence
  INTO v_previous
  FROM public.vvip_social_read_cursors AS cursor
  WHERE cursor.conversation_id = p_conversation_id
    AND cursor.member_subject = v_actor
  FOR UPDATE;

  v_previous := coalesce(v_previous, 0);

  INSERT INTO public.vvip_social_read_cursors (
    conversation_id,
    member_subject,
    last_read_sequence,
    updated_at
  ) VALUES (
    p_conversation_id,
    v_actor,
    greatest(v_previous, p_sequence),
    statement_timestamp()
  )
  ON CONFLICT (conversation_id, member_subject) DO UPDATE SET last_read_sequence = greatest(public.vvip_social_read_cursors.last_read_sequence, excluded.last_read_sequence), updated_at = CASE WHEN excluded.last_read_sequence > public.vvip_social_read_cursors.last_read_sequence THEN statement_timestamp() ELSE public.vvip_social_read_cursors.updated_at END WHERE public.vvip_social_read_cursors.conversation_id = excluded.conversation_id AND public.vvip_social_read_cursors.member_subject = excluded.member_subject
  RETURNING last_read_sequence, updated_at INTO v_effective, v_updated_at;

  IF v_effective > v_previous
     AND NOT public.vvip_social_is_blocked_pair(
       v_conversation.subject_low,
       v_conversation.subject_high
     ) THEN
    v_topic := 'conversation:' || p_conversation_id::text
      || ':epoch:' || v_conversation.channel_epoch::text;

    PERFORM realtime.send(
      jsonb_build_object(
        'conversation_id', p_conversation_id,
        'reader_profile_id', v_reader_profile_id,
        'last_read_sequence', v_effective,
        'channel_epoch', v_conversation.channel_epoch,
        'updated_at', v_updated_at
      ),
      'read_cursor_advanced',
      v_topic,
      true
    );
  END IF;

  RETURN jsonb_build_object(
    'conversation_id', p_conversation_id,
    'last_read_sequence', v_effective,
    'updated_at', v_updated_at,
    'advanced', v_effective > v_previous
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_get_channel_ticket(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_peer_subject text;
  v_conversation public.vvip_social_conversations%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RAISE EXCEPTION 'SOCIAL_AUTH_REQUIRED';
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RAISE EXCEPTION 'SOCIAL_PROFILE_INACTIVE';
  END IF;

  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_ID_REQUIRED';
  END IF;

  SELECT conversation.*
  INTO v_conversation
  FROM public.vvip_social_conversations AS conversation
  WHERE conversation.conversation_id = p_conversation_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_conversation_members AS member
    WHERE member.conversation_id = p_conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  v_peer_subject := CASE
    WHEN v_conversation.subject_low = v_actor THEN v_conversation.subject_high
    WHEN v_conversation.subject_high = v_actor THEN v_conversation.subject_low
    ELSE NULL
  END;

  IF v_peer_subject IS NULL THEN
    RAISE EXCEPTION 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
  END IF;

  IF public.vvip_social_is_blocked_pair(v_actor, v_peer_subject) THEN
    RAISE EXCEPTION 'SOCIAL_BLOCK_ACTIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vvip_social_profile_projection AS peer_profile
    WHERE peer_profile.subject = v_peer_subject
      AND peer_profile.profile_state = 'active'
  ) THEN
    RAISE EXCEPTION 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE';
  END IF;

  RETURN jsonb_build_object(
    'conversation_id', v_conversation.conversation_id,
    'topic', 'conversation:' || v_conversation.conversation_id::text
      || ':epoch:' || v_conversation.channel_epoch::text,
    'channel_epoch', v_conversation.channel_epoch,
    'membership_version', v_conversation.membership_version
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_realtime_topic_authorized(
  p_topic text,
  p_extension text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor text := public.vvip_marketplace_actor_id();
  v_parts text[];
  v_conversation_id uuid;
  v_epoch bigint;
BEGIN
  IF v_actor IS NULL OR v_actor !~ '^user_[A-Za-z0-9_-]{6,128}$' THEN
    RETURN false;
  END IF;

  IF NOT public.vvip_social_actor_active() THEN
    RETURN false;
  END IF;

  IF p_extension NOT IN ('broadcast', 'presence') THEN
    RETURN false;
  END IF;

  v_parts := regexp_match(
    coalesce(p_topic, ''),
    '^conversation:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}):epoch:([1-9][0-9]*)$'
  );

  IF v_parts IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    v_conversation_id := v_parts[1]::uuid;
    v_epoch := v_parts[2]::bigint;
  EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.vvip_social_conversations AS conversation
    JOIN public.vvip_social_conversation_members AS member
      ON member.conversation_id = conversation.conversation_id
      AND member.member_subject = v_actor
      AND member.membership_state = 'active'
    WHERE conversation.conversation_id = v_conversation_id
      AND conversation.channel_epoch = v_epoch
      AND NOT public.vvip_social_is_blocked_pair(
        conversation.subject_low,
        conversation.subject_high
      )
      AND EXISTS (
        SELECT 1
        FROM public.vvip_social_profile_projection AS peer_profile
        WHERE peer_profile.subject = CASE
          WHEN conversation.subject_low = v_actor THEN conversation.subject_high
          ELSE conversation.subject_low
        END
          AND peer_profile.profile_state = 'active'
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.vvip_social_bump_conversation_epoch_for_block()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_left text;
  v_right text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_left := NEW.blocker_subject;
    v_right := NEW.blocked_subject;
  ELSIF TG_OP = 'DELETE' THEN
    v_left := OLD.blocker_subject;
    v_right := OLD.blocked_subject;
  ELSE
    RAISE EXCEPTION 'SOCIAL_BLOCK_EPOCH_TRIGGER_INVALID_OP';
  END IF;

  UPDATE public.vvip_social_conversations AS conversation SET channel_epoch = conversation.channel_epoch + 1, updated_at = statement_timestamp() WHERE conversation.subject_low = least(v_left, v_right) AND conversation.subject_high = greatest(v_left, v_right);

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER vvip_social_block_conversation_epoch
AFTER INSERT OR DELETE ON public.vvip_social_blocks
FOR EACH ROW EXECUTE FUNCTION public.vvip_social_bump_conversation_epoch_for_block();

-- realtime.messages is Supabase-owned. This migration adds private authorization policies only.
-- Authenticated browser Broadcast INSERT has no policy and remains denied; Presence is ephemeral.
CREATE POLICY vvip_social_realtime_receive_current_epoch
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension IN ('broadcast', 'presence')
  AND public.vvip_social_realtime_topic_authorized(
    (SELECT realtime.topic()),
    extension::text
  )
);

CREATE POLICY vvip_social_realtime_presence_current_epoch
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'presence'
  AND public.vvip_social_realtime_topic_authorized(
    (SELECT realtime.topic()),
    extension::text
  )
);

REVOKE ALL ON FUNCTION public.vvip_social_open_direct_conversation(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_send_message(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_list_messages(uuid, bigint, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_mark_read(uuid, bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_get_channel_ticket(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_realtime_topic_authorized(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vvip_social_bump_conversation_epoch_for_block()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.vvip_social_open_direct_conversation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_send_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_list_messages(uuid, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_mark_read(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_get_channel_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_social_realtime_topic_authorized(text, text) TO authenticated;

COMMENT ON TABLE public.vvip_social_conversations IS
  'CURRENT durable direct-conversation authority. Realtime topics are derived transport epochs only.';
COMMENT ON TABLE public.vvip_social_messages IS
  'CURRENT immutable durable message authority with per-conversation monotonic sequence ordering.';
COMMENT ON TABLE public.vvip_social_read_cursors IS
  'CURRENT monotonic durable read-cursor authority. Browser access is RPC-only.';

COMMIT;

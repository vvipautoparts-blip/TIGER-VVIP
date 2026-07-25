\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(
  condition_value boolean,
  failure_message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition_value IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERTION FAILED: %', failure_message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_error(
  sql_statement text,
  assertion_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE sql_statement;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'PASS expected error: % | SQLSTATE=% | error=%',
        assertion_label,
        SQLSTATE,
        SQLERRM;
      RETURN;
  END;

  RAISE EXCEPTION
    'ASSERTION FAILED: Statement unexpectedly succeeded: %',
    assertion_label;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.expect_sqlstate(
  sql_statement text,
  expected_sqlstate text,
  assertion_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE sql_statement;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE IS DISTINCT FROM expected_sqlstate THEN
        RAISE EXCEPTION
          'ASSERTION FAILED: % | expected SQLSTATE=% actual SQLSTATE=% error=%',
          assertion_label,
          expected_sqlstate,
          SQLSTATE,
          SQLERRM;
      END IF;

      RAISE NOTICE 'PASS expected SQLSTATE: % | SQLSTATE=%',
        assertion_label,
        SQLSTATE;
      RETURN;
  END;

  RAISE EXCEPTION
    'ASSERTION FAILED: Statement unexpectedly succeeded: %',
    assertion_label;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_affected_rows(
  sql_statement text,
  expected_rows bigint,
  assertion_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actual_rows bigint;
BEGIN
  EXECUTE sql_statement;
  GET DIAGNOSTICS actual_rows = ROW_COUNT;

  IF actual_rows IS DISTINCT FROM expected_rows THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % | expected rows=% actual rows=%',
      assertion_label,
      expected_rows,
      actual_rows;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  to_regclass('public.vvip_listings') IS NOT NULL,
  'Global V1 migration must be applied before behavioral RLS verification'
);

INSERT INTO public.vvip_sectors (id, name_ar, name_en, sort_order)
VALUES ('eb002_test_sector', 'قطاع اختبار EB-002', 'EB-002 test sector', 9999);

INSERT INTO public.vvip_categories (id, sector_id, name_ar, name_en, sort_order)
VALUES ('eb002_test_category', 'eb002_test_sector', 'فئة اختبار EB-002', 'EB-002 test category', 9999);

INSERT INTO public.vvip_listings (
  id,
  clerk_user_id,
  sector_id,
  category_id,
  title_ar,
  status
)
VALUES
  (
    'eb002000-0000-4000-8000-000000000001',
    'eb002_user_a',
    'eb002_test_sector',
    'eb002_test_category',
    'إعلان اختبار المستخدم أ',
    'draft'
  ),
  (
    'eb002000-0000-4000-8000-000000000002',
    'eb002_user_b',
    'eb002_test_sector',
    'eb002_test_category',
    'إعلان اختبار المستخدم ب',
    'published'
  ),
  (
    'eb002000-0000-4000-8000-000000000006',
    'eb002_user_c',
    'eb002_test_sector',
    'eb002_test_category',
    'إعلان قيد المراجعة الإدارية',
    'under_review'
  );

INSERT INTO public.vvip_notification_events (
  id,
  recipient_id,
  event_type,
  title_en
)
VALUES
  ('eb002000-0000-4000-8000-000000000011', 'eb002_user_a', 'eb002_test', 'User A notification'),
  ('eb002000-0000-4000-8000-000000000012', 'eb002_user_b', 'eb002_test', 'User B notification');

SELECT
  'API_GRANTS_PRECONDITION' AS check_name,
  CASE
    WHEN has_table_privilege('anon', 'public.vvip_listings', 'SELECT')
      AND has_table_privilege('authenticated', 'public.vvip_listings', 'SELECT,INSERT,UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.vvip_listings', 'DELETE')
    THEN 'PRESENT'
    ELSE 'ABSENT'
  END AS result;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000001'
  ),
  'Anonymous users must not read draft listings'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  ),
  'Anonymous users can read published listings'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_listings (
      id, clerk_user_id, sector_id, category_id, title_ar, status
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000003',
      'eb002_user_a',
      'eb002_test_sector',
      'eb002_test_category',
      'إدخال مجهول مرفوض',
      'draft'
    )
  $sql$,
  'Anonymous users cannot insert listings'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"eb002_user_a","role":"authenticated"}',
  true
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000001'
  ),
  'User A can read their own draft listing'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  ),
  'User A can read user B published listing'
);

INSERT INTO public.vvip_listings (
  id,
  clerk_user_id,
  sector_id,
  category_id,
  title_ar,
  status
)
VALUES (
  'eb002000-0000-4000-8000-000000000004',
  'eb002_user_a',
  'eb002_test_sector',
  'eb002_test_category',
  'إعلان جديد للمستخدم أ',
  'draft'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_listings (
      id, clerk_user_id, sector_id, category_id, title_ar, status
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000005',
      'eb002_user_b',
      'eb002_test_sector',
      'eb002_test_category',
      'انتحال المستخدم ب',
      'draft'
    )
  $sql$,
  'User A cannot create a listing owned by user B'
);

SELECT pg_temp.assert_affected_rows(
  $sql$
    UPDATE public.vvip_listings
    SET title_ar = 'تعديل غير مسموح'
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  $sql$,
  0,
  'User A cannot update user B listing'
);

SELECT pg_temp.expect_error(
  $sql$
    DELETE FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  $sql$,
  'Listings do not expose API delete permission'
);

SELECT pg_temp.expect_error(
  $sql$
    UPDATE public.vvip_listings
    SET clerk_user_id = 'eb002_user_b'
    WHERE id = 'eb002000-0000-4000-8000-000000000001'
  $sql$,
  'WITH CHECK prevents listing ownership reassignment'
);

SELECT pg_temp.expect_error(
  $sql$
    UPDATE public.vvip_listings
    SET status = 'published'
    WHERE id = 'eb002000-0000-4000-8000-000000000001'
  $sql$,
  'H2: listing owner cannot change status directly from draft to published'
);

SELECT
  'H2' AS hypothesis,
  'REJECTED' AS result,
  'Status trigger blocks owner draft-to-published transition' AS evidence;

SELECT pg_temp.assert_affected_rows(
  $sql$
    UPDATE public.vvip_listings
    SET status = 'pending_review'
    WHERE id = 'eb002000-0000-4000-8000-000000000001'
  $sql$,
  1,
  'Listing owner can submit draft for review'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_notification_events
    WHERE id = 'eb002000-0000-4000-8000-000000000011'
  ),
  'User A can read their own notification'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.vvip_notification_events
    WHERE id = 'eb002000-0000-4000-8000-000000000012'
  ),
  'User A cannot read user B notification'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_conversations (
      id, listing_id, participant_a, participant_b
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000022',
      'eb002000-0000-4000-8000-000000000002',
      'eb002_user_a',
      'eb002_user_c'
    )
  $sql$,
  'H1: user cannot select an arbitrary participant for a listing conversation'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_conversations (
      id, participant_a, participant_b
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000023',
      'eb002_user_a',
      'eb002_user_b'
    )
  $sql$,
  'H1: conversation requires a listing context'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_conversations (
      id, listing_id, participant_a, participant_b
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000024',
      'eb002000-0000-4000-8000-000000000001',
      'eb002_user_a',
      'eb002_user_a'
    )
  $sql$,
  'H1: user cannot start a self-conversation'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_conversations (
      id, listing_id, participant_a, participant_b
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000025',
      'eb002000-0000-4000-8000-000000000006',
      'eb002_user_a',
      'eb002_user_c'
    )
  $sql$,
  'H1: user cannot start a conversation for an unpublished listing'
);

INSERT INTO public.vvip_conversations (
  id,
  listing_id,
  participant_a,
  participant_b
)
VALUES (
  'eb002000-0000-4000-8000-000000000021',
  'eb002000-0000-4000-8000-000000000002',
  'eb002_user_a',
  'eb002_user_b'
);

SELECT pg_temp.expect_sqlstate(
  $sql$
    INSERT INTO public.vvip_conversations (
      id, listing_id, participant_a, participant_b
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000026',
      'eb002000-0000-4000-8000-000000000002',
      'eb002_user_a',
      'eb002_user_b'
    )
  $sql$,
  '23505',
  'Duplicate listing conversation is rejected'
);

SELECT pg_temp.expect_sqlstate(
  $sql$
    UPDATE public.vvip_conversations
    SET participant_b = 'eb002_user_c'
    WHERE id = 'eb002000-0000-4000-8000-000000000021'
  $sql$,
  '42501',
  'API participant cannot mutate conversation participants'
);

SELECT pg_temp.expect_sqlstate(
  $sql$
    ALTER TABLE public.vvip_listings
    DISABLE TRIGGER vvip_listings_enforce_status_transition
  $sql$,
  '42501',
  'Authenticated API role cannot disable the listing transition trigger'
);

SELECT
  'H1' AS hypothesis,
  'REJECTED' AS result,
  'Conversation target is derived from the published listing owner' AS evidence;

INSERT INTO public.vvip_messages (
  id,
  conversation_id,
  sender_id,
  content
)
VALUES (
  'eb002000-0000-4000-8000-000000000031',
  'eb002000-0000-4000-8000-000000000021',
  'eb002_user_a',
  'EB-002 user A message'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.vvip_messages (
      id, conversation_id, sender_id, content
    )
    VALUES (
      'eb002000-0000-4000-8000-000000000032',
      'eb002000-0000-4000-8000-000000000021',
      'eb002_user_b',
      'Impersonated user B message'
    )
  $sql$,
  'User A cannot send a message as user B'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"eb002_user_b","role":"authenticated"}',
  true
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_conversations
    WHERE id = 'eb002000-0000-4000-8000-000000000021'
  ),
  'User B can read a conversation where they are a participant'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.vvip_notification_events
    WHERE id = 'eb002000-0000-4000-8000-000000000011'
  ),
  'User B cannot read user A notification'
);

SELECT pg_temp.expect_error(
  $sql$
    UPDATE public.vvip_listings
    SET title_ar = 'تعديل محتوى منشور غير مسموح'
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  $sql$,
  'Owner cannot edit published listing content through the broad update privilege'
);

SELECT pg_temp.assert_affected_rows(
  $sql$
    UPDATE public.vvip_listings
    SET status = 'paused'
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  $sql$,
  1,
  'Owner can apply the published-to-paused contract transition without editing content'
);

RESET ROLE;

SELECT pg_temp.assert_affected_rows(
  $sql$
    UPDATE public.vvip_listings
    SET status = 'published'
    WHERE id = 'eb002000-0000-4000-8000-000000000006'
  $sql$,
  1,
  'Privileged moderation path can publish a listing from under_review'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000006'
      AND status = 'published'
  ),
  'Privileged publication transition persists inside the test transaction'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"eb002_user_c","role":"authenticated"}',
  true
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.vvip_conversations
    WHERE id = 'eb002000-0000-4000-8000-000000000021'
  ),
  'Third party cannot read another users conversation'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM public.vvip_messages
    WHERE id = 'eb002000-0000-4000-8000-000000000031'
  ),
  'Third party cannot read another users message'
);

RESET ROLE;

SELECT pg_temp.expect_sqlstate(
  $sql$
    DELETE FROM public.vvip_listings
    WHERE id = 'eb002000-0000-4000-8000-000000000002'
  $sql$,
  '23503',
  'ON DELETE RESTRICT preserves listing context for active conversations'
);

SELECT
  'PRIVILEGED_PUBLICATION_PATH' AS check_name,
  'PASS' AS result,
  'under_review to published succeeded only after RESET ROLE' AS evidence;

\echo 'Cross-tenant RLS: NOT_APPLICABLE (Global V1 migration defines no tenant or organization relation)'
\echo 'Privileged publication path: PASS (under_review to published executed as postgres in local verification)'
\echo 'Service role was not used as evidence for any user-level assertion'

ROLLBACK;
\set ON_ERROR_STOP on

BEGIN;

SELECT
  current_database() AS database_name,
  current_user AS connected_user,
  now() AT TIME ZONE 'UTC' AS checked_at_utc;

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

CREATE TEMP TABLE eb002_expected_global_v1_tables (
  table_name text PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO eb002_expected_global_v1_tables (table_name)
VALUES
  ('vvip_sectors'),
  ('vvip_categories'),
  ('vvip_listings'),
  ('vvip_listing_status_history'),
  ('vvip_favorites'),
  ('vvip_conversations'),
  ('vvip_messages'),
  ('vvip_notification_events'),
  ('vvip_reports'),
  ('vvip_support_tickets'),
  ('vvip_consents'),
  ('vvip_user_blocks');

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM eb002_expected_global_v1_tables expected
    LEFT JOIN pg_class relation
      ON relation.relname = expected.table_name
    LEFT JOIN pg_namespace namespace
      ON namespace.oid = relation.relnamespace
     AND namespace.nspname = 'public'
    WHERE relation.oid IS NULL
       OR relation.relrowsecurity IS DISTINCT FROM true
  ),
  'Every Global V1 table must exist in public with RLS enabled'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM eb002_expected_global_v1_tables expected
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_policies policy
      WHERE policy.schemaname = 'public'
        AND policy.tablename = expected.table_name
    )
  ),
  'Every Global V1 table must have at least one RLS policy'
);

SELECT
  'RLS_CONFIGURATION' AS check_name,
  'PASS' AS result,
  'All 12 Global V1 tables exist with RLS enabled and at least one policy' AS evidence;

SELECT
  'API_DML_GRANTS' AS check_name,
  CASE
    WHEN has_table_privilege('anon', 'public.vvip_sectors', 'SELECT')
      AND has_table_privilege('anon', 'public.vvip_categories', 'SELECT')
      AND has_table_privilege('anon', 'public.vvip_listings', 'SELECT')
      AND NOT has_table_privilege('anon', 'public.vvip_listings', 'INSERT,UPDATE,DELETE')
      AND has_table_privilege('authenticated', 'public.vvip_listings', 'SELECT,INSERT,UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.vvip_listings', 'DELETE')
      AND has_table_privilege('authenticated', 'public.vvip_conversations', 'SELECT,INSERT')
      AND NOT has_table_privilege('authenticated', 'public.vvip_conversations', 'UPDATE,DELETE')
      AND has_table_privilege('authenticated', 'public.vvip_messages', 'SELECT,INSERT')
      AND NOT has_table_privilege('authenticated', 'public.vvip_messages', 'UPDATE,DELETE')
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  'Required Data API DML grants for representative Global V1 policy paths' AS evidence;

CREATE TEMP TABLE eb002_expected_dml_grants (
  grantee text,
  table_name text,
  privilege_type text,
  PRIMARY KEY (grantee, table_name, privilege_type)
) ON COMMIT DROP;

INSERT INTO eb002_expected_dml_grants (grantee, table_name, privilege_type)
VALUES
  ('anon', 'vvip_sectors', 'SELECT'),
  ('anon', 'vvip_categories', 'SELECT'),
  ('anon', 'vvip_listings', 'SELECT'),
  ('authenticated', 'vvip_sectors', 'SELECT'),
  ('authenticated', 'vvip_categories', 'SELECT'),
  ('authenticated', 'vvip_listings', 'SELECT'),
  ('authenticated', 'vvip_listings', 'INSERT'),
  ('authenticated', 'vvip_listings', 'UPDATE'),
  ('authenticated', 'vvip_listing_status_history', 'SELECT'),
  ('authenticated', 'vvip_favorites', 'SELECT'),
  ('authenticated', 'vvip_favorites', 'INSERT'),
  ('authenticated', 'vvip_favorites', 'DELETE'),
  ('authenticated', 'vvip_conversations', 'SELECT'),
  ('authenticated', 'vvip_conversations', 'INSERT'),
  ('authenticated', 'vvip_messages', 'SELECT'),
  ('authenticated', 'vvip_messages', 'INSERT'),
  ('authenticated', 'vvip_notification_events', 'SELECT'),
  ('authenticated', 'vvip_notification_events', 'UPDATE'),
  ('authenticated', 'vvip_reports', 'SELECT'),
  ('authenticated', 'vvip_reports', 'INSERT'),
  ('authenticated', 'vvip_support_tickets', 'SELECT'),
  ('authenticated', 'vvip_support_tickets', 'INSERT'),
  ('authenticated', 'vvip_consents', 'SELECT'),
  ('authenticated', 'vvip_consents', 'INSERT'),
  ('authenticated', 'vvip_user_blocks', 'SELECT'),
  ('authenticated', 'vvip_user_blocks', 'INSERT'),
  ('authenticated', 'vvip_user_blocks', 'DELETE');

SELECT pg_temp.assert_true(
  NOT EXISTS (
    (
      SELECT grantee, table_name, privilege_type
      FROM eb002_expected_dml_grants
      EXCEPT
      SELECT grants.grantee, grants.table_name, grants.privilege_type
      FROM information_schema.role_table_grants grants
      JOIN eb002_expected_global_v1_tables expected
        ON expected.table_name = grants.table_name
      WHERE grants.table_schema = 'public'
        AND grants.grantee IN ('anon', 'authenticated')
        AND grants.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    )
    UNION ALL
    (
      SELECT grants.grantee, grants.table_name, grants.privilege_type
      FROM information_schema.role_table_grants grants
      JOIN eb002_expected_global_v1_tables expected
        ON expected.table_name = grants.table_name
      WHERE grants.table_schema = 'public'
        AND grants.grantee IN ('anon', 'authenticated')
        AND grants.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      EXCEPT
      SELECT grantee, table_name, privilege_type
      FROM eb002_expected_dml_grants
    )
  ),
  'Global V1 API DML grants must exactly match the least-privilege matrix'
);

SELECT
  'API_DML_GRANT_MATRIX' AS check_name,
  'PASS' AS result,
  'Exact anon/authenticated DML matrix matches 27 expected grants' AS evidence;

\echo '=== APPLICATION TABLES AND RLS STATUS ==='

WITH policy_counts AS (
  SELECT
    schemaname,
    tablename,
    count(*) AS policy_count
  FROM pg_policies
  GROUP BY schemaname, tablename
)
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE(pc.policy_count, 0) AS policy_count
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
LEFT JOIN policy_counts pc
  ON pc.schemaname = n.nspname
 AND pc.tablename = c.relname
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN (
    'pg_catalog',
    'information_schema',
    'pg_toast',
    'auth',
    'storage',
    'extensions',
    'graphql',
    'graphql_public',
    'realtime',
    'supabase_functions',
    'vault'
  )
ORDER BY n.nspname, c.relname;

\echo '=== RLS POLICIES ==='

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname NOT IN (
  'pg_catalog',
  'information_schema',
  'auth',
  'storage',
  'extensions'
)
ORDER BY
  schemaname,
  tablename,
  cmd,
  policyname;

\echo '=== TABLE GRANTS FOR API ROLES ==='

SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN (
  'anon',
  'authenticated',
  'service_role'
)
  AND table_schema NOT IN (
    'pg_catalog',
    'information_schema'
  )
ORDER BY
  table_schema,
  table_name,
  grantee,
  privilege_type;

\echo '=== SECURITY DEFINER FUNCTIONS ==='

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  pg_get_userbyid(p.proowner) AS owner,
  p.proconfig AS function_settings,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname NOT IN (
    'pg_catalog',
    'information_schema'
  )
ORDER BY n.nspname, p.proname;

\echo '=== TABLES WITH API GRANTS BUT RLS DISABLED ==='

SELECT
  DISTINCT
  g.table_schema,
  g.table_name
FROM information_schema.role_table_grants g
JOIN pg_class c
  ON c.relname = g.table_name
JOIN pg_namespace n
  ON n.oid = c.relnamespace
 AND n.nspname = g.table_schema
WHERE g.grantee IN (
  'anon',
  'authenticated'
)
  AND c.relkind IN ('r', 'p')
  AND c.relrowsecurity = false
ORDER BY g.table_schema, g.table_name;

\echo '=== POLICIES USING UNRESTRICTED TRUE CONDITIONS ==='

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname NOT IN (
  'pg_catalog',
  'information_schema',
  'auth',
  'storage'
)
  AND (
    trim(COALESCE(qual, '')) IN ('true', '(true)')
    OR trim(COALESCE(with_check, '')) IN ('true', '(true)')
  )
ORDER BY schemaname, tablename, policyname;

ROLLBACK;
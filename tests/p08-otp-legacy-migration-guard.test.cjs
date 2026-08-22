const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(
  __dirname,
  '../supabase/migrations/20260628_otp_codes_rls_open.sql',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const executableSql = migration.replace(/--.*$/gm, '');

test('no earlier migration creates the historical public.otp_codes table', () => {
  const migrationDirectory = path.dirname(migrationPath);
  const targetName = path.basename(migrationPath);
  const earlierMigrations = fs
    .readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql') && name < targetName)
    .sort();

  assert.ok(earlierMigrations.length > 0, 'expected migrations before the OTP policy migration');

  for (const name of earlierMigrations) {
    const sql = fs.readFileSync(path.join(migrationDirectory, name), 'utf8');
    assert.doesNotMatch(
      sql,
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.otp_codes\b/i,
      `${name} unexpectedly creates public.otp_codes`,
    );
  }

  const historicalSnapshot = fs.readFileSync(
    path.resolve(__dirname, '../supabase-schema.sql'),
    'utf8',
  );
  assert.match(
    historicalSnapshot,
    /create\s+table\s+if\s+not\s+exists\s+public\.otp_codes\b/i,
    'expected only the historical schema snapshot to retain the table definition',
  );
});

test('historical schema snapshot retains legacy OTP only in a fail-closed state', () => {
  const historicalSnapshot = fs.readFileSync(
    path.resolve(__dirname, '../supabase-schema.sql'),
    'utf8',
  );

  const otpPolicyStatements = historicalSnapshot.match(
    /create\s+policy[\s\S]*?\bon\s+public\.otp_codes\b[\s\S]*?;/gi,
  ) || [];

  for (const statement of otpPolicyStatements) {
    assert.doesNotMatch(
      statement,
      /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i,
      'historical snapshot must not grant unconditional direct-client OTP access',
    );
  }

  assert.match(
    historicalSnapshot,
    /drop\s+policy\s+if\s+exists\s+"Users can manage otp by phone"\s+on\s+public\.otp_codes\s*;/i,
    'historical snapshot must remove the legacy permissive OTP policy',
  );
  assert.match(
    historicalSnapshot,
    /revoke\s+all\s+privileges\s+on\s+table\s+public\.otp_codes\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
    'historical snapshot must revoke direct-client OTP table privileges',
  );
});

test('legacy OTP migration is safe when public.otp_codes is absent', () => {
  assert.match(
    executableSql,
    /if\s+to_regclass\s*\(\s*'public\.otp_codes'\s*\)\s+is\s+null\s+then/i,
    'migration must guard the missing legacy relation',
  );

  assert.doesNotMatch(
    executableSql,
    /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.otp_codes\b/i,
    'migration must not create the orphaned legacy table',
  );

  const withoutDynamicSql = executableSql.replace(
    /execute\s+'(?:''|[^'])*'\s*;/gis,
    '',
  );

  assert.doesNotMatch(
    withoutDynamicSql,
    /\b(?:alter\s+table|drop\s+policy|revoke\b[^;]*\bon\s+table)\b[^;]*\bpublic\.otp_codes\b/is,
    'dependent DDL must be dynamic so PostgreSQL does not resolve a missing relation while parsing',
  );
});

test('legacy OTP migration fails closed when public.otp_codes exists', () => {
  const requiredPolicyNames = [
    'Users can manage otp by phone',
    'otp_select_open',
    'otp_insert_open',
    'otp_update_open',
  ];

  assert.match(
    executableSql,
    /execute\s+'ALTER TABLE public\.otp_codes ENABLE ROW LEVEL SECURITY'/i,
    'legacy table must have RLS enabled',
  );

  for (const policyName of requiredPolicyNames) {
    assert.match(
      executableSql,
      new RegExp(
        `execute\\s+'DROP POLICY IF EXISTS (?:"${policyName}"|${policyName})` +
          `[\\s\\S]*?ON public\\.otp_codes'`,
        'i',
      ),
      `legacy permissive policy must be removed: ${policyName}`,
    );
  }

  assert.doesNotMatch(
    executableSql,
    /create\s+policy[\s\S]*?\bon\s+public\.otp_codes\b/i,
    'migration must not recreate a direct-client OTP policy',
  );

  assert.doesNotMatch(
    executableSql,
    /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i,
    'migration must not contain unconditional OTP policy predicates',
  );

  assert.doesNotMatch(
    executableSql,
    /\bgrant\s+[\s\S]*?\bon\s+(?:table\s+)?public\.otp_codes\s+to\s+(?:public|anon|authenticated)\b/i,
    'migration must not widen legacy OTP privileges',
  );

  assert.match(
    executableSql,
    /revoke\s+all\s+privileges\s+on\s+table\s+public\.otp_codes[\s\S]*?from\s+anon\s*,\s*authenticated/i,
    'legacy browser roles must lose direct table privileges',
  );
});

test('migration comments do not overstate authentication unification', () => {
  assert.doesNotMatch(
    migration,
    /Clerk\s+is\s+the\s+sole\b/i,
    'repository audits document remaining non-Clerk authentication paths',
  );
  assert.match(migration, /V2\.0 target identity\/session provider/i);
  assert.match(migration, /runtime unification is not complete/i);
});

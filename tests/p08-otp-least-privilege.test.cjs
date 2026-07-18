const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('a later migration removes all direct client access to public.otp_codes', () => {
  const migrationDirectory = path.resolve(
    __dirname,
    '../supabase/migrations',
  );

  const files = fs
    .readdirSync(migrationDirectory)
    .filter((file) => /^\d{8}_.+\.sql$/.test(file))
    .sort();

  const legacyFile = '20260628_otp_codes_rls_open.sql';
  const legacyIndex = files.indexOf(legacyFile);

  assert.notEqual(
    legacyIndex,
    -1,
    `Expected historical OTP policy migration ${legacyFile}`,
  );

  const laterMigrations = files
    .slice(legacyIndex + 1)
    .map((file, offset) => ({
      file,
      index: legacyIndex + 1 + offset,
      sql: fs.readFileSync(
        path.join(migrationDirectory, file),
        'utf8',
      ),
    }));

  const requiredPolicyNames = [
    'Users can manage otp by phone',
    'otp_select_open',
    'otp_insert_open',
    'otp_update_open',
  ];

  const lockdown = laterMigrations.find(({ sql }) => {
    const enablesRls =
      /alter\s+table\s+public\.otp_codes\s+enable\s+row\s+level\s+security\s*;/i
        .test(sql);

    const dropsEveryLegacyPolicy = requiredPolicyNames.every(
      (policyName) => {
        const escaped = policyName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );

        return new RegExp(
          `drop\\s+policy\\s+if\\s+exists\\s+"${escaped}"` +
            `\\s+on\\s+public\\.otp_codes\\s*;`,
          'i',
        ).test(sql);
      },
    );

    const revokesTableAccess =
      /revoke\s+all(?:\s+privileges)?\s+on\s+table\s+public\.otp_codes\s+from\s+anon\s*,\s*authenticated\s*;/i
        .test(sql);

    const revokesSequenceAccess =
      /revoke\s+all(?:\s+privileges)?\s+on\s+sequence\s+public\.otp_codes_id_seq\s+from\s+anon\s*,\s*authenticated\s*;/i
        .test(sql);

    return (
      enablesRls &&
      dropsEveryLegacyPolicy &&
      revokesTableAccess &&
      revokesSequenceAccess
    );
  });

  assert.ok(
    lockdown,
    'No later migration fully locks down public.otp_codes for direct clients',
  );

  assert.doesNotMatch(
    lockdown.sql,
    /create\s+policy[\s\S]*?\bon\s+public\.otp_codes\b/i,
    `${lockdown.file} must not recreate a direct client OTP policy`,
  );

  assert.doesNotMatch(
    lockdown.sql,
    /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i,
    `${lockdown.file} must not contain unconditional OTP predicates`,
  );

  assert.doesNotMatch(
    lockdown.sql,
    /\bgrant\s+[\s\S]*?\bon\s+(?:table\s+)?public\.otp_codes\s+to\s+(?:anon|authenticated)\b/i,
    `${lockdown.file} must not grant OTP table access back to clients`,
  );

  assert.ok(
    lockdown.index > legacyIndex,
    `${lockdown.file} must run after ${legacyFile}`,
  );
});

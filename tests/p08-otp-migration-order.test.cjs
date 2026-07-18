const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('public.otp_codes is created before any migration references it', () => {
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let firstReferenceIndex = -1;
  let firstCreationIndex = -1;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const content = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8',
    );

    const referencesOtpCodes = /\bpublic\.otp_codes\b/i.test(content);

    const createsOtpCodes =
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.otp_codes\b/i.test(
        content,
      );

    if (referencesOtpCodes && firstReferenceIndex === -1) {
      firstReferenceIndex = index;
    }

    if (createsOtpCodes && firstCreationIndex === -1) {
      firstCreationIndex = index;
    }
  }

  assert.notEqual(
    firstReferenceIndex,
    -1,
    'Expected at least one migration to reference public.otp_codes',
  );

  assert.notEqual(
    firstCreationIndex,
    -1,
    `No migration creates public.otp_codes before it is referenced by ${
      files[firstReferenceIndex]
    }`,
  );

  assert.ok(
    firstCreationIndex <= firstReferenceIndex,
    `public.otp_codes is first referenced by ${
      files[firstReferenceIndex]
    } before it is created by ${files[firstCreationIndex]}`,
  );
});

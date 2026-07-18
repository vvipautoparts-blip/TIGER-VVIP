const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('public.profiles is bootstrapped before use with a Clerk-compatible id', () => {
  const migrationsDir = path.resolve(
    __dirname,
    '../supabase/migrations',
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let creation = null;
  let firstReference = null;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const content = fs.readFileSync(
      path.join(migrationsDir, file),
      'utf8',
    );

    const sql = content.replace(/--.*$/gm, '');

    const createMatch = sql.match(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.profiles\s*\(([\s\S]*?)\);/i,
    );

    if (createMatch && creation === null) {
      creation = {
        file,
        index,
        content: sql,
        tableBody: createMatch[1],
      };
    }

    const referencesProfiles =
      /\balter\s+table\s+public\.profiles\b/i.test(sql) ||
      /\binsert\s+into\s+public\.profiles\b/i.test(sql) ||
      /\bupdate\s+public\.profiles\b/i.test(sql) ||
      /\bfrom\s+public\.profiles\b/i.test(sql) ||
      /\bjoin\s+public\.profiles\b/i.test(sql) ||
      /\bon\s+public\.profiles\b/i.test(sql) ||
      /\bpublic\.profiles%rowtype\b/i.test(sql);

    if (referencesProfiles && firstReference === null) {
      firstReference = {
        file,
        index,
      };
    }
  }

  assert.notEqual(
    firstReference,
    null,
    'Expected at least one migration to reference public.profiles',
  );

  assert.notEqual(
    creation,
    null,
    `No migration creates public.profiles before ${firstReference.file}`,
  );

  assert.ok(
    creation.index <= firstReference.index,
    `public.profiles is first referenced by ${firstReference.file} ` +
      `before it is created by ${creation.file}`,
  );

  assert.match(
    creation.content,
    /create\s+extension\s+if\s+not\s+exists\s+pgcrypto/i,
    `${creation.file} must enable pgcrypto before using gen_random_uuid()`,
  );

  assert.match(
    creation.tableBody,
    /\bid\s+uuid\b[^,\n]*\bdefault\s+gen_random_uuid\s*\(\)/i,
    `${creation.file} must give profiles.id a gen_random_uuid() default`,
  );

  assert.match(
    creation.tableBody,
    /\bid\s+uuid\b[^,\n]*\bprimary\s+key\b/i,
    `${creation.file} must define profiles.id as the primary key`,
  );

  assert.doesNotMatch(
    creation.tableBody,
    /references\s+auth\.users/i,
    `${creation.file} must not bind profiles.id to Supabase auth.users`,
  );
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const PROFILES_BOOTSTRAP = '20260706_public_profiles_bootstrap.sql';
const UNSUPPORTED_POLICY_SYNTAX = /\bcreate\s+policy\s+if\s+not\s+exists\b/i;

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function migrationVersion(file) {
  const match = file.match(/^(\d+)_.*\.sql$/);
  assert.ok(match, `migration filename must begin with a numeric version: ${file}`);
  return match[1];
}

function duplicateMigrationVersions(files) {
  const versions = new Map();

  for (const file of files) {
    const version = migrationVersion(file);
    const entries = versions.get(version) ?? [];
    entries.push(file);
    versions.set(version, entries);
  }

  return [...versions.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([version, entries]) => ({ version, entries }));
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

test('migration version integrity supports the repository historical widths without weakening collision detection', () => {
  assert.equal(migrationVersion('20260702_example.sql'), '20260702');
  assert.equal(migrationVersion('202607200001_example.sql'), '202607200001');
  assert.equal(migrationVersion('20260812070600_example.sql'), '20260812070600');
  assert.throws(
    () => migrationVersion('migration_without_numeric_version.sql'),
    /numeric version/,
  );

  assert.deepEqual(
    duplicateMigrationVersions([
      '20260702_first.sql',
      '20260702_second.sql',
      '202607200001_third.sql',
    ]),
    [
      {
        version: '20260702',
        entries: ['20260702_first.sql', '20260702_second.sql'],
      },
    ],
  );
});

test('every Supabase migration has a numeric version and no duplicate exact version', () => {
  const files = migrationFiles();
  const duplicates = duplicateMigrationVersions(files);

  assert.deepEqual(
    duplicates,
    [],
    [
      'Duplicate Supabase migration versions found:',
      ...duplicates.flatMap(({ version, entries }) => [
        `- version ${version}:`,
        ...entries.map((file) => `  - ${file}`),
      ]),
    ].join('\n'),
  );
});

test('migrations do not use unsupported CREATE POLICY IF NOT EXISTS syntax', () => {
  const findings = migrationFiles().flatMap((file) => {
    const sql = stripSqlComments(
      fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'),
    );

    return sql
      .split(/\r?\n/)
      .map((line, index) => ({
        file,
        line: index + 1,
        text: line.trim(),
      }))
      .filter(({ text }) => UNSUPPORTED_POLICY_SYNTAX.test(text));
  });

  assert.deepEqual(
    findings,
    [],
    [
      'Unsupported PostgreSQL CREATE POLICY IF NOT EXISTS syntax found:',
      ...findings.map(
        ({ file, line, text }) => `- ${file}:${line}: ${text}`,
      ),
    ].join('\n'),
  );
});

test('canonical profiles bootstrap remains provider-independent and precedes profile bridge migrations', () => {
  const files = migrationFiles();
  const profileFiles = files.filter((file) => /profile/i.test(file));

  assert.equal(
    profileFiles[0],
    PROFILES_BOOTSTRAP,
    `canonical profiles bootstrap must be the first profile migration: ${profileFiles.join(', ')}`,
  );

  const bootstrapSql = stripSqlComments(
    fs.readFileSync(path.join(MIGRATIONS_DIR, PROFILES_BOOTSTRAP), 'utf8'),
  );
  const createExtensionIndex = bootstrapSql.search(
    /create\s+extension\s+if\s+not\s+exists\s+pgcrypto/i,
  );
  const createTableIndex = bootstrapSql.search(
    /create\s+table\s+if\s+not\s+exists\s+public\.profiles/i,
  );
  const createMatch = bootstrapSql.match(
    /create\s+table\s+if\s+not\s+exists\s+public\.profiles\s*\(([\s\S]*?)\);/i,
  );

  assert.ok(createExtensionIndex >= 0, `${PROFILES_BOOTSTRAP} must enable pgcrypto`);
  assert.ok(createTableIndex >= 0, `${PROFILES_BOOTSTRAP} must create public.profiles`);
  assert.ok(
    createExtensionIndex < createTableIndex,
    `${PROFILES_BOOTSTRAP} must enable pgcrypto before creating public.profiles`,
  );
  assert.ok(createMatch, `${PROFILES_BOOTSTRAP} must expose a parseable profiles table body`);

  const tableBody = createMatch[1];
  assert.match(
    tableBody,
    /\bid\s+uuid\b[^,\n]*\bdefault\s+gen_random_uuid\s*\(\)[^,\n]*\bprimary\s+key\b/i,
    `${PROFILES_BOOTSTRAP} must keep profiles.id as an internal generated UUID primary key`,
  );
  assert.doesNotMatch(
    tableBody,
    /references\s+auth\.users/i,
    `${PROFILES_BOOTSTRAP} must not bind profiles.id to Supabase auth.users`,
  );
  assert.match(
    bootstrapSql,
    /revoke\s+all\s+on\s+table\s+public\.profiles\s+from\s+public/i,
  );
  assert.match(
    bootstrapSql,
    /revoke\s+all\s+on\s+table\s+public\.profiles\s+from\s+anon/i,
  );
  assert.match(
    bootstrapSql,
    /revoke\s+all\s+on\s+table\s+public\.profiles\s+from\s+authenticated/i,
  );
});

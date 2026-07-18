const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('every Supabase migration has a unique eight-digit version', () => {
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const versions = new Map();
  const invalidNames = [];

  for (const file of files) {
    const match = file.match(/^(\d{8})_.+\.sql$/);

    if (!match) {
      invalidNames.push(file);
      continue;
    }

    const version = match[1];
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath);

    const sha256 = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');

    const entries = versions.get(version) ?? [];

    entries.push({
      file,
      bytes: content.length,
      sha256,
    });

    versions.set(version, entries);
  }

  const duplicates = [...versions.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([version, entries]) => ({
      version,
      entries,
    }));

  assert.deepEqual(
    invalidNames,
    [],
    [
      'Migration filenames must use YYYYMMDD_description.sql:',
      ...invalidNames.map((file) => `- ${file}`),
    ].join('\n'),
  );

  assert.deepEqual(
    duplicates,
    [],
    [
      'Duplicate migration versions found:',
      ...duplicates.flatMap(({ version, entries }) => [
        `- version ${version}:`,
        ...entries.map(
          ({ file, bytes, sha256 }) =>
            `  - ${file} | ${bytes} bytes | sha256=${sha256}`,
        ),
      ]),
    ].join('\n'),
  );
});

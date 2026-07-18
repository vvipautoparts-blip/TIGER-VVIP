const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('migrations do not use unsupported CREATE POLICY IF NOT EXISTS syntax', () => {
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

  const findings = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .flatMap((file) => {
      const content = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8',
      );

      return content
        .split(/\r?\n/)
        .map((line, index) => ({
          file,
          line: index + 1,
          text: line.trim(),
        }))
        .filter(({ text }) =>
          /\bcreate\s+policy\s+if\s+not\s+exists\b/i.test(text),
        );
    });

  assert.deepEqual(
    findings,
    [],
    [
      'Unsupported PostgreSQL policy syntax found:',
      ...findings.map(
        ({ file, line, text }) => `- ${file}:${line}: ${text}`,
      ),
    ].join('\n'),
  );
});

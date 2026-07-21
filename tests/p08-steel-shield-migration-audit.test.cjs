#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p08-audit-'));
const migrations = path.join(tmp, 'migrations');
fs.mkdirSync(migrations, { recursive: true });

fs.writeFileSync(path.join(migrations, '20260101_good.sql'), 'select 1;\n');
fs.writeFileSync(path.join(migrations, '20260101_dup.sql'), 'select 2;\n');
fs.writeFileSync(path.join(migrations, '20260102_empty.sql'), '');
fs.writeFileSync(path.join(migrations, 'badname.sql'), 'select 3;\n');
fs.writeFileSync(path.join(migrations, '20260103_nonl.sql'), 'select 4;');
fs.writeFileSync(path.join(migrations, 'note.txt'), 'unexpected\n');

const res = spawnSync('bash', ['scripts/security/p08-steel-shield/audit-migration-versions.sh', migrations], {
  encoding: 'utf8'
});

assert.notStrictEqual(res.status, 0, 'Audit should fail on malformed fixture');
const output = `${res.stdout}\n${res.stderr}`;
assert.match(output, /DUPLICATE_PREFIX/);
assert.match(output, /EMPTY_FILE/);
assert.match(output, /UNEXPECTED_NON_SQL/);
assert.match(output, /INVALID_FILENAME/);
assert.match(output, /NO_TRAILING_NEWLINE/);

const validMigrations = path.join(tmp, 'valid-migrations');
fs.mkdirSync(validMigrations, { recursive: true });
fs.writeFileSync(
  path.join(validMigrations, '202607200001_project_control_schema.sql'),
  'grant usage on schema project_control to service_role;\n'
);

const validRes = spawnSync(
  'bash',
  ['scripts/security/p08-steel-shield/audit-migration-versions.sh', validMigrations],
  { encoding: 'utf8' }
);

assert.strictEqual(
  validRes.status,
  0,
  `Audit should accept Supabase numeric versions and database role grants:\n${validRes.stdout}\n${validRes.stderr}`
);
console.log('PASS: migration audit detects duplicate/empty/non-sql/bad-name/newline issues');

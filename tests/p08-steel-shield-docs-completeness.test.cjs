#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');

const requiredFiles = [
  'README.md',
  'THREAT_MODEL.md',
  'DATA_LOSS_PREVENTION.md',
  'PRODUCTION_WRITE_GATE.md',
  'BACKUP_RESTORE_ROLLBACK.md',
  'SECRETS_AND_ACCESS_CONTROL.md',
  'MIGRATION_INTEGRITY.md',
  'INCIDENT_RESPONSE.md',
  'THREE_ROUND_VERIFICATION.md'
].map((f) => `docs/security/p08-steel-shield/${f}`);

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(file), `Missing required doc: ${file}`);
}

const readme = fs.readFileSync('docs/security/p08-steel-shield/README.md', 'utf8');
assert.match(readme, /Deny by default/i);
assert.match(readme, /Least privilege/i);
assert.match(readme, /Zero trust/i);
assert.match(readme, /P08 remains incomplete/i);
assert.match(readme, /P09 is not started/i);

const migration = fs.readFileSync('docs/security/p08-steel-shield/MIGRATION_INTEGRITY.md', 'utf8');
assert.match(migration, /Expand -> Migrate -> Verify -> Contract/i);
assert.match(migration, /No irreversible delete/i);
assert.match(migration, /Statement timeout/i);
assert.match(migration, /Lock timeout/i);

const security = fs.readFileSync('docs/security/p08-steel-shield/SECRETS_AND_ACCESS_CONTROL.md', 'utf8');
assert.match(security, /No service_role/i);
assert.match(security, /Clerk/i);
assert.match(security, /Supabase RLS/i);
assert.match(security, /Tiger Care/i);
assert.match(security, /audit logged/i);

console.log('PASS: documentation completeness and mandatory statements validated');

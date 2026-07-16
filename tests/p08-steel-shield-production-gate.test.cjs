#!/usr/bin/env node
const assert = require('assert');
const { spawnSync } = require('child_process');

function run(extraEnv) {
  return spawnSync('bash', ['scripts/security/p08-steel-shield/verify-production-gate.sh'], {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv }
  });
}

let res = run({});
assert.notStrictEqual(res.status, 0, 'Gate must fail by default');
assert.match(res.stdout, /PRODUCTION_GATE:FAIL/);

res = run({
  VVIP_PRODUCTION_WRITE_APPROVED: 'YES',
  VVIP_TARGET_PROJECT_REF: 'proj-ref',
  VVIP_TARGET_ENVIRONMENT: 'production',
  VVIP_APPROVED_COMMIT_SHA: 'a'.repeat(40),
  VVIP_MIGRATION_MANIFEST_VERIFIED: 'YES',
  VVIP_BACKUP_VERIFIED: 'YES',
  VVIP_BACKUP_IDENTIFIER: 'backup-1',
  VVIP_ROLLBACK_REHEARSED: 'YES',
  VVIP_ROLLBACK_COMMAND_DOCUMENTED: 'YES',
  VVIP_SECURITY_REVIEW_PASSED: 'YES'
});
assert.notStrictEqual(res.status, 0, 'Gate must fail when one required variable is missing');

res = run({
  VVIP_PRODUCTION_WRITE_APPROVED: 'YES',
  VVIP_TARGET_PROJECT_REF: 'proj-ref',
  VVIP_TARGET_ENVIRONMENT: 'production',
  VVIP_APPROVED_COMMIT_SHA: 'b'.repeat(40),
  VVIP_MIGRATION_MANIFEST_VERIFIED: 'YES',
  VVIP_BACKUP_VERIFIED: 'YES',
  VVIP_BACKUP_IDENTIFIER: 'backup-2',
  VVIP_ROLLBACK_REHEARSED: 'YES',
  VVIP_ROLLBACK_COMMAND_DOCUMENTED: 'YES',
  VVIP_SECURITY_REVIEW_PASSED: 'YES',
  VVIP_OWNER_FINAL_GATE: 'YES'
});
assert.strictEqual(res.status, 0, 'Gate should pass with complete dummy values');
assert.match(res.stdout, /PRODUCTION_GATE:PASS/);
console.log('PASS: production gate fail-closed and pass behavior validated');

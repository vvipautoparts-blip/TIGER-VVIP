#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p08-secret-'));
const f = path.join(tmp, 'secrets.env');
const token = `ghp_${'1'.repeat(36)}`;
const serviceRoleValue = `service_role_${'a'.repeat(26)}`;
fs.writeFileSync(
  f,
  [
    `SUPABASE_SERVICE_ROLE_KEY="${serviceRoleValue}"`,
    `GITHUB_PAT="${token}"`,
    'JWT_SECRET="very-secret-value-123"'
  ].join('\n') + '\n'
);

const res = spawnSync('bash', ['scripts/security/p08-steel-shield/scan-secret-leaks.sh', tmp], { encoding: 'utf8' });
assert.notStrictEqual(res.status, 0, 'Secret scan should fail when secrets are detected');
assert.match(res.stdout, /\[REDACTED\]/);
assert.doesNotMatch(res.stdout, new RegExp(token), 'Output must not expose full token');
console.log('PASS: secret scanner redacts findings and avoids full secret leakage');

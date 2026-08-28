'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const POLICY = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'project-control/security/federated-identity-policy.v1.json'), 'utf8'),
);

test('first-party email verification Edge runtime remains retired under federated-only identity policy', () => {
  assert.equal(POLICY.status, 'BINDING');
  assert.equal(POLICY.authentication_model, 'FEDERATED_IDENTITY_ONLY');
  assert.equal(POLICY.supabase_password_auth_allowed, false);
  assert.equal(POLICY.data_layer.parallel_supabase_user_password_system_allowed, false);
  assert.equal(
    fs.existsSync(path.join(ROOT, 'supabase/functions/send-verification-email/index.ts')),
    false,
    'send-verification-email must not return as an executable first-party verification backend',
  );
});

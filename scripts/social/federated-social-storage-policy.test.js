'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260819103100_social_media_federated_owner_fix.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');

assert(/drop\s+policy\s+if\s+exists\s+vvip_social_media_object_update/i.test(sql), 'the incompatible update policy must be replaced');
assert(/storage\.foldername\s*\(\s*name\s*\)/i.test(sql), 'storage ownership must use the federated actor folder');
assert(/vvip_marketplace_actor_id\s*\(\s*\)/i.test(sql), 'storage ownership must bind to the Clerk actor subject');
assert(!/auth\.uid\s*\(/i.test(sql), 'social storage must not depend on Supabase Auth UUIDs');

console.log('federated-social-storage-policy.test.js: PASS');

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260818120000_federated_actor_authority_convergence.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

assert(/create\s+or\s+replace\s+function\s+public\.vvip_marketplace_actor_id\s*\(\s*\)/i.test(sql), 'actor authority function must be reproducible from migrations');
assert(/language\s+sql/i.test(sql), 'actor authority must remain a SQL function');
assert(/\bstable\b/i.test(sql), 'actor authority must remain STABLE');
assert(/request\.jwt\.claims/i.test(sql), 'actor authority must derive identity from JWT claims');
assert(/is_anonymous/i.test(sql), 'anonymous sessions must be rejected');
assert(/like\s+'user\\_%'/i.test(sql), 'only Clerk user subjects may become marketplace/social actors');
assert(/revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_actor_id\(\)\s+from\s+public/i.test(sql), 'PUBLIC execute must be revoked');
assert(/grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_actor_id\(\)\s+to\s+anon\s*,\s*authenticated/i.test(sql), 'browser roles may evaluate actor binding, with anonymous calls resolving to NULL');

console.log('federated-actor-authority-migration.test.js: PASS');

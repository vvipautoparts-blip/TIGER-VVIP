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
  '20260819103000_social_production_backend_completion.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');

const requiredTables = [
  'vvip_social_post_media',
  'vvip_social_conversations',
  'vvip_social_conversation_members',
  'vvip_social_messages',
  'vvip_social_notifications',
];

for (const table of requiredTables) {
  assert(new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i').test(sql), `${table} must be created`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must enable RLS`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i').test(sql), `${table} must FORCE RLS`);
}

assert(/social-media/i.test(sql), 'a private social-media storage bucket must be declared');
assert(/vvip_social_create_conversation/i.test(sql), 'conversation creation must be transactional through an RPC');
assert(/vvip_social_send_message/i.test(sql), 'message sending must be guarded through an RPC');
assert(/vvip_social_notification_list/i.test(sql), 'notification reads must use a guarded RPC');
assert(/vvip_social_notification_mark_read/i.test(sql), 'notification read-state mutation must use a guarded RPC');
assert(/revoke\s+all[\s\S]+from\s+public\s*,\s*anon/i.test(sql), 'anonymous/public execution must be revoked');
assert(/storage\.objects/i.test(sql), 'social media storage policies must be explicit');

console.log('production-backend-schema.test.js: PASS');

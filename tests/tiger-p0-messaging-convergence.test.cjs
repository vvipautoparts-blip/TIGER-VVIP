"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const blockMigrationPath = path.join(
  root,
  "supabase/migrations/20260821123000_social_block_privacy_convergence.sql"
);
const messagingMigrationPath = path.join(
  root,
  "supabase/migrations/20260821130000_social_realtime_messaging_convergence.sql"
);

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

test("P0 Messaging requires a current-authority block/privacy prerequisite", () => {
  assert.equal(
    fs.existsSync(blockMigrationPath),
    true,
    "forward block/privacy convergence migration must exist"
  );

  const sql = readIfExists(blockMigrationPath);

  assert.match(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.vvip_social_blocks/i);
  assert.match(sql, /ALTER\s+TABLE\s+public\.vvip_social_blocks\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
  assert.match(sql, /vvip_social_is_blocked_pair/i);
  assert.match(sql, /vvip_social_block_profile/i);
  assert.match(sql, /vvip_social_unblock_profile/i);
  assert.match(sql, /p_peer_profile_id\s+uuid/i);
  assert.match(sql, /vvip_social_actor_active\s*\(\s*\)/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_can_view_post/i);
  assert.match(sql, /vvip_social_is_blocked_pair/i);
  assert.doesNotMatch(sql, /RETURNS[\s\S]{0,800}target_subject/i);
  assert.doesNotMatch(
    sql,
    /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*vvip_social_blocks[\s\S]*authenticated/i
  );
  assert.match(sql, /\^user_\[A-Za-z0-9_-\]\{6,128\}\$/);
  assert.doesNotMatch(sql, /LIKE\s+'user_%'/i);
});

test("P0 Messaging durable authority is RPC-first and browser subject-blind", () => {
  assert.equal(
    fs.existsSync(messagingMigrationPath),
    true,
    "forward durable messaging convergence migration must exist"
  );

  const sql = readIfExists(messagingMigrationPath);
  const durableTables = [
    "vvip_social_conversations",
    "vvip_social_conversation_members",
    "vvip_social_messages",
    "vvip_social_read_cursors",
  ];

  for (const tableName of durableTables) {
    assert.match(
      sql,
      new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${tableName}`, "i"),
      `${tableName} durable authority must exist`
    );
    assert.match(
      sql,
      new RegExp(`ALTER\\s+TABLE\\s+public\\.${tableName}\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i"),
      `${tableName} must FORCE RLS`
    );
    assert.doesNotMatch(
      sql,
      new RegExp(`GRANT\\s+(?:SELECT|INSERT|UPDATE|DELETE)[\\s\\S]*?public\\.${tableName}[\\s\\S]*?TO\\s+authenticated`, "i"),
      `${tableName} must not expose direct browser CRUD`
    );
  }

  for (const rpc of [
    "vvip_social_open_direct_conversation",
    "vvip_social_send_message",
    "vvip_social_list_messages",
    "vvip_social_mark_read",
    "vvip_social_get_channel_ticket",
  ]) {
    assert.match(sql, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${rpc}\\s*\\(`, "i"));
  }

  assert.match(
    sql,
    /vvip_social_open_direct_conversation\s*\(\s*p_peer_profile_id\s+uuid/i,
    "browser conversation opening must use an opaque profile UUID"
  );
  assert.doesNotMatch(sql, /p_peer_subject/i);

  for (const field of [
    "sender_profile_id",
    "sender_display_name",
    "sender_avatar_url",
    "sender_available",
  ]) {
    assert.match(sql, new RegExp(field, "i"), `${field} safe presentation field must exist`);
  }

  for (const counter of [
    "channel_epoch",
    "membership_version",
    "next_sequence",
    "last_message_sequence",
  ]) {
    assert.match(sql, new RegExp(counter, "i"), `${counter} conversation invariant must exist`);
  }

  assert.match(
    sql,
    /UNIQUE\s*\(\s*conversation_id\s*,\s*sequence\s*\)/i,
    "message sequence must be unique inside a conversation"
  );
  assert.match(
    sql,
    /UNIQUE\s*\(\s*conversation_id\s*,\s*sender_subject\s*,\s*client_message_id\s*\)/i,
    "send retries must be idempotent per conversation and sender"
  );

  assert.doesNotMatch(sql, /'sender_subject'\s*,/i);
  assert.doesNotMatch(sql, /'member_subject'\s*,/i);
  assert.doesNotMatch(sql, /RETURNS\s+TABLE\s*\([^)]*sender_subject/is);
  assert.doesNotMatch(sql, /RETURNS\s+TABLE\s*\([^)]*member_subject/is);
});

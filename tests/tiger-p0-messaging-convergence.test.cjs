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

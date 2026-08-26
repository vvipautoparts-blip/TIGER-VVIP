"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260824120000_social_messaging_surface.sql";
const workflowPath = ".github/workflows/tiger-social-db-rehearsal.yml";
const behaviorPath = "tests/sql/tiger-p0-messaging-surface.sql";

test("Messaging surface forward migration and exact-head database proof are wired", () => {
  assert.equal(fs.existsSync(migrationPath), true, "forward-only messaging surface migration must exist");

  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /20260824120000_social_messaging_surface\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-p0-messaging-surface\.sql/);
  assert.match(workflow, /Prove P0 Messaging conversation surface behavior/);
});

test("Messaging surface database proof covers safe discovery, unread, block, and lifecycle behavior", () => {
  const behavior = fs.readFileSync(behaviorPath, "utf8");

  assert.match(behavior, /P0_MESSAGING_SURFACE_RPC_BOUNDARY=PASS/);
  assert.match(behavior, /P0_MESSAGING_SURFACE_MALFORMED_MEMBERSHIP_HIDDEN=PASS/);
  assert.match(behavior, /P0_MESSAGING_CONTACT_DISCOVERY_SAFE=PASS/);
  assert.match(behavior, /P0_MESSAGING_CONVERSATION_DISCOVERY_SAFE=PASS/);
  assert.match(behavior, /P0_MESSAGING_SURFACE_READ_STATE=PASS/);
  assert.match(behavior, /P0_MESSAGING_SURFACE_BLOCK_STATE=PASS/);
  assert.match(behavior, /P0_MESSAGING_SURFACE_INACTIVE_TOMBSTONE=PASS/);
  assert.match(behavior, /position\('user_surfacealice01'/);
  assert.match(behavior, /position\('user_surfacebob001'/);
  assert.match(behavior, /TIGER_P0_MESSAGING_SURFACE_DB_BEHAVIOR=PASS/);
  assert.match(behavior, /rollback;/i);
});

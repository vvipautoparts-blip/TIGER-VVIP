"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");
const behavior = fs.readFileSync("tests/sql/tiger-social-core-foundation.sql", "utf8");

test("Social DB rehearsal is exact-head and local-only", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /Checkout exact source SHA/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("Social DB rehearsal applies behavioral privacy proof and always stops local stack", () => {
  assert.match(workflow, /tests\/sql\/tiger-social-core-foundation\.sql/);
  assert.match(workflow, /psql/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /supabase stop --no-backup/);
});

test("behavior proof covers friend visibility and isolation from a third actor", () => {
  assert.match(behavior, /user_alice/);
  assert.match(behavior, /user_bob/);
  assert.match(behavior, /user_charlie/);
  assert.match(behavior, /audience.*friends/is);
  assert.match(behavior, /relationship_state.*friends/is);
  assert.match(behavior, /BOB_CAN_READ_FRIEND_POST/);
  assert.match(behavior, /CHARLIE_CANNOT_READ_FRIEND_POST/);
  assert.match(behavior, /ONLY_ME_IS_OWNER_ONLY/);
  assert.match(behavior, /ROLLBACK/);
});

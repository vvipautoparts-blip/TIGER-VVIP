"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");
const foundationBehavior = fs.readFileSync("tests/sql/tiger-social-core-foundation.sql", "utf8");
const reactionBehavior = fs.readFileSync("tests/sql/tiger-social-reactions.sql", "utf8");

test("Social DB rehearsal is exact-head and local-only", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /Checkout exact source SHA/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("Social DB rehearsal applies foundation and reaction behavioral proofs and always stops local stack", () => {
  assert.match(workflow, /tests\/sql\/tiger-social-core-foundation\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-reactions\.sql/);
  assert.match(workflow, /tiger-social-reactions-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /psql/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /supabase stop --no-backup/);
});

test("foundation behavior proof covers friend visibility and isolation from a third actor", () => {
  assert.match(foundationBehavior, /user_alice/);
  assert.match(foundationBehavior, /user_bob/);
  assert.match(foundationBehavior, /user_charlie/);
  assert.match(foundationBehavior, /audience.*friends/is);
  assert.match(foundationBehavior, /relationship_state.*friends/is);
  assert.match(foundationBehavior, /BOB_CAN_READ_FRIEND_POST/);
  assert.match(foundationBehavior, /CHARLIE_CANNOT_READ_FRIEND_POST/);
  assert.match(foundationBehavior, /ONLY_ME_IS_OWNER_ONLY/);
  assert.match(foundationBehavior, /ROLLBACK/);
});

test("reaction behavior proof covers least privilege, upsert, visibility, and friendship revocation", () => {
  assert.match(reactionBehavior, /REACTIONS_NO_DIRECT_BROWSER_CRUD=PASS/);
  assert.match(reactionBehavior, /REACTIONS_RPC_BOUNDARY=PASS/);
  assert.match(reactionBehavior, /REACTION_UPSERT_SINGLE_ROW=PASS/);
  assert.match(reactionBehavior, /REACTION_SUMMARY_MINIMUM_TRUTH=PASS/);
  assert.match(reactionBehavior, /REACTION_VISIBILITY_BOUNDARY=PASS/);
  assert.match(reactionBehavior, /FRIEND_REACTION_ELIGIBILITY_REVOKED=PASS/);
  assert.match(reactionBehavior, /TIGER_SOCIAL_REACTIONS_DB_BEHAVIOR=PASS/);
  assert.match(reactionBehavior, /ROLLBACK/);
});

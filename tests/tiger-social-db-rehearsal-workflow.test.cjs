"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");
const foundationBehavior = fs.readFileSync("tests/sql/tiger-social-core-foundation.sql", "utf8");
const reactionBehavior = fs.readFileSync("tests/sql/tiger-social-reactions.sql", "utf8");
const commentBehavior = fs.readFileSync("tests/sql/tiger-social-comments.sql", "utf8");
const privacyBehavior = fs.readFileSync("tests/sql/tiger-social-privacy-controls.sql", "utf8");

test("Social DB rehearsal is exact-head and local-only", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /Checkout exact source SHA/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("Social DB rehearsal applies foundation reaction comment and privacy proofs and always stops local stack", () => {
  assert.match(workflow, /tests\/sql\/tiger-social-core-foundation\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-reactions\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-comments\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-privacy-controls\.sql/);
  assert.match(workflow, /tiger-social-reactions-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-social-comments-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-social-privacy-controls-reviewed-migration-hash\.test\.cjs/);
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
  assert.match(foundationBehavior, /rollback;/i);
});

test("reaction behavior proof covers least privilege, upsert, visibility, and friendship revocation", () => {
  assert.match(reactionBehavior, /REACTIONS_NO_DIRECT_BROWSER_CRUD=PASS/);
  assert.match(reactionBehavior, /REACTIONS_RPC_BOUNDARY=PASS/);
  assert.match(reactionBehavior, /REACTION_UPSERT_SINGLE_ROW=PASS/);
  assert.match(reactionBehavior, /REACTION_SUMMARY_MINIMUM_TRUTH=PASS/);
  assert.match(reactionBehavior, /REACTION_VISIBILITY_BOUNDARY=PASS/);
  assert.match(reactionBehavior, /FRIEND_REACTION_ELIGIBILITY_REVOKED=PASS/);
  assert.match(reactionBehavior, /TIGER_SOCIAL_REACTIONS_DB_BEHAVIOR=PASS/);
  assert.match(reactionBehavior, /rollback;/i);
});

test("comment behavior proof covers RPC-only access visibility reply depth and owner mutations", () => {
  assert.match(commentBehavior, /COMMENTS_NO_DIRECT_BROWSER_CRUD=PASS/);
  assert.match(commentBehavior, /COMMENTS_RPC_BOUNDARY=PASS/);
  assert.match(commentBehavior, /COMMENT_LIST_VISIBILITY=PASS/);
  assert.match(commentBehavior, /COMMENT_CREATE_OWNER_BOUND=PASS/);
  assert.match(commentBehavior, /COMMENT_REPLY_ONE_LEVEL=PASS/);
  assert.match(commentBehavior, /COMMENT_REPLY_SAME_POST=PASS/);
  assert.match(commentBehavior, /COMMENT_UPDATE_OWNER_ONLY=PASS/);
  assert.match(commentBehavior, /COMMENT_REMOVE_OWNER_ONLY=PASS/);
  assert.match(commentBehavior, /COMMENT_HIDDEN_POST_DENIED=PASS/);
  assert.match(commentBehavior, /TIGER_SOCIAL_COMMENTS_DB_BEHAVIOR=PASS/);
  assert.match(commentBehavior, /rollback;/i);
});

test("privacy behavior proof covers block isolation mute semantics report secrecy and only-me preservation", () => {
  assert.match(privacyBehavior, /BLOCK_SEVERS_FRIENDSHIP=PASS/);
  assert.match(privacyBehavior, /BLOCK_HIDES_ALL_CROSS_PARTY_POSTS=PASS/);
  assert.match(privacyBehavior, /BLOCKED_RELATIONSHIP_WRITE_WAS_NOT_DENIED/);
  assert.match(privacyBehavior, /BLOCKED_REACTION_WAS_NOT_DENIED/);
  assert.match(privacyBehavior, /BLOCKED_COMMENT_WAS_NOT_DENIED/);
  assert.match(privacyBehavior, /UNBLOCK_NO_FRIENDSHIP_RESURRECTION=PASS/);
  assert.match(privacyBehavior, /MUTE_SUPPRESSES_FEED=PASS/);
  assert.match(privacyBehavior, /MUTE_IS_NOT_AUTHORIZATION_BOUNDARY=PASS/);
  assert.match(privacyBehavior, /REPORT_TABLE_READ_WAS_NOT_DENIED/);
  assert.match(privacyBehavior, /ONLY_ME_PRIVACY_PRESERVED=PASS/);
  assert.match(privacyBehavior, /TIGER_SOCIAL_PRIVACY_PROOF=PASS/);
  assert.match(privacyBehavior, /rollback;/i);
});

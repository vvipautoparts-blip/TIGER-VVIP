"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");
const foundationBehavior = fs.readFileSync("tests/sql/tiger-social-core-foundation.sql", "utf8");
const reactionBehavior = fs.readFileSync("tests/sql/tiger-social-reactions.sql", "utf8");
const commentBehavior = fs.readFileSync("tests/sql/tiger-social-comments.sql", "utf8");
const ownerProfileBehavior = fs.readFileSync("tests/sql/tiger-profile-owner-boundary.sql", "utf8");
const lifecycleBehavior = fs.readFileSync("tests/sql/tiger-profile-lifecycle-boundary.sql", "utf8");

test("Social DB rehearsal is exact-head and local-only", () => {
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /Checkout exact source SHA/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("Social DB rehearsal applies social and profile proofs and always stops local stack", () => {
  assert.match(workflow, /tests\/sql\/tiger-social-core-foundation\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-reactions\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-social-comments\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-public-profile-projection\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-profile-owner-boundary\.sql/);
  assert.match(workflow, /tests\/sql\/tiger-profile-lifecycle-boundary\.sql/);
  assert.match(workflow, /tiger-social-reactions-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-social-comments-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-public-profile-projection-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-profile-owner-boundary-reviewed-migration-hash\.test\.cjs/);
  assert.match(workflow, /tiger-profile-lifecycle-boundary-reviewed-migration-hash\.test\.cjs/);
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

test("owner profile behavior proof covers self-only mutation and lifecycle fail-closed semantics", () => {
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_NO_DIRECT_BROWSER_CRUD=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_RPC_BOUNDARY=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_SELF_CREATE=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_SELF_READ=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_CROSS_USER_ISOLATION=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_DEACTIVATED_MUTATION_DENIED=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_DELETED_MUTATION_DENIED=PASS/);
  assert.match(ownerProfileBehavior, /OWNER_PROFILE_LIFECYCLE_PRESERVED=PASS/);
  assert.match(ownerProfileBehavior, /TIGER_PROFILE_OWNER_BOUNDARY_DB_BEHAVIOR=PASS/);
  assert.match(ownerProfileBehavior, /rollback;/i);
});

test("profile lifecycle proof covers self transitions, public visibility, trusted tombstone, and terminal deletion", () => {
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_NO_DIRECT_BROWSER_CRUD=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_RPC_BOUNDARY=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_SELF_DEACTIVATE=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DEACTIVATE_IDEMPOTENT=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DEACTIVATED_PUBLIC_HIDDEN=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DEACTIVATED_MUTATION_DENIED=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_SELF_REACTIVATE=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_REACTIVATE_IDEMPOTENT=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_REACTIVATED_PUBLIC_VISIBLE=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_BROWSER_DELETE_DENIED=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_TRUSTED_DELETE=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DELETE_TOMBSTONE=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DELETED_PUBLIC_HIDDEN=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DELETED_REACTIVATION_DENIED=PASS/);
  assert.match(lifecycleBehavior, /PROFILE_LIFECYCLE_DELETED_MUTATION_DENIED=PASS/);
  assert.match(lifecycleBehavior, /TIGER_PROFILE_LIFECYCLE_BOUNDARY_DB_BEHAVIOR=PASS/);
  assert.match(lifecycleBehavior, /rollback;/i);
});

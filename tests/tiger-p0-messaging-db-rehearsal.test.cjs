"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");
const behavior = fs.readFileSync("tests/sql/tiger-p0-messaging-convergence.sql", "utf8");

test("P0 messaging is wired into the exact-head local-only Social DB rehearsal", () => {
  assert.match(workflow, /20260821123000_social_block_privacy_convergence\.sql/);
  assert.match(workflow, /20260821130000_social_realtime_messaging_convergence\.sql/);
  assert.match(workflow, /tests\/tiger-p0-messaging-convergence\.test\.cjs/);
  assert.match(workflow, /tests\/tiger-runtime-adapters-messaging\.test\.cjs/);
  assert.match(workflow, /tests\/tiger-messaging-read-model\.test\.cjs/);
  assert.match(workflow, /tests\/tiger-p0-messaging-db-rehearsal\.test\.cjs/);
  assert.match(workflow, /tests\/sql\/tiger-p0-messaging-convergence\.sql/);
  assert.match(workflow, /Prove P0 Messaging durable and privacy behavior/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.doesNotMatch(workflow, /supabase db push|--linked|SUPABASE_ACCESS_TOKEN:\s*\$\{\{/);
});

test("P0 messaging behavioral proof covers durable truth, privacy fencing, lifecycle, and no-subject presentation", () => {
  assert.match(behavior, /P0_MESSAGING_RPC_ONLY_BOUNDARY=PASS/);
  assert.match(behavior, /P0_MESSAGING_CONVERSATION_IDENTITY_SAFE=PASS/);
  assert.match(behavior, /P0_MESSAGING_IDEMPOTENT_SEND=PASS/);
  assert.match(behavior, /P0_MESSAGING_MONOTONIC_SEQUENCE=PASS/);
  assert.match(behavior, /P0_MESSAGING_ACTIVE_READ_SAFE=PASS/);
  assert.match(behavior, /P0_MESSAGING_MONOTONIC_READ_CURSOR=PASS/);
  assert.match(behavior, /P0_MESSAGING_INITIAL_EPOCH_AUTHORIZED=PASS/);
  assert.match(behavior, /P0_MESSAGING_BLOCK_EPOCH_FENCED=PASS/);
  assert.match(behavior, /P0_MESSAGING_BLOCK_SEND_AND_TICKET_DENIED=PASS/);
  assert.match(behavior, /P0_MESSAGING_HISTORY_SURVIVES_BLOCK=PASS/);
  assert.match(behavior, /P0_MESSAGING_UNBLOCK_NEW_EPOCH=PASS/);
  assert.match(behavior, /P0_MESSAGING_BLOCK_REMOVES_FRIENDSHIP=PASS/);
  assert.match(behavior, /P0_MESSAGING_EXISTING_CONVERSATION_RESUMES=PASS/);
  assert.match(behavior, /P0_MESSAGING_DEACTIVATED_TOMBSTONE=PASS/);
  assert.match(behavior, /P0_MESSAGING_INACTIVE_PEER_SEND_AND_TICKET_DENIED=PASS/);
  assert.match(behavior, /P0_MESSAGING_INACTIVE_ACTOR_DENIED=PASS/);
  assert.match(behavior, /P0_MESSAGING_REACTIVATION_RESUMES=PASS/);
  assert.match(behavior, /P0_MESSAGING_DELETED_TOMBSTONE=PASS/);
  assert.match(behavior, /P0_MESSAGING_DELETED_PEER_SEND_AND_TICKET_DENIED=PASS/);
  assert.match(behavior, /TIGER_P0_MESSAGING_CONVERGENCE_DB_BEHAVIOR=PASS/);
  assert.match(behavior, /position\('user_msgalice01'/);
  assert.match(behavior, /position\('user_msgbob001'/);
  assert.match(behavior, /sender_subject/);
  assert.match(behavior, /rollback;/i);
});

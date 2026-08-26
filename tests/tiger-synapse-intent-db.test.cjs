"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260818150000_synapse_intent_foundation.sql";

test("S1 intent migration is RLS-only through bounded actor-bound RPCs", () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table public\.vvip_synapse_intents/i);
  assert.match(sql, /actor_subject text not null/i);
  assert.match(sql, /activation_mode text not null check \(activation_mode in \('PRIVATE_LOCAL', 'ASSISTED', 'LIVE_NETWORK'\)\)/i);
  assert.match(sql, /status text not null[\s\S]*?check \(status in \('CONFIRMED', 'MATCHING', 'ACTIVE', 'PAUSED', 'REJECTED', 'CANCELLED', 'EXPIRED'\)\)/i);
  assert.match(sql, /expires_at timestamptz not null/i);
  assert.match(sql, /revision integer not null default 0/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_synapse_intents from public, anon, authenticated/i);
  assert.match(sql, /create function public\.vvip_synapse_intent_create/i);
  assert.match(sql, /create function public\.vvip_synapse_intent_transition/i);
  assert.match(sql, /public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(sql, /p_explicit_confirmation/i);
  assert.match(sql, /grant execute on function public\.vvip_synapse_intent_create/i);
  assert.match(sql, /grant execute on function public\.vvip_synapse_intent_transition/i);
  assert.doesNotMatch(sql, /auth\.uid\s*\(/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_synapse_intents.*authenticated/i);
});

test("S1 intent migration encodes terminal states, expiry, revision, and private-data boundaries", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /status in \('CONFIRMED', 'MATCHING', 'ACTIVE', 'PAUSED', 'REJECTED', 'CANCELLED', 'EXPIRED'\)/i);
  assert.match(sql, /expires_at > created_at/i);
  assert.match(sql, /p_expected_revision/i);
  assert.match(sql, /INTENT_REVISION_CONFLICT/i);
  assert.match(sql, /INTENT_TERMINAL/i);
  assert.match(sql, /LIVE_NETWORK/i);
  assert.match(sql, /INTENT_CONFIRMATION_REQUIRED/i);
  assert.match(sql, /PRIVATE_LOCAL/i);
  assert.match(sql, /required_constraints jsonb/i);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const MIGRATION = 'supabase/migrations/20260818125000_social_core_foundation.sql';

function sql() {
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('Social Core foundation creates posts and pair-unique relationships without reviving legacy feed_posts', () => {
  const text = sql();

  assert.match(text, /create table public\.vvip_social_posts/i);
  assert.match(text, /create table public\.vvip_social_relationships/i);
  assert.match(text, /generated always as \(least\(requester_subject, addressee_subject\)\) stored/i);
  assert.match(text, /generated always as \(greatest\(requester_subject, addressee_subject\)\) stored/i);
  assert.match(text, /unique \(subject_low, subject_high\)/i);
  assert.doesNotMatch(text, /create table(?: if not exists)? public\.feed_posts/i);
});

test('Social Core reuses the current Clerk actor authority and never falls back to Supabase auth.uid', () => {
  const text = sql();

  assert.match(text, /public\.vvip_marketplace_actor_id\(\)/i);
  assert.doesNotMatch(text, /auth\.uid\s*\(/i);
  assert.doesNotMatch(text, /current_setting\s*\(\s*['"]request\.jwt/i);
});

test('Social Core tables are force-RLS and anonymous browser mutation is absent', () => {
  const text = sql();

  for (const table of ['vvip_social_posts', 'vvip_social_relationships']) {
    assert.match(text, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(text, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(text, new RegExp(`revoke all privileges on table public\\.${table} from public, anon, authenticated`, 'i'));
  }

  assert.doesNotMatch(text, /grant\s+[^;]+\s+to\s+anon/i);
  assert.doesNotMatch(text, /with check\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(text, /using\s*\(\s*true\s*\)/i);
});

test('post visibility is bounded to public friends and only_me with owner-scoped writes', () => {
  const text = sql();

  assert.match(text, /audience text not null default 'public'/i);
  assert.match(text, /audience in \('public', 'friends', 'only_me'\)/i);
  assert.match(text, /length\(body\) <= 5000/i);
  assert.match(text, /author_subject = \(select public\.vvip_marketplace_actor_id\(\)\)/i);
  assert.match(text, /audience = 'public'/i);
  assert.match(text, /audience = 'friends'/i);
  assert.match(text, /relationship_state = 'friends'/i);
});

test('relationship writes are limited to request, recipient acceptance, cancellation/decline and unfriend semantics', () => {
  const text = sql();

  assert.match(text, /relationship_state text not null default 'pending'/i);
  assert.match(text, /relationship_state in \('pending', 'friends'\)/i);
  assert.match(text, /SOCIAL_AUTH_REQUIRED/);
  assert.match(text, /SOCIAL_REQUESTER_REQUIRED/);
  assert.match(text, /SOCIAL_SELF_RELATIONSHIP_DENIED/);
  assert.match(text, /SOCIAL_RELATIONSHIP_SCOPE_IMMUTABLE/);
  assert.match(text, /SOCIAL_RECIPIENT_ACCEPTANCE_REQUIRED/);
  assert.match(text, /SOCIAL_RELATIONSHIP_TRANSITION_DENIED/);
});

test('legacy feed_posts is explicitly denied as current Social Core authority', () => {
  const text = sql();

  assert.match(text, /feed_posts.*legacy|legacy.*feed_posts/is);
  assert.match(text, /no migration of legacy feed_posts data/i);
});

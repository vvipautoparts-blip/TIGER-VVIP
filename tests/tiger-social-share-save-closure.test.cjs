"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

const postId = "11111111-1111-4111-8111-111111111111";

function recorder() {
  const calls = [];
  return {
    calls,
    client: {
      rpc(name, params) {
        calls.push({ name, params });
        return Promise.resolve({ data: { ok: true }, error: null });
      },
    },
  };
}

test("runtime exposes private bookmark and repost RPC adapters only", async () => {
  const rec = recorder();
  const social = createSocialRuntimeAdapters({ client: rec.client });

  assert.equal(typeof social.bookmarks?.state, "function");
  assert.equal(typeof social.bookmarks?.save, "function");
  assert.equal(typeof social.bookmarks?.remove, "function");
  assert.equal(typeof social.reposts?.create, "function");

  assert.equal((await social.bookmarks.state(postId)).ok, true);
  assert.equal((await social.bookmarks.save(postId)).ok, true);
  assert.equal((await social.bookmarks.remove(postId)).ok, true);
  assert.equal((await social.reposts.create(postId, "friends")).ok, true);

  assert.deepEqual(rec.calls, [
    { name: "vvip_social_bookmark_state", params: { p_post_id: postId } },
    { name: "vvip_social_save_post", params: { p_post_id: postId } },
    { name: "vvip_social_unsave_post", params: { p_post_id: postId } },
    { name: "vvip_social_repost_post", params: { p_original_post_id: postId, p_audience: "friends" } },
  ]);
});

test("bookmark and repost adapters reject malformed input before persistence", async () => {
  const rec = recorder();
  const social = createSocialRuntimeAdapters({ client: rec.client });

  const results = await Promise.all([
    social.bookmarks.state("bad"),
    social.bookmarks.save("bad"),
    social.bookmarks.remove("bad"),
    social.reposts.create("bad", "public"),
    social.reposts.create(postId, "everyone"),
  ]);

  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_/);
  }
  assert.equal(rec.calls.length, 0);
});

test("repost persistence preserves original identity, privacy ceiling, and one active repost per actor", () => {
  const sql = fs.readFileSync("supabase/migrations/20260824111500_social_reposts.sql", "utf8");

  assert.match(sql, /create table public\.vvip_social_reposts/i);
  assert.match(sql, /original_post_id uuid not null references public\.vvip_social_posts \(post_id\) on delete cascade/i);
  assert.match(sql, /repost_post_id uuid not null unique references public\.vvip_social_posts \(post_id\) on delete cascade/i);
  assert.match(sql, /unique \(original_post_id, actor_subject\)/i);
  assert.match(sql, /create function public\.vvip_social_repost_post\(p_original_post_id uuid, p_audience text\)/i);
  assert.match(sql, /SOCIAL_REPOST_AUDIENCE_WIDENING_FORBIDDEN/i);
  assert.match(sql, /public\.vvip_social_can_view_post\(p_original_post_id, v_actor\)/i);
  assert.match(sql, /grant execute on function public\.vvip_social_repost_post\(uuid, text\) to authenticated/i);
});

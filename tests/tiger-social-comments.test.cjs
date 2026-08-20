"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migrationPath = "supabase/migrations/20260818143000_social_comments.sql";
const controllerPath = "scripts/social/comments-controller.js";

test("Social Comments migration exposes bounded RPCs with no direct browser table CRUD", () => {
  assert.equal(fs.existsSync(migrationPath), true, "comments migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table public\.vvip_social_comments/i);
  assert.match(sql, /parent_comment_id uuid/i);
  assert.match(sql, /references public\.vvip_social_posts\s*\(post_id\)\s*on delete cascade/i);
  assert.match(sql, /references public\.vvip_social_comments\s*\(comment_id\)\s*on delete cascade/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all privileges on table public\.vvip_social_comments from public, anon, authenticated/i);

  for (const rpc of [
    "vvip_social_comment_list",
    "vvip_social_comment_create",
    "vvip_social_comment_update",
    "vvip_social_comment_remove",
  ]) {
    assert.match(sql, new RegExp(`create function public\\.${rpc}`, "i"));
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}` , "i"));
  }

  assert.match(sql, /security definer set search_path = pg_catalog/i);
  assert.match(sql, /public\.vvip_social_can_view_post/i);
  assert.match(sql, /parent\.parent_comment_id is null/i);
  assert.match(sql, /char_length\(btrim\(p_body\)\) between 1 and 2000/i);
  assert.match(sql, /parent\.post_id\s*(?:<>|!=)\s*p_post_id/i);
  assert.match(sql, /target\.author_subject\s*(?:<>|!=)\s*v_actor/i);
  assert.doesNotMatch(sql, /auth\.uid\s*\(/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete).*vvip_social_comments.*authenticated/i);
});

test("Social Comments runtime uses only bounded RPCs and never chooses author identity", () => {
  const runtime = require("../scripts/social/runtime-adapters.js");
  assert.equal(typeof runtime.createSocialRuntimeAdapters, "function");

  const calls = [];
  const client = {
    rpc(name, payload) {
      calls.push({ name, payload });
      return Promise.resolve({ data: { ok: true, items: [], total: 0 }, error: null });
    },
  };
  const comments = runtime.createSocialRuntimeAdapters({ client }).comments;
  assert.ok(comments);
  assert.equal(typeof comments.list, "function");
  assert.equal(typeof comments.create, "function");
  assert.equal(typeof comments.update, "function");
  assert.equal(typeof comments.remove, "function");

  return Promise.all([
    comments.list("11111111-1111-4111-8111-111111111111"),
    comments.create("11111111-1111-4111-8111-111111111111", { body: "تعليق" }),
    comments.create("11111111-1111-4111-8111-111111111111", {
      body: "رد",
      parentCommentId: "22222222-2222-4222-8222-222222222222",
    }),
    comments.update("22222222-2222-4222-8222-222222222222", "تعديل"),
    comments.remove("22222222-2222-4222-8222-222222222222"),
  ]).then(() => {
    assert.deepEqual(calls, [
      {
        name: "vvip_social_comment_list_keyset",
        payload: {
          p_post_id: "11111111-1111-4111-8111-111111111111",
          p_cursor: null,
          p_limit: 50,
        },
      },
      {
        name: "vvip_social_comment_create",
        payload: {
          p_post_id: "11111111-1111-4111-8111-111111111111",
          p_body: "تعليق",
          p_parent_comment_id: null,
        },
      },
      {
        name: "vvip_social_comment_create",
        payload: {
          p_post_id: "11111111-1111-4111-8111-111111111111",
          p_body: "رد",
          p_parent_comment_id: "22222222-2222-4222-8222-222222222222",
        },
      },
      {
        name: "vvip_social_comment_update",
        payload: {
          p_comment_id: "22222222-2222-4222-8222-222222222222",
          p_body: "تعديل",
        },
      },
      {
        name: "vvip_social_comment_remove",
        payload: { p_comment_id: "22222222-2222-4222-8222-222222222222" },
      },
    ]);
    assert.equal(calls.some((entry) => entry.payload && Object.hasOwn(entry.payload, "author_subject")), false);
    assert.equal(calls.some((entry) => entry.payload && Object.hasOwn(entry.payload, "actor_subject")), false);
  });
});

test("Social Comments runtime rejects invalid IDs and bodies before RPC execution", async () => {
  const runtime = require("../scripts/social/runtime-adapters.js");
  let calls = 0;
  const comments = runtime.createSocialRuntimeAdapters({
    client: {
      rpc() {
        calls += 1;
        return Promise.resolve({ data: { ok: true }, error: null });
      },
    },
  }).comments;

  assert.ok(comments, "comments runtime adapter must exist before validation tests can pass");

  assert.deepEqual(await comments.list("not-a-uuid"), {
    ok: false,
    code: "SOCIAL_INVALID_POST_ID",
  });
  assert.deepEqual(await comments.create("11111111-1111-4111-8111-111111111111", { body: "   " }), {
    ok: false,
    code: "SOCIAL_INVALID_COMMENT_BODY",
  });
  assert.deepEqual(await comments.create("11111111-1111-4111-8111-111111111111", {
    body: "x".repeat(2001),
  }), {
    ok: false,
    code: "SOCIAL_INVALID_COMMENT_BODY",
  });
  assert.deepEqual(await comments.create("11111111-1111-4111-8111-111111111111", {
    body: "رد",
    parentCommentId: "bad",
  }), {
    ok: false,
    code: "SOCIAL_INVALID_COMMENT_ID",
  });
  assert.deepEqual(await comments.update("bad", "تعديل"), {
    ok: false,
    code: "SOCIAL_INVALID_COMMENT_ID",
  });
  assert.deepEqual(await comments.remove("bad"), {
    ok: false,
    code: "SOCIAL_INVALID_COMMENT_ID",
  });
  assert.equal(calls, 0);
});

test("Home Feed mounts an interactive comments controller and publishes it in the exact public artifact", () => {
  assert.equal(fs.existsSync(controllerPath), true, "comments controller must exist");
  const controller = fs.readFileSync(controllerPath, "utf8");
  const feed = fs.readFileSync("scripts/social/feed-controller.js", "utf8");
  const index = fs.readFileSync("index.html", "utf8");
  const release = fs.readFileSync("tools/vvip_public_release.py", "utf8");

  assert.match(controller, /TIGERSocialComments/);
  assert.match(controller, /data-social-comments-host/);
  assert.match(controller, /data-social-comment-draft/);
  assert.match(controller, /data-social-comment-submit/);
  assert.match(controller, /data-social-comment-reply/);
  assert.match(controller, /data-social-comment-edit/);
  assert.match(controller, /data-social-comment-remove/);
  assert.doesNotMatch(controller, /innerHTML\s*=/);

  assert.match(feed, /data-social-comments-host/);
  assert.doesNotMatch(feed, /comment\.disabled\s*=\s*true/);
  assert.match(index, /scripts\/social\/comments-controller\.js/);
  assert.match(release, /scripts\/social\/comments-controller\.js/);
});

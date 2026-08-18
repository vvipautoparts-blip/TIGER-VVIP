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
    assert.deepEqual(calls.map((entry) => entry.name), [
      "vvip_social_comment_list",
      "vvip_social_comment_create",
      "vvip_social_comment_create",
      "vvip_social_comment_update",
      "vvip_social_comment_remove",
    ]);
    assert.equal(calls.some((entry) => entry.payload && Object.hasOwn(entry.payload, "author_subject")), false);
    assert.equal(calls.some((entry) => entry.payload && Object.hasOwn(entry.payload, "actor_subject")), false);
  });
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

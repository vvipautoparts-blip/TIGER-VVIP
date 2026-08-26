"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const auth = require("../auth-clerk-index.js");

const {
  normalizeComposerDraft,
  createSocialPostComposer,
} = require("../scripts/social/post-composer.js");

function input(value) {
  return {
    value: value || "",
    disabled: false,
    attrs: {},
    setAttribute(name, next) { this.attrs[name] = String(next); },
    removeAttribute(name) { delete this.attrs[name]; },
  };
}

function sheet() {
  return {
    hidden: false,
    attrs: { "aria-hidden": "false" },
    setAttribute(name, value) { this.attrs[name] = String(value); },
  };
}

test("normalizes only the three Social Core audiences and a bounded non-empty body", () => {
  assert.deepEqual(normalizeComposerDraft({ body: "  hello  ", audience: "friends" }), {
    ok: true,
    value: { body: "hello", audience: "friends" },
  });
  assert.equal(normalizeComposerDraft({ body: "", audience: "public" }).ok, false);
  assert.equal(normalizeComposerDraft({ body: "x".repeat(5001), audience: "public" }).ok, false);
  assert.equal(normalizeComposerDraft({ body: "hello", audience: "everyone" }).ok, false);
});

test("composer mirrors the server Unicode whitespace and code-point contract", () => {
  assert.equal(normalizeComposerDraft({ body: "\n\t 　", audience: "public" }).ok, false);
  assert.equal(normalizeComposerDraft({ body: "😀".repeat(5000), audience: "public" }).ok, true);
  assert.equal(normalizeComposerDraft({ body: "😀".repeat(5001), audience: "public" }).ok, false);
});

test("auth intent allowlist accepts only the non-sensitive CREATE_SOCIAL_POST descriptor", () => {
  assert.deepEqual(auth.normalizeIntentDescriptor({ name: "CREATE_SOCIAL_POST" }), { name: "CREATE_SOCIAL_POST" });
  assert.throws(
    () => auth.normalizeIntentDescriptor({ name: "CREATE_SOCIAL_POST", body: "private draft" }),
    { code: "AUTH_INTENT_INVALID" }
  );
});

test("signed-in submit publishes through trusted runtime, clears draft, closes sheet, and refreshes feed", async () => {
  const calls = [];
  let refreshes = 0;
  const draftInput = input("  First social post  ");
  const audienceInput = input("friends");
  const submitButton = input("");
  submitButton.disabled = true;
  const statusHost = input("");
  const postSheet = sheet();

  const composer = createSocialPostComposer({
    draftInput,
    audienceInput,
    submitButton,
    statusHost,
    sheet: postSheet,
    runtime: {
      posts: {
        async create(payload) {
          calls.push(payload);
          return { ok: true, value: { post_id: "post_01" } };
        },
      },
    },
    auth: {
      async requireAuth(descriptor, resume) {
        calls.push(descriptor);
        await resume();
        return true;
      },
    },
    onPublished: async () => { refreshes += 1; },
  });

  assert.equal(composer.sync(), true);
  assert.equal(submitButton.disabled, false);

  const result = await composer.submit();
  assert.deepEqual(result, { ok: true, code: "SOCIAL_POST_PUBLISHED" });
  assert.deepEqual(calls[0], { name: "CREATE_SOCIAL_POST" });
  assert.deepEqual(calls[1], { body: "First social post", audience: "friends" });
  assert.equal(draftInput.value, "");
  assert.equal(postSheet.hidden, true);
  assert.equal(postSheet.attrs["aria-hidden"], "true");
  assert.equal(refreshes, 1);
});

test("unsigned submit preserves the draft while bounded auth handles sign-in", async () => {
  const draftInput = input("keep me");
  const composer = createSocialPostComposer({
    draftInput,
    audienceInput: input("public"),
    submitButton: input(""),
    statusHost: input(""),
    sheet: sheet(),
    runtime: { posts: { create: async () => { throw new Error("must not publish"); } } },
    auth: { requireAuth: async () => false },
  });

  const result = await composer.submit();
  assert.deepEqual(result, { ok: false, code: "SOCIAL_POST_AUTH_REQUIRED" });
  assert.equal(draftInput.value, "keep me");
});

test("persistence failure is generic and does not leak provider details", async () => {
  const statusHost = input("");
  const composer = createSocialPostComposer({
    draftInput: input("hello"),
    audienceInput: input("only_me"),
    submitButton: input(""),
    statusHost,
    sheet: sheet(),
    runtime: {
      posts: {
        async create() {
          return { ok: false, code: "SOCIAL_PERSISTENCE_FAILED:service-role-secret" };
        },
      },
    },
    auth: {
      async requireAuth(_descriptor, resume) {
        await resume();
        return true;
      },
    },
  });

  const result = await composer.submit();
  assert.deepEqual(result, { ok: false, code: "SOCIAL_POST_PUBLISH_FAILED" });
  assert.doesNotMatch(statusHost.textContent, /secret|service-role|persistence/i);
});

test("composer source and public surface keep post body out of auth persistence", () => {
  const source = fs.readFileSync("scripts/social/post-composer.js", "utf8");
  const html = fs.readFileSync("index.html", "utf8");
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");

  assert.doesNotMatch(source, /sessionStorage|localStorage/);
  assert.match(source, /CREATE_SOCIAL_POST/);
  assert.match(html, /data-social-post-audience/);
  assert.doesNotMatch(html, /data-social-post-draft[^>]*maxlength=/i);
  assert.match(html, /scripts\/social\/post-composer\.js/);
  assert.match(builder, /scripts\/social\/post-composer\.js/);
});

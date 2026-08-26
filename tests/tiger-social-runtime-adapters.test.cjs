"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSocialRuntimeAdapters,
  SOCIAL_POSTS_TABLE,
  SOCIAL_RELATIONSHIPS_TABLE,
} = require("../scripts/social/runtime-adapters.js");

function createRecorder(resolver) {
  const calls = [];

  function query(table) {
    const state = { table, operation: null, payload: null, filters: [], order: null, limit: null, selection: null };
    const builder = {
      select(selection) {
        state.selection = selection;
        if (!state.operation) state.operation = "select";
        calls.push({ type: "select", table, selection });
        return builder;
      },
      insert(payload) {
        state.operation = "insert";
        state.payload = payload;
        calls.push({ type: "insert", table, payload });
        return builder;
      },
      update(payload) {
        state.operation = "update";
        state.payload = payload;
        calls.push({ type: "update", table, payload });
        return builder;
      },
      delete() {
        state.operation = "delete";
        calls.push({ type: "delete", table });
        return builder;
      },
      eq(column, value) {
        state.filters.push([column, value]);
        calls.push({ type: "eq", table, column, value });
        return builder;
      },
      order(column, options) {
        state.order = [column, options];
        calls.push({ type: "order", table, column, options });
        return builder;
      },
      limit(value) {
        state.limit = value;
        calls.push({ type: "limit", table, value });
        return builder;
      },
      single() {
        calls.push({ type: "single", table });
        return Promise.resolve(resolver(state));
      },
      then(resolve, reject) {
        return Promise.resolve(resolver(state)).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    client: { from: query },
    calls,
  };
}

test("Social runtime uses only current Social Core tables", () => {
  assert.equal(SOCIAL_POSTS_TABLE, "vvip_social_posts");
  assert.equal(SOCIAL_RELATIONSHIPS_TABLE, "vvip_social_relationships");
  assert.notEqual(SOCIAL_POSTS_TABLE, "feed_posts");
});

test("adapter fails closed when Supabase runtime is unavailable", async () => {
  const social = createSocialRuntimeAdapters({ client: null });

  assert.deepEqual(await social.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_RUNTIME_UNAVAILABLE",
  });
  assert.deepEqual(await social.posts.create({ body: "x", audience: "public" }), {
    ok: false,
    code: "SOCIAL_RUNTIME_UNAVAILABLE",
  });
  assert.deepEqual(await social.relationships.send("user_bob"), {
    ok: false,
    code: "SOCIAL_RUNTIME_UNAVAILABLE",
  });
});

test("create post sends only user content and audience; database owns author identity", async () => {
  const recorder = createRecorder((state) => ({
    data: { post_id: "p1", body: state.payload.body, audience: state.payload.audience },
    error: null,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.create({ body: " مرحباً ", audience: "friends" });
  assert.equal(result.ok, true);

  const insert = recorder.calls.find((call) => call.type === "insert");
  assert.equal(insert.table, "vvip_social_posts");
  assert.deepEqual(insert.payload, { body: "مرحباً", audience: "friends" });
  assert.equal(Object.hasOwn(insert.payload, "author_subject"), false);
  assert.equal(Object.hasOwn(insert.payload, "authorId"), false);
});

test("post text uses Unicode code-point limits and rejects the binding whitespace set", async () => {
  const recorder = createRecorder((state) => ({
    data: { post_id: "p1", body: state.payload.body, audience: state.payload.audience },
    error: null,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.equal((await social.posts.create({ body: " \n\t　", audience: "public" })).ok, false);
  assert.equal((await social.posts.create({ body: "😀".repeat(5000), audience: "public" })).ok, true);
  assert.equal((await social.posts.create({ body: "😀".repeat(5001), audience: "public" })).ok, false);

  const inserts = recorder.calls.filter((call) => call.type === "insert");
  assert.equal(inserts.length, 1);
  assert.equal(Array.from(inserts[0].payload.body).length, 5000);
});

test("friend request sends only addressee; database owns requester and pending default", async () => {
  const recorder = createRecorder(() => ({
    data: { relationship_id: "r1", addressee_subject: "user_bob", relationship_state: "pending" },
    error: null,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.relationships.send("user_bob");
  assert.equal(result.ok, true);

  const insert = recorder.calls.find((call) => call.type === "insert");
  assert.equal(insert.table, "vvip_social_relationships");
  assert.deepEqual(insert.payload, { addressee_subject: "user_bob" });
  assert.equal(Object.hasOwn(insert.payload, "requester_subject"), false);
  assert.equal(Object.hasOwn(insert.payload, "relationship_state"), false);
});

test("accept relationship is the only adapter path that writes friends state", async () => {
  const recorder = createRecorder(() => ({
    data: { relationship_id: "r1", relationship_state: "friends" },
    error: null,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.equal((await social.relationships.accept("r1")).ok, true);

  const updates = recorder.calls.filter((call) => call.type === "update");
  assert.deepEqual(updates, [{
    type: "update",
    table: "vvip_social_relationships",
    payload: { relationship_state: "friends" },
  }]);
  assert.ok(recorder.calls.some((call) => call.type === "eq" && call.column === "relationship_id" && call.value === "r1"));
});

test("relationship removal is server-confirmed and scoped by relationship id", async () => {
  const recorder = createRecorder(() => ({ data: { relationship_id: "r1" }, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.equal((await social.relationships.remove("r1")).ok, true);
  assert.ok(recorder.calls.some((call) => call.type === "delete" && call.table === "vvip_social_relationships"));
  assert.ok(recorder.calls.some((call) => call.type === "eq" && call.column === "relationship_id" && call.value === "r1"));
});

test("feed read is bounded, newest-first, and relies on database RLS for visibility", async () => {
  const recorder = createRecorder(() => ({ data: [{ post_id: "p1" }], error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({ limit: 25 });
  assert.equal(result.ok, true);
  assert.ok(recorder.calls.some((call) => call.type === "select" && call.table === "vvip_social_posts"));
  assert.ok(recorder.calls.some((call) => call.type === "order" && call.column === "created_at" && call.options.ascending === false));
  assert.ok(recorder.calls.some((call) => call.type === "limit" && call.value === 25));
});

test("invalid client inputs fail before any database call", async () => {
  const recorder = createRecorder(() => ({ data: null, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const cases = [
    social.posts.create({ body: "", audience: "public" }),
    social.posts.create({ body: "x", audience: "everyone" }),
    social.relationships.send("bob"),
    social.relationships.accept(""),
    social.relationships.remove("../../r1"),
    social.posts.readFeed({ limit: 0 }),
    social.posts.readFeed({ limit: 101 }),
  ];

  const results = await Promise.all(cases);
  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_/);
  }
  assert.equal(recorder.calls.length, 0);
});

test("database errors and thrown client errors become opaque Social error codes", async () => {
  const dbError = createRecorder(() => ({ data: null, error: { message: "sensitive database detail" } }));
  const socialDbError = createSocialRuntimeAdapters({ client: dbError.client });
  assert.deepEqual(await socialDbError.posts.create({ body: "x", audience: "public" }), {
    ok: false,
    code: "SOCIAL_PERSISTENCE_FAILED",
  });

  const throwingClient = {
    from() {
      throw new Error("secret connection detail");
    },
  };
  const socialThrow = createSocialRuntimeAdapters({ client: throwingClient });
  assert.deepEqual(await socialThrow.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_PERSISTENCE_FAILED",
  });
});

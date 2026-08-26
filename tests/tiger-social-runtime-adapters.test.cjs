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

  function rpc(name, params) {
    const state = { operation: "rpc", name, params };
    calls.push({ type: "rpc", name, params });
    return Promise.resolve(resolver(state));
  }

  return {
    client: { from: query, rpc },
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

test("create post sends only user content and audience through the safe RPC", async () => {
  const recorder = createRecorder((state) => {
    if (state.operation === "rpc") {
      return {
        data: {
          post_id: "p1",
          body: state.params.p_body,
          audience: state.params.p_audience,
          author_profile_id: "11111111-1111-4111-8111-111111111111",
          author_display_name: "Tiger Member",
          author_avatar_url: null,
          author_available: true,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  });
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.create({ body: " مرحباً ", audience: "friends" });
  assert.equal(result.ok, true);

  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_post_create",
    params: { p_body: "مرحباً", p_audience: "friends" },
  }]);
  assert.equal(Object.hasOwn(recorder.calls[0].params, "author_subject"), false);
  assert.equal(Object.hasOwn(recorder.calls[0].params, "authorId"), false);
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

test("feed read is bounded and delegates visibility plus keyset ordering to the actor-bound safe RPC", async () => {
  const recorder = createRecorder((state) => {
    if (state.operation === "rpc") {
      return { data: { ok: true, items: [{ post_id: "p1" }], next_cursor: null }, error: null };
    }
    return { data: null, error: null };
  });
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({ limit: 25 });
  assert.equal(result.ok, true);
  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_feed_read_keyset",
    params: {
      p_cursor: null,
      p_limit: 25,
    },
  }]);
  assert.equal(recorder.calls.some((call) => call.type === "select" && call.table === "vvip_social_posts"), false);
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
    rpc() {
      throw new Error("secret connection detail");
    },
  };
  const socialThrow = createSocialRuntimeAdapters({ client: throwingClient });
  assert.deepEqual(await socialThrow.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_FEED_RETRYABLE",
  });
});

test("comment mutation 429 is reduced to an opaque bounded runtime signal", async () => {
  const recorder = createRecorder(() => ({
    data: null,
    error: { message: "secret provider rate-limit detail" },
    status: 429,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  const postId = "11111111-1111-4111-8111-111111111111";

  const result = await social.comments.create(postId, { body: "تعليق" });

  assert.deepEqual(result, {
    ok: false,
    code: "SOCIAL_RATE_LIMITED",
    retryAfterMs: 5000,
  });
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(recorder.calls.length, 1);
  assert.equal(recorder.calls[0].name, "vvip_social_comment_create");
});

test("messaging runtime exposes only bounded subject-blind RPC calls", async () => {
  const recorder = createRecorder(() => ({ data: { ok: true }, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.ok(social.messaging, "messaging adapter must exist before browser integration");
  assert.equal(typeof social.messaging.open, "function");
  assert.equal(typeof social.messaging.list, "function");
  assert.equal(typeof social.messaging.send, "function");
  assert.equal(typeof social.messaging.markRead, "function");
  assert.equal(typeof social.messaging.getChannelTicket, "function");
  assert.equal(typeof social.messaging.listConversations, "function");
  assert.equal(typeof social.messaging.listContacts, "function");

  const profileId = "11111111-1111-4111-8111-111111111111";
  const conversationId = "22222222-2222-4222-8222-222222222222";
  const clientMessageId = "33333333-3333-4333-8333-333333333333";

  assert.equal((await social.messaging.listConversations({ limit: 20 })).ok, true);
  assert.equal((await social.messaging.listContacts({ limit: 50 })).ok, true);
  assert.equal((await social.messaging.open(profileId)).ok, true);
  assert.equal((await social.messaging.list(conversationId, { afterSequence: 7, limit: 25 })).ok, true);
  assert.equal((await social.messaging.send(conversationId, {
    clientMessageId,
    body: " مرحباً من TIGER ",
  })).ok, true);
  assert.equal((await social.messaging.markRead(conversationId, 8)).ok, true);
  assert.equal((await social.messaging.getChannelTicket(conversationId)).ok, true);

  assert.deepEqual(recorder.calls, [
    {
      type: "rpc",
      name: "vvip_social_list_conversations",
      params: { p_limit: 20 },
    },
    {
      type: "rpc",
      name: "vvip_social_list_message_contacts",
      params: { p_limit: 50 },
    },
    {
      type: "rpc",
      name: "vvip_social_open_direct_conversation",
      params: { p_peer_profile_id: profileId, p_idempotency_key: null },
    },
    {
      type: "rpc",
      name: "vvip_social_list_messages",
      params: { p_conversation_id: conversationId, p_after_sequence: 7, p_limit: 25 },
    },
    {
      type: "rpc",
      name: "vvip_social_send_message",
      params: {
        p_conversation_id: conversationId,
        p_client_message_id: clientMessageId,
        p_body: "مرحباً من TIGER",
      },
    },
    {
      type: "rpc",
      name: "vvip_social_mark_read",
      params: { p_conversation_id: conversationId, p_sequence: 8 },
    },
    {
      type: "rpc",
      name: "vvip_social_get_channel_ticket",
      params: { p_conversation_id: conversationId },
    },
  ]);

  for (const call of recorder.calls) {
    assert.equal(call.type, "rpc", "messaging must never access durable tables directly");
    for (const key of Object.keys(call.params || {})) {
      assert.doesNotMatch(key, /subject/i, "browser messaging params must not carry Clerk subjects");
    }
  }
});

test("messaging runtime rejects malformed UUIDs, cursors, limits, and bodies before persistence", async () => {
  const recorder = createRecorder(() => ({ data: { ok: true }, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.ok(social.messaging, "messaging adapter must exist before validation can be exercised");

  const conversationId = "22222222-2222-4222-8222-222222222222";
  const clientMessageId = "33333333-3333-4333-8333-333333333333";
  const invalidCalls = [
    social.messaging.listConversations({ limit: 0 }),
    social.messaging.listContacts({ limit: 101 }),
    social.messaging.open("user_bob001"),
    social.messaging.list("bad", { afterSequence: 0, limit: 50 }),
    social.messaging.list(conversationId, { afterSequence: -1, limit: 50 }),
    social.messaging.list(conversationId, { afterSequence: 0, limit: 101 }),
    social.messaging.send(conversationId, { clientMessageId: "bad", body: "x" }),
    social.messaging.send(conversationId, { clientMessageId, body: "" }),
    social.messaging.send(conversationId, { clientMessageId, body: "x".repeat(4001) }),
    social.messaging.markRead(conversationId, -1),
    social.messaging.getChannelTicket("bad"),
  ];

  const results = await Promise.all(invalidCalls);
  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_MESSAGE_/);
  }
  assert.equal(recorder.calls.length, 0);
});

test("profile runtime uses only profile UUID RPC boundaries for surface, timeline, and owner save", async () => {
  const recorder = createRecorder(() => ({ data: { ok: true }, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  const profileId = "11111111-1111-4111-8111-111111111111";

  assert.equal((await social.profiles.get()).ok, true);
  assert.equal((await social.profiles.get(profileId)).ok, true);
  assert.equal((await social.profiles.listPosts(profileId, { cursor: null, limit: 25 })).ok, true);
  assert.equal((await social.profiles.save({
    displayName: " Tiger Member ",
    avatarUrl: " https://cdn.example.test/member.webp ",
    businessName: " Tiger Motors ",
    location: " Amman ",
    specialization: " Automotive ",
    businessDescription: " Trusted business profile ",
  })).ok, true);

  assert.deepEqual(recorder.calls, [
    { type: "rpc", name: "vvip_social_get_profile_surface", params: { p_profile_id: null } },
    { type: "rpc", name: "vvip_social_get_profile_surface", params: { p_profile_id: profileId } },
    {
      type: "rpc",
      name: "vvip_social_list_profile_posts",
      params: { p_profile_id: profileId, p_cursor: null, p_limit: 25 },
    },
    {
      type: "rpc",
      name: "vvip_upsert_my_social_profile",
      params: {
        p_display_name: "Tiger Member",
        p_avatar_url: "https://cdn.example.test/member.webp",
        p_business_name: "Tiger Motors",
        p_location: "Amman",
        p_specialization: "Automotive",
        p_business_description: "Trusted business profile",
      },
    },
  ]);

  for (const call of recorder.calls) {
    assert.equal(call.type, "rpc", "profile browser code must not read raw durable tables");
    assert.doesNotMatch(JSON.stringify(call.params), /subject|clerk|user_/i);
  }
});

test("profile runtime rejects identity-bearing input and malformed profile pagination before RPC", async () => {
  const recorder = createRecorder(() => ({ data: { ok: true }, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  const profileId = "11111111-1111-4111-8111-111111111111";

  const results = await Promise.all([
    social.profiles.get("user_profile-owner"),
    social.profiles.listPosts("user_profile-owner", { limit: 20 }),
    social.profiles.listPosts(profileId, { cursor: "bad!", limit: 20 }),
    social.profiles.listPosts(profileId, { limit: 0 }),
    social.profiles.save({ displayName: "Member", subject: "user_private" }),
    social.profiles.save({ displayName: "" }),
    social.profiles.save({ displayName: "x".repeat(161) }),
    social.profiles.save({ displayName: "Member", businessDescription: "x".repeat(2001) }),
  ]);

  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_PROFILE_/);
  }
  assert.equal(recorder.calls.length, 0);
});

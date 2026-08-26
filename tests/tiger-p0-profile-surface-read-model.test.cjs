"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.resolve(__dirname, "../scripts/social/profile-read-model.js");

function loadModel() {
  if (!fs.existsSync(modulePath)) return null;
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function loadedSurface(overrides) {
  return Object.assign({
    ok: true,
    status: "profile_loaded",
    profile: {
      profile_id: "11111111-1111-4111-8111-111111111111",
      display_name: "Tiger Member",
      avatar_url: "https://cdn.example.test/member.webp",
      business_name: "Tiger Motors",
      location: "Amman",
      specialization: "Automotive",
      business_description: "Safe social presentation",
      viewer_is_owner: false,
      friends_count: 4,
      followers_count: 8,
      following_count: 3,
      posts_count: 12,
      is_friend: true,
      can_message: true,
    },
  }, overrides || {});
}

test("Profile read model exports a bounded subject-blind surface", () => {
  assert.equal(fs.existsSync(modulePath), true, "profile read model must exist");
  const model = loadModel();
  assert.equal(typeof model.normalizeProfileSurface, "function");
});

test("active profile surface normalizes safe presentation, counts, and viewer capabilities", () => {
  const model = loadModel();
  const input = loadedSurface();
  const result = model.normalizeProfileSurface(input);

  assert.deepEqual(result, input);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.profile), true);
  assert.doesNotMatch(JSON.stringify(result), /subject|clerk/i);
});

test("unavailable profiles normalize to one non-enumerating state", () => {
  const model = loadModel();
  assert.deepEqual(model.normalizeProfileSurface({
    ok: true,
    status: "profile_unavailable",
    profile: null,
  }), {
    ok: true,
    status: "profile_unavailable",
    profile: null,
  });
});

test("profile surface fails closed on identity fields, malformed counts, or widened owner capabilities", () => {
  const model = loadModel();
  const base = loadedSurface();

  assert.equal(model.normalizeProfileSurface({ ...base, subject: "private" }), null);
  assert.equal(model.normalizeProfileSurface({
    ...base,
    profile: { ...base.profile, owner_subject: "private" },
  }), null);
  assert.equal(model.normalizeProfileSurface({
    ...base,
    profile: { ...base.profile, posts_count: -1 },
  }), null);
  assert.equal(model.normalizeProfileSurface({
    ...base,
    profile: { ...base.profile, viewer_is_owner: true, is_friend: true, can_message: true },
  }), null);
});

test("profile read model rejects any browser payload carrying a Clerk-style identifier", () => {
  const model = loadModel();
  const base = loadedSurface();

  assert.equal(model.normalizeProfileSurface({ ...base, clerk_user_id: "user_profile_owner" }), null);
  assert.equal(model.normalizeProfileSurface({
    ...base,
    profile: { ...base.profile, user_id: "user_profile_owner" },
  }), null);
});

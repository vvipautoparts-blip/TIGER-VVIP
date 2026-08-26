"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../auth-clerk-index.js");

test("active session requires signed-in Clerk user and token-capable session", () => {
  const valid = {
    isSignedIn: true,
    user: { id: "user_sessionvalid01" },
    session: { getToken() { return Promise.resolve("opaque"); } },
  };
  assert.equal(auth.hasActiveSession(valid), true);
  assert.equal(auth.hasActiveSession({ isSignedIn: true, user: valid.user, session: null }), false);
  assert.equal(auth.hasActiveSession({ isSignedIn: true, user: null, session: valid.session }), false);
  assert.equal(auth.hasActiveSession({ isSignedIn: false, user: valid.user, session: valid.session }), false);
  assert.equal(auth.hasActiveSession({ isSignedIn: true, user: { id: "bad" }, session: valid.session }), false);
});

test("recovery remains provider-delegated and no first-party password API is introduced", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync("auth-clerk-index.js", "utf8");
  const account = fs.readFileSync("scripts/fusion/account-surface.js", "utf8");
  const reset = fs.readFileSync("reset-password.html", "utf8");
  assert.match(account, /openUserProfile/);
  assert.match(account, /استعادة الوصول/);
  assert.match(reset, /recovery=provider/);
  assert.doesNotMatch(`${source}\n${account}`, /signInWithPassword|resetPasswordForEmail|sendPasswordResetEmail/);
});

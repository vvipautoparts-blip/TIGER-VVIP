"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const loader = require("../scripts/runtime/vvip-runtime-loader.js");

function key(prefix, host) {
  return `${prefix}_${Buffer.from(host + "$", "utf8").toString("base64url")}`;
}

test("decodes Clerk frontend API from publishable key", () => {
  assert.equal(loader.clerkFrontendApi(key("pk_live", "clerk.example.com")), "clerk.example.com");
});

test("production rejects Clerk test keys", () => {
  assert.throws(() => loader.validateConfig({
    environment: "production",
    clerkPublishableKey: key("pk_test", "demo.clerk.accounts.dev"),
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "sb_publishable_test"
  }), { code: "PRODUCTION_CLERK_KEY_REQUIRED" });
});

test("rejects Supabase secret material in browser config", () => {
  assert.throws(() => loader.validateConfig({
    environment: "candidate",
    clerkPublishableKey: key("pk_test", "demo.clerk.accounts.dev"),
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "service_role_secret"
  }), { code: "SUPABASE_SECRET_KEY_FORBIDDEN" });
});

test("accepts a bounded production public configuration", () => {
  const config = loader.validateConfig({
    environment: "production",
    sourceSha: "abc",
    clerkPublishableKey: key("pk_live", "clerk.example.com"),
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "sb_publishable_test",
    defaultCountryCode: "JO"
  });
  assert.equal(config.clerkFrontendApi, "clerk.example.com");
  assert.equal(config.defaultCountryCode, "JO");
  assert.ok(Object.isFrozen(config));
});

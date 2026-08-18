"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const loader = require("../scripts/runtime/vvip-runtime-loader.js");

function key(prefix, host) {
  return `${prefix}_${Buffer.from(host + "$", "utf8").toString("base64url")}`;
}

function baseConfig(overrides) {
  return Object.assign({
    environment: "candidate",
    clerkPublishableKey: key("pk_test", "demo.clerk.accounts.dev"),
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "sb_publishable_test",
    defaultCountryCode: "JO"
  }, overrides || {});
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
  assert.deepEqual(config.visibilityPlans, []);
  assert.ok(Object.isFrozen(config));
});

test("accepts only country-bound sovereign distribution-credit plans", () => {
  const config = loader.validateConfig(baseConfig({
    visibilityPlans: [{
      id: "jo-2026-v3-10",
      productType: "distribution-credit",
      label: "رصيد توزيع 4,700 ظهور موثق",
      description: "نفس مساحة الإعلان، والفرق فقط في كمية التوزيع.",
      priceMinor: 10000,
      currency: "JOD",
      marketCountry: "JO",
      committedImpressions: 4700,
      pricingVersion: "JO-2026-V3",
      lifecyclePolicyId: "JO-ADS-LIFECYCLE-V1"
    }]
  }));

  assert.equal(config.visibilityPlans.length, 1);
  assert.equal(config.visibilityPlans[0].productType, "distribution-credit");
  assert.equal(config.visibilityPlans[0].committedImpressions, 4700);
  assert.equal(config.visibilityPlans[0].pricingVersion, "JO-2026-V3");
  assert.ok(Object.isFrozen(config.visibilityPlans));
  assert.ok(Object.isFrozen(config.visibilityPlans[0]));
});

test("fails closed when a legacy fixed-duration or tier plan is configured", () => {
  assert.throws(() => loader.validateConfig(baseConfig({
    visibilityPlans: [{
      id: "legacy-royal",
      label: "ROYAL",
      priceMinor: 120000,
      currency: "JOD",
      durationDays: 30,
      tier: "ROYAL"
    }]
  })), { code: "LEGACY_AD_PLAN_FORBIDDEN" });
});

test("fails closed when payment tries to buy visual privilege instead of distribution", () => {
  assert.throws(() => loader.validateConfig(baseConfig({
    visibilityPlans: [{
      id: "pay-to-look-bigger",
      productType: "distribution-credit",
      label: "VIP أكبر",
      priceMinor: 20000,
      currency: "JOD",
      marketCountry: "JO",
      committedImpressions: 9000,
      pricingVersion: "JO-2026-V3",
      lifecyclePolicyId: "JO-ADS-LIFECYCLE-V1",
      visualPriority: true
    }]
  })), { code: "LEGACY_AD_PLAN_FORBIDDEN" });
});

test("rejects an advertising plan for a different active market", () => {
  assert.throws(() => loader.validateConfig(baseConfig({
    visibilityPlans: [{
      id: "sa-plan-in-jo-runtime",
      productType: "distribution-credit",
      label: "رصيد توزيع",
      priceMinor: 1000,
      currency: "SAR",
      marketCountry: "SA",
      committedImpressions: 500,
      pricingVersion: "SA-2026-V1",
      lifecyclePolicyId: "SA-ADS-LIFECYCLE-V1"
    }]
  })), { code: "AD_PLAN_MARKET_MISMATCH" });
});

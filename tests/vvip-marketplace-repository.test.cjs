"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const repo = require("../scripts/runtime/vvip-marketplace-repository.js");

test("normalizes a global listing draft without hard-coded country or currency", () => {
  const value = repo.normalizeDraft({
    sector: "automotive",
    title: "  <b>قطعة أصلية</b>  ",
    summary: "وصف",
    location: "عمّان",
    priceMinor: 1250,
    currencyCode: "jod",
    specifications: { condition: "new" },
    whatsappEnabled: true,
    contactPhone: "+962790000000"
  }, { defaultCountryCode: "JO" });
  assert.equal(value.title, "قطعة أصلية");
  assert.equal(value.currency_code, "JOD");
  assert.equal(value.active_market_country, "JO");
  assert.equal(value.status, "DRAFT");
  assert.equal(value.whatsapp_enabled, true);
  assert.ok(Object.isFrozen(value));
});

test("rejects invalid sectors, countries, currencies, and minor-unit prices", () => {
  const base = { sector: "automotive", title: "عنوان", location: "مكان", priceMinor: 1, currencyCode: "JOD" };
  assert.throws(() => repo.normalizeDraft({ ...base, sector: "other" }, { defaultCountryCode: "JO" }), { code: "LISTING_SECTOR_INVALID" });
  assert.throws(() => repo.normalizeDraft(base, { defaultCountryCode: "JORDAN" }), { code: "LISTING_COUNTRY_INVALID" });
  assert.throws(() => repo.normalizeDraft({ ...base, currencyCode: "JD" }, { defaultCountryCode: "JO" }), { code: "LISTING_CURRENCY_INVALID" });
  assert.throws(() => repo.normalizePriceMinor(1.2), { code: "LISTING_PRICE_INVALID" });
});

test("allows only trusted JPEG and WebP upload extensions", () => {
  assert.equal(repo.extensionForMime("image/jpeg"), "jpg");
  assert.equal(repo.extensionForMime("image/webp"), "webp");
  assert.throws(() => repo.extensionForMime("image/png"), { code: "MEDIA_MIME_INVALID" });
  assert.throws(() => repo.extensionForMime("video/mp4"), { code: "MEDIA_MIME_INVALID" });
});

test("requires authenticated Clerk identity before repository mutation", async () => {
  const client = { from() { throw new Error("must not query"); }, storage: {} };
  const repository = repo.createMarketplaceRepository({ client, clerk: { user: null }, config: { defaultCountryCode: "JO" } });
  await assert.rejects(() => repository.createDraft({}), { code: "AUTH_REQUIRED" });
});

test("repository exposes no browser-side review bypass", () => {
  const client = { from() { return {}; }, storage: {} };
  const repository = repo.createMarketplaceRepository({
    client,
    clerk: { user: { id: "user_owner" } },
    config: { defaultCountryCode: "JO" }
  });
  assert.equal(repository.submitForReview, undefined);
  assert.equal(repository.createAndSubmit, undefined);
  assert.equal(typeof repository.prepareForPublication, "function");
});

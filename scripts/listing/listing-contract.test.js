"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const contract = require("./listing-contract.js");
const repositories = require("./listing-repository.js");

function validInput(overrides) {
  return Object.assign({
    listingId: "lst_01",
    ownerClerkUserId: "user_01",
    sector: "automotive",
    category: "parts",
    title: "  محرك <b>أصلي</b>  ",
    description: "وصف آمن ومفيد للقطعة",
    numericPrice: "١٬٢٣٤٫٥٠",
    currency: "JOD",
    country: "الأردن",
    city: "عمّان",
    area: "ماركا",
    sectorAttributes: { condition: "new", compatibility: "Toyota" },
    status: "draft",
    images: [
      { imageId: "img_1", position: 0, altText: "صورة أولى", mimeType: "image/jpeg", width: 1200, height: 900, sizeBytes: 120000 },
      { imageId: "img_2", position: 1, altText: "صورة ثانية", mimeType: "image/webp", width: 1200, height: 900, sizeBytes: 90000 }
    ],
    coverImageId: "img_1",
    idempotencyKey: "idem_01",
    schemaVersion: 1
  }, overrides || {});
}

test("normalizes Arabic, Persian and English digits deterministically", () => {
  assert.equal(contract.normalizeDigits("١٢٣٤٥٦٧٨٩٠"), "1234567890");
  assert.equal(contract.normalizeDigits("۱۲۳۴۵۶۷۸۹۰"), "1234567890");
  assert.equal(contract.normalizePriceInput("1,234.50"), "1234.50");
  assert.equal(contract.normalizePriceInput("١٬٢٣٤٫٥٠"), "1234.50");
});

test("rejects invalid, zero and negative prices", () => {
  for (const value of ["", "0", "٠", "-1", "12.345", "1e3", "free"]) {
    assert.equal(contract.validatePrice(value).valid, false, String(value));
  }
  assert.deepEqual(contract.validatePrice("٢٥٫٥٠"), { valid: true, value: 25.5 });
});

test("validates sector, category and status", () => {
  assert.equal(contract.validateListing(validInput({ sector: "cars" })).errors[0].code, "invalid_sector");
  assert.equal(contract.validateListing(validInput({ category: "villa" })).errors[0].code, "invalid_category");
  assert.equal(contract.validateListing(validInput({ status: "live" })).errors[0].code, "invalid_status");
});

test("sanitizes title, description and structured attributes", () => {
  const result = contract.createListing(validInput({
    title: "<img src=x onerror=alert(1)> قطعة <script>alert(1)</script>",
    description: "<style>body{display:none}</style><b>وصف</b> <svg/onload=alert(1)>",
    sectorAttributes: { note: "<script>steal()</script> آمن", nested: { ignored: true } }
  }), { now: "2026-07-14T12:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "قطعة");
  assert.equal(result.value.description, "وصف");
  assert.equal(result.value.sectorAttributes.note, "آمن");
  assert.equal(Object.hasOwn(result.value.sectorAttributes, "nested"), false);
  assert.doesNotMatch(JSON.stringify(result.value), /<|>|alert|steal|onerror|onload/iu);
});

test("returns deterministic errors in canonical field order", () => {
  const one = contract.validateListing({});
  const two = contract.validateListing({});
  assert.deepEqual(one.errors, two.errors);
  assert.deepEqual(one.errors.slice(0, 4).map((error) => error.field), [
    "listingId", "ownerClerkUserId", "sector", "category"
  ]);
});

test("creates canonical timestamps and ordered image metadata", () => {
  const result = contract.createListing(validInput(), { now: "2026-07-14T12:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.equal(result.value.normalizedTitle, "محرك أصلي");
  assert.equal(result.value.numericPrice, 1234.5);
  assert.equal(result.value.createdAt, "2026-07-14T12:00:00.000Z");
  assert.equal(result.value.expiresAt, null);
  assert.deepEqual(result.value.images.map((image) => image.position), [0, 1]);
});

test("enforces the seven-image ordered metadata contract and cover membership", () => {
  const tooMany = Array.from({ length: 8 }, (_, position) => ({ imageId: `img_${position}`, position }));
  assert.ok(contract.validateListing(validInput({ images: tooMany, coverImageId: "img_0" })).errors.some((error) => error.code === "too_many_images"));
  assert.ok(contract.validateListing(validInput({ coverImageId: "missing" })).errors.some((error) => error.code === "invalid_cover_image"));
  assert.ok(contract.validateListing(validInput({ images: [{ imageId: "img_1", position: 1 }], coverImageId: "img_1" })).errors.some((error) => error.code === "invalid_image_order"));
});

test("local repository create and update operations are idempotent", async () => {
  const repository = new repositories.LocalListingRepository({ now: () => "2026-07-14T12:00:00.000Z" });
  const created = await repository.create(validInput());
  const repeated = await repository.create(validInput({ title: "ignored retry payload" }));
  assert.deepEqual(repeated, created);
  const updated = await repository.update("lst_01", { title: "عنوان محدث", idempotencyKey: "idem_update_01" }, { ownerClerkUserId: "user_01" });
  const repeatedUpdate = await repository.update("lst_01", { title: "different retry", idempotencyKey: "idem_update_01" }, { ownerClerkUserId: "user_01" });
  assert.deepEqual(repeatedUpdate, updated);
  assert.equal(updated.title, "عنوان محدث");
});

test("local repository is isolated by owner and uses bounded pagination", async () => {
  const repository = new repositories.LocalListingRepository({ now: () => "2026-07-14T12:00:00.000Z" });
  for (let index = 0; index < 55; index += 1) {
    await repository.create(validInput({ listingId: `lst_${String(index).padStart(2, "0")}`, idempotencyKey: `idem_${index}` }));
  }
  const first = await repository.list({ ownerClerkUserId: "user_01", limit: 500 });
  assert.equal(first.items.length, contract.PAGINATION_MAX_LIMIT);
  assert.equal(typeof first.nextCursor, "string");
  const second = await repository.list({ ownerClerkUserId: "user_01", limit: 10, cursor: first.nextCursor });
  assert.equal(second.items.length, 5);
  assert.equal(second.nextCursor, null);
  assert.equal((await repository.getById("lst_01", { ownerClerkUserId: "other" })), null);
});

test("Supabase repository is an interface only", async () => {
  const repository = new repositories.SupabaseListingRepository();
  await assert.rejects(repository.create(validInput()), /adapter_not_configured/);
});

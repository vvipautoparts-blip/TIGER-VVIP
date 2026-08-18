"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../scripts/vvip-production-marketplace.js");

test("converts currencies to safe minor units without floating point drift", () => {
  assert.equal(app.moneyToMinor("12.34", "USD"), 1234);
  assert.equal(app.moneyToMinor("1.250", "JOD"), 1250);
  assert.equal(app.moneyToMinor("500", "JPY"), 500);
  assert.equal(app.moneyToMinor("١٢٫٣٤", "USD"), 1234);
  assert.throws(() => app.moneyToMinor("1.234", "USD"), { code: "PRICE_INVALID" });
});

test("formats external WhatsApp links from bounded digits only", () => {
  assert.equal(app.whatsappUrl("+962 79 000 0000"), "https://wa.me/962790000000");
  assert.throws(() => app.whatsappUrl("12"), { code: "PHONE_INVALID" });
});

test("accepts no more than seven image files and rejects video", () => {
  const image = { type: "image/webp", size: 1024 };
  assert.equal(app.validateFiles(Array(7).fill(image)).length, 7);
  assert.throws(() => app.validateFiles(Array(8).fill(image)), { code: "MEDIA_LIMIT_EXCEEDED" });
  assert.throws(() => app.validateFiles([{ type: "video/mp4", size: 1024 }]), { code: "MEDIA_MIME_INVALID" });
});

test("cleans user-facing text without retaining markup", () => {
  assert.equal(app.cleanText("  <script>x</script> عنوان  ", 20), "x عنوان");
});

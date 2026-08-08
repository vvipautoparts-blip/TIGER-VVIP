"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const api = require("../scripts/runtime/vvip-my-listings.js");

test("maps persisted listing states to clear Arabic labels", () => {
  assert.equal(api.statusLabel("PENDING_REVIEW"), "قيد المراجعة");
  assert.equal(api.statusLabel("active"), "نشط");
  assert.equal(api.statusLabel("other"), "غير معروف");
});

test("removes markup and control characters from account listing copy", () => {
  assert.equal(api.safeText("  <b>إعلان</b>\u0000 تجريبي  ", 80), "إعلان تجريبي");
  assert.equal(api.safeText("123456", 3), "123");
});

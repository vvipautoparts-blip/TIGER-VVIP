"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../auth-clerk-index.js");

test("allows preview only on localhost", () => {
  assert.equal(auth.localPreviewAllowed({ hostname: "localhost", search: "?preview=home" }), true);
  assert.equal(auth.localPreviewAllowed({ hostname: "example.com", search: "?preview=home" }), false);
});

test("allows only bounded internal return paths", () => {
  assert.equal(auth.safeReturnPath({ search: "?return_to=private-profile-p03.html" }), "private-profile-p03.html");
  assert.equal(auth.safeReturnPath({ search: "?return_to=https://evil.example" }), "");
  assert.equal(auth.safeReturnPath({ search: "?return_to=../../admin" }), "");
});

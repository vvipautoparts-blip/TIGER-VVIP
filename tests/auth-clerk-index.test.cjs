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

test("production rejects return paths that are not shipped", () => {
  const production = { environment: "production" };
  assert.equal(auth.safeReturnPath({ search: "?return_to=private-profile-p03.html" }, production), "");
  assert.equal(auth.safeReturnPath({ search: "?return_to=index.html" }, production), "index.html");
});

test("recovery logging never exposes client error details", () => {
  const originalWarn = console.warn;
  const calls = [];
  console.warn = (...args) => calls.push(args);
  try {
    auth.recover({ code: "SENSITIVE_CLIENT_DETAIL" });
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(calls, [["VVIP_CLERK_GATE_RECOVERY"]]);
  assert.equal(JSON.stringify(calls).includes("SENSITIVE_CLIENT_DETAIL"), false);
});

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

test("first-time user gate explicitly enables sign-up with bounded redirects", async () => {
  const originalLocation = global.location;
  const originalDocument = global.document;
  const originalRuntimeReady = global.VVIPRuntimeReady;
  const originalPR29 = global.VVIP_PR29;
  const mounted = [];

  global.location = {
    hostname: "example.com",
    search: "",
    href: "https://example.com/TIGER-VVIP/index.html",
    replace() {}
  };
  global.document = {
    getElementById(id) {
      return id === "clerk-sign-in" ? {} : null;
    }
  };
  global.VVIP_PR29 = { showGate() {}, showHome() {} };
  const clerk = {
    isSignedIn: false,
    mountSignIn(host, props) { mounted.push(props); },
    addListener() {}
  };
  global.VVIPRuntimeReady = Promise.resolve({ clerk });

  try {
    await auth.start();
  } finally {
    global.location = originalLocation;
    global.document = originalDocument;
    global.VVIPRuntimeReady = originalRuntimeReady;
    global.VVIP_PR29 = originalPR29;
  }

  assert.equal(mounted.length, 1);
  assert.equal(mounted[0].withSignUp, true);
  assert.equal(mounted[0].fallbackRedirectUrl, "https://example.com/TIGER-VVIP/index.html");
  assert.equal(mounted[0].forceRedirectUrl, "https://example.com/TIGER-VVIP/index.html");
  assert.equal(mounted[0].signUpFallbackRedirectUrl, "https://example.com/TIGER-VVIP/index.html");
  assert.equal(mounted[0].signUpForceRedirectUrl, "https://example.com/TIGER-VVIP/index.html");
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

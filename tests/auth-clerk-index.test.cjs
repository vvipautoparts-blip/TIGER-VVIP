"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const auth = require("../auth-clerk-index.js");
const source = fs.readFileSync(require.resolve("../auth-clerk-index.js"), "utf8");

function createSessionStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function installBrowserFixture(clerkOverrides) {
  const original = {
    location: global.location,
    document: global.document,
    runtimeReady: global.VVIPRuntimeReady,
    fusionSurface: global.VVIPFusionSurface,
    sessionStorage: global.sessionStorage,
    dispatchEvent: global.dispatchEvent,
    customEvent: global.CustomEvent
  };

  const mounted = [];
  let listener = null;
  let homeCalls = 0;
  let hideHomeCalls = 0;
  const gate = {
    hidden: true,
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    querySelector() { return null; }
  };
  const authError = { textContent: "", hidden: true };
  const host = { innerHTML: "" };
  const storage = createSessionStorage();
  const dispatched = [];

  global.location = {
    hostname: "example.com",
    search: "",
    href: "https://example.com/index.html",
    replace() {}
  };
  global.document = {
    getElementById(id) {
      return id === "clerk-sign-in" ? host : null;
    },
    querySelector(selector) {
      if (selector === "[data-vvip-auth-gate]") return gate;
      if (selector === "[data-auth-error]") return authError;
      return null;
    }
  };
  global.sessionStorage = storage;
  global.VVIPFusionSurface = {
    showHome() { homeCalls += 1; },
    hideHome() { hideHomeCalls += 1; }
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options && options.detail; }
  };
  global.dispatchEvent = (event) => { dispatched.push(event); return true; };

  const clerk = Object.assign({
    isSignedIn: false,
    mountSignIn(node, props) { mounted.push({ node, props }); },
    addListener(callback) { listener = callback; }
  }, clerkOverrides || {});
  if (clerk.isSignedIn === true) {
    clerk.user = clerk.user || { id: "user_authfixture01" };
    clerk.session = clerk.session || { getToken() { return Promise.resolve("opaque"); } };
  }
  global.VVIPRuntimeReady = Promise.resolve({ clerk });

  return {
    clerk,
    mounted,
    gate,
    authError,
    storage,
    dispatched,
    getListener: () => listener,
    getHomeCalls: () => homeCalls,
    getHideHomeCalls: () => hideHomeCalls,
    restore() {
      global.location = original.location;
      global.document = original.document;
      global.VVIPRuntimeReady = original.runtimeReady;
      global.VVIPFusionSurface = original.fusionSurface;
      global.sessionStorage = original.sessionStorage;
      global.dispatchEvent = original.dispatchEvent;
      global.CustomEvent = original.customEvent;
    }
  };
}

test("auth runtime contains no parallel create-listing or PR29 fallback", () => {
  assert.doesNotMatch(source, /CREATE_LISTING/);
  assert.doesNotMatch(source, /VVIP_PR29/);
});

test("does not expose a local preview authentication bypass", () => {
  assert.equal(auth.localPreviewAllowed, undefined);
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

test("normalizes only allowlisted non-sensitive intent descriptors", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(auth.normalizeIntentDescriptor({ name: "CREATE_SOCIAL_POST" }), { name: "CREATE_SOCIAL_POST" });
  assert.deepEqual(auth.normalizeIntentDescriptor({ name: "OPEN_ACCOUNT" }), { name: "OPEN_ACCOUNT" });
  assert.deepEqual(
    auth.normalizeIntentDescriptor({ name: "TOGGLE_FAVORITE", listingId }),
    { name: "TOGGLE_FAVORITE", listingId }
  );
  assert.throws(() => auth.normalizeIntentDescriptor({ name: "CREATE_LISTING" }), { code: "AUTH_INTENT_INVALID" });
  assert.throws(() => auth.normalizeIntentDescriptor({ name: "https://evil.example" }), { code: "AUTH_INTENT_INVALID" });
  assert.throws(() => auth.normalizeIntentDescriptor({ name: "TOGGLE_FAVORITE", listingId: "../../admin" }), { code: "AUTH_INTENT_INVALID" });
  assert.throws(() => auth.normalizeIntentDescriptor({ name: "CREATE_SOCIAL_POST", token: "secret" }), { code: "AUTH_INTENT_INVALID" });
});

test("unsigned start is fail-closed and mounts the authentication gate", async () => {
  const fixture = installBrowserFixture();
  try {
    await auth.start();
    assert.equal(fixture.getHomeCalls(), 0);
    assert.ok(fixture.getHideHomeCalls() >= 1);
    assert.equal(fixture.mounted.length, 1);
    assert.equal(fixture.mounted[0].props.routing, "hash");
    assert.equal(fixture.gate.hidden, false);
    assert.equal(fixture.gate.attrs["aria-hidden"], "false");
  } finally {
    fixture.restore();
  }
});

test("protected action reuses the mounted Clerk gate and persists only the safe intent descriptor", async () => {
  const fixture = installBrowserFixture();
  try {
    await auth.start();
    let resumed = 0;
    assert.equal(await auth.requireAuth({ name: "OPEN_ACCOUNT" }, () => { resumed += 1; }), false);
    assert.equal(await auth.requireAuth({ name: "OPEN_ACCOUNT" }, () => { resumed += 1; }), false);

    assert.equal(resumed, 0);
    assert.equal(fixture.mounted.length, 1);
    assert.equal(fixture.mounted[0].props.routing, "hash");
    assert.equal(fixture.mounted[0].props.oauthFlow, "auto");
    assert.equal(fixture.gate.hidden, false);
    assert.deepEqual(JSON.parse(fixture.storage.getItem("vvip.auth.intent.v1")), { name: "OPEN_ACCOUNT" });
  } finally {
    fixture.restore();
  }
});

test("does not expose continue-without-sign-in escape hatch", () => {
  assert.equal(auth.continueWithoutSignIn, undefined);
});

test("signed-in listener reveals home and resumes canonical creation intent at most once", async () => {
  const fixture = installBrowserFixture();
  try {
    await auth.start();
    let resumed = 0;
    await auth.requireAuth({ name: "CREATE_SOCIAL_POST" }, () => { resumed += 1; });
    const listener = fixture.getListener();
    assert.equal(typeof listener, "function");

    fixture.clerk.isSignedIn = true;
    fixture.clerk.user = { id: "user_authfixture01" };
    fixture.clerk.session = { getToken() { return Promise.resolve("opaque"); } };
    listener();
    listener();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(resumed, 1);
    assert.equal(fixture.getHomeCalls(), 1);
    assert.equal(fixture.storage.getItem("vvip.auth.intent.v1"), null);
    assert.equal(fixture.gate.hidden, true);
  } finally {
    fixture.restore();
  }
});

test("sign-out transition immediately hides home and restores the authentication gate", async () => {
  const fixture = installBrowserFixture({ isSignedIn: true });
  try {
    await auth.start();
    assert.equal(fixture.getHomeCalls(), 1);
    const hideCallsBeforeSignOut = fixture.getHideHomeCalls();
    const listener = fixture.getListener();

    fixture.clerk.isSignedIn = false;
    listener();
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(fixture.getHideHomeCalls() > hideCallsBeforeSignOut);
    assert.equal(fixture.gate.hidden, false);
    assert.equal(fixture.mounted.length, 1);
  } finally {
    fixture.restore();
  }
});

test("signed-in start reveals home and dispatches one safe resume event", async () => {
  const fixture = installBrowserFixture({ isSignedIn: true });
  try {
    fixture.storage.setItem("vvip.auth.intent.v1", JSON.stringify({ name: "OPEN_ACCOUNT" }));
    await auth.start();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(fixture.getHomeCalls(), 1);
    assert.equal(fixture.gate.hidden, true);
    assert.equal(fixture.storage.getItem("vvip.auth.intent.v1"), null);
    assert.equal(fixture.dispatched.length, 1);
    assert.equal(fixture.dispatched[0].type, "vvip:auth-resume");
    assert.deepEqual(fixture.dispatched[0].detail, { name: "OPEN_ACCOUNT" });
  } finally {
    fixture.restore();
  }
});

test("recovery stays fail-closed and never exposes client error details", () => {
  const fixture = installBrowserFixture();
  const originalWarn = console.warn;
  const calls = [];
  console.warn = (...args) => calls.push(args);
  try {
    auth.recover({ code: "SENSITIVE_CLIENT_DETAIL", token: "do-not-log" });
  } finally {
    console.warn = originalWarn;
    fixture.restore();
  }

  assert.deepEqual(calls, [["VVIP_CLERK_GATE_RECOVERY"]]);
  assert.equal(JSON.stringify(calls).includes("SENSITIVE_CLIENT_DETAIL"), false);
  assert.equal(JSON.stringify(calls).includes("do-not-log"), false);
  assert.equal(fixture.getHomeCalls(), 0);
  assert.ok(fixture.getHideHomeCalls() >= 1);
  assert.equal(fixture.gate.hidden, false);
  assert.equal(fixture.authError.hidden, false);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../auth-clerk-index.js");

function installFixture({ canonicalConfig = false } = {}) {
  const original = {
    location: global.location,
    document: global.document,
    runtimeReady: global.VVIPRuntimeReady,
    runtimeConfig: global.__VVIP_RUNTIME_CONFIG__,
    clerk: global.Clerk,
    fusionSurface: global.VVIPFusionSurface,
    sessionStorage: global.sessionStorage,
    dispatchEvent: global.dispatchEvent,
    customEvent: global.CustomEvent
  };

  let mounts = 0;
  const gate = {
    hidden: true,
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = String(value); }
  };
  const authError = { textContent: "", hidden: true };
  const host = { innerHTML: "" };
  const clerk = {
    isSignedIn: false,
    mountSignIn(node) {
      assert.equal(node, host);
      mounts += 1;
    },
    addListener() {}
  };

  global.location = {
    hostname: "preview.example",
    search: "",
    href: "https://preview.example/index.html",
    replace() {}
  };
  global.document = {
    getElementById(id) { return id === "clerk-sign-in" ? host : null; },
    querySelector(selector) {
      if (selector === "[data-vvip-auth-gate]") return gate;
      if (selector === "[data-auth-error]") return authError;
      return null;
    }
  };
  global.VVIPFusionSurface = { showHome() {}, hideHome() {} };
  global.sessionStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  global.dispatchEvent = () => true;
  global.CustomEvent = class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options && options.detail; }
  };
  global.VVIPRuntimeReady = undefined;
  global.__VVIP_RUNTIME_CONFIG__ = canonicalConfig ? Object.freeze({ environment: "production" }) : undefined;
  global.Clerk = clerk;

  return {
    clerk,
    gate,
    getMounts: () => mounts,
    restore() {
      global.location = original.location;
      global.document = original.document;
      global.VVIPRuntimeReady = original.runtimeReady;
      global.__VVIP_RUNTIME_CONFIG__ = original.runtimeConfig;
      global.Clerk = original.clerk;
      global.VVIPFusionSurface = original.fusionSurface;
      global.sessionStorage = original.sessionStorage;
      global.dispatchEvent = original.dispatchEvent;
      global.CustomEvent = original.customEvent;
    }
  };
}

test("source preview resolves the already-loaded Clerk runtime when no canonical runtime config exists", async () => {
  const fixture = installFixture();
  try {
    await auth.start();
    assert.equal(fixture.getMounts(), 1);
    assert.equal(fixture.gate.hidden, false);
    assert.equal(fixture.gate.attrs["aria-hidden"], "false");
  } finally {
    fixture.restore();
  }
});

test("canonical runtime configuration never falls back to a direct Clerk global", async () => {
  const fixture = installFixture({ canonicalConfig: true });
  try {
    await assert.rejects(auth.start(), { code: "CLERK_RUNTIME_UNAVAILABLE" });
    assert.equal(fixture.getMounts(), 0);
  } finally {
    fixture.restore();
  }
});

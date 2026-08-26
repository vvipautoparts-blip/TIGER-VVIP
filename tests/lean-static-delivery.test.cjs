"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const WORKER_PATH = path.join(ROOT, "sw-vvip-static.js");
const REGISTRATION_PATH = path.join(ROOT, "scripts/runtime/vvip-static-delivery.js");
const RESILIENCE_PATH = path.join(ROOT, "scripts/vvip-pr30-resilience.js");

let worker = null;
if (fs.existsSync(WORKER_PATH)) worker = require(WORKER_PATH);

let registration = null;
if (fs.existsSync(REGISTRATION_PATH)) registration = require(REGISTRATION_PATH);

function headers(values) {
  const normalized = new Map(Object.entries(values || {}).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get(name) { return normalized.get(String(name).toLowerCase()) || null; } };
}

function request(url, overrides) {
  return Object.assign({ url, method: "GET", mode: "cors", destination: "script" }, overrides || {});
}

function response(overrides) {
  return Object.assign({
    status: 200,
    type: "basic",
    headers: headers({ "cache-control": "public, max-age=3600" })
  }, overrides || {});
}

test("static service worker module exists", () => {
  assert.equal(fs.existsSync(WORKER_PATH), true, "sw-vvip-static.js must exist");
});

test("static delivery exports the current bounded cache contract", () => {
  assert.ok(worker, "service worker module must be loadable in Node");
  assert.equal(worker.CACHE_NAME, "vvip-static-v2");
  assert.equal(worker.MAX_AGE_MS, 60 * 60 * 1000);
  assert.equal(typeof worker.shouldHandleRequest, "function");
  assert.equal(typeof worker.isResponseCacheable, "function");
  assert.equal(typeof worker.cachedAt, "function");
  assert.equal(typeof worker.isFreshCachedResponse, "function");
  assert.equal(typeof worker.installRuntime, "function");
});

test("same-origin static shell assets are eligible at root and scoped deployments", () => {
  assert.ok(worker, "service worker module must be loadable in Node");
  const origin = "https://vvip.example";
  const cases = [
    [request("https://vvip.example/styles/app.css", { destination: "style" }), "/"],
    [request("https://vvip.example/scripts/app.js", { destination: "script" }), "/"],
    [request("https://vvip.example/workers/media.js", { destination: "worker" }), "/"],
    [request("https://vvip.example/icons/icon-192.png", { destination: "image" }), "/"],
    [request("https://vvip.example/TIGER-VVIP/styles/app.css", { destination: "style" }), "/TIGER-VVIP/"],
    [request("https://vvip.example/TIGER-VVIP/scripts/app.js", { destination: "script" }), "/TIGER-VVIP/"]
  ];
  for (const [candidate, scopePath] of cases) assert.equal(worker.shouldHandleRequest(candidate, origin, scopePath), true, candidate.url);
});

test("navigation, data, auth-adjacent, scope escapes, cross-origin, credentialed, and mutation requests fail closed", () => {
  assert.ok(worker, "service worker module must be loadable in Node");
  const origin = "https://vvip.example";
  const cases = [
    [request("https://vvip.example/index.html", { mode: "navigate", destination: "document" }), "/"],
    [request("https://vvip.example/index.html", { destination: "document" }), "/"],
    [request("https://vvip.example/manifest.webmanifest", { destination: "manifest" }), "/"],
    [request("https://vvip.example/api/listings.json", { destination: "" }), "/"],
    [request("https://vvip.example/rest/v1/listings", { destination: "" }), "/"],
    [request("https://vvip.example/auth/callback", { destination: "" }), "/"],
    [request("https://vvip.example/scripts/app.js", { method: "POST" }), "/"],
    [request("https://accounts.example/scripts/clerk.js"), "/"],
    [request("https://user:pass@vvip.example/scripts/app.js"), "/"],
    [request("https://vvip.example/scripts/app.js"), "/TIGER-VVIP/"]
  ];
  for (const [candidate, scopePath] of cases) assert.equal(worker.shouldHandleRequest(candidate, origin, scopePath), false, candidate.url);
});

test("only safe successful basic responses are cacheable", () => {
  assert.ok(worker, "service worker module must be loadable in Node");
  assert.equal(worker.isResponseCacheable(response()), true);
  assert.equal(worker.isResponseCacheable(response({ headers: headers({ "cache-control": "no-store" }) })), false);
  assert.equal(worker.isResponseCacheable(response({ headers: headers({ "cache-control": "PRIVATE, max-age=60" }) })), false);
  assert.equal(worker.isResponseCacheable(response({ headers: headers({ "cache-control": "no-cache" }) })), false);
  assert.equal(worker.isResponseCacheable(response({ status: 206 })), false);
  assert.equal(worker.isResponseCacheable(response({ status: 500 })), false);
  assert.equal(worker.isResponseCacheable(response({ type: "opaque" })), false);
});

test("cached static content has a strict sixty-minute freshness bound", () => {
  assert.ok(worker, "service worker module must be loadable in Node");
  const now = Date.now();
  const fresh = response({ headers: headers({ "x-vvip-static-cached-at": String(now - 60 * 1000) }) });
  const stale = response({ headers: headers({ "x-vvip-static-cached-at": String(now - worker.MAX_AGE_MS - 1) }) });
  const missing = response({ headers: headers({}) });
  const invalid = response({ headers: headers({ "x-vvip-static-cached-at": "not-a-time" }) });
  assert.equal(worker.cachedAt(fresh), now - 60 * 1000);
  assert.equal(worker.isFreshCachedResponse(fresh, now), true);
  assert.equal(worker.isFreshCachedResponse(stale, now), false);
  assert.equal(worker.isFreshCachedResponse(missing, now), false);
  assert.equal(worker.isFreshCachedResponse(invalid, now), false);
});

test("registration runtime exports a non-blocking installer and handles already-loaded pages", () => {
  assert.ok(registration, "registration runtime must be loadable in Node");
  assert.equal(typeof registration.installRegistration, "function");
  let registrations = 0;
  let loadListeners = 0;
  const root = {
    document: { readyState: "complete" },
    navigator: { serviceWorker: { register(script, options) {
      registrations += 1;
      assert.equal(script, "sw-vvip-static.js");
      assert.deepEqual(options, { scope: "./" });
      return Promise.resolve({ scope: "https://vvip.example/" });
    } } },
    addEventListener(name) { if (name === "load") loadListeners += 1; },
    console: { warn() {} }
  };
  assert.equal(registration.installRegistration(root), true);
  assert.equal(registrations, 1);
  assert.equal(loadListeners, 0);
});

test("shared resilience bootstrap loads static delivery exactly once", () => {
  assert.equal(fs.existsSync(REGISTRATION_PATH), true, "registration runtime must exist");
  const resilience = fs.readFileSync(RESILIENCE_PATH, "utf8");
  const runtimeMatches = resilience.match(/scripts\/runtime\/vvip-static-delivery\.js/g) || [];
  assert.equal(runtimeMatches.length, 1, "shared resilience layer must bootstrap static delivery exactly once");
  for (const file of ["index.html", "private-profile-p03.html"]) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    const matches = html.match(/scripts\/vvip-pr30-resilience\.js/g) || [];
    assert.equal(matches.length, 1, `${file} must load the shared resilience bootstrap exactly once`);
  }
});

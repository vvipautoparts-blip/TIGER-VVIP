"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const menuPath = path.join(root, "scripts/fusion/f03-capability-menu.js");
const pagePath = path.join(root, "fusion-home-f02.html");
const moduleUrl = pathToFileURL(menuPath).href;

async function loadMenu() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function validatedView(entries) {
  const frozenEntries = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
  return Object.freeze({
    ok: true,
    code: "OK",
    actor: Object.freeze({ id: "user_12345678" }),
    entries: frozenEntries
  });
}

test("F03 menu fails closed without a validated immutable capability view", async () => {
  const { deriveCapabilityMenuEntries } = await loadMenu();
  assert.deepEqual(deriveCapabilityMenuEntries(null), []);
  assert.deepEqual(deriveCapabilityMenuEntries({ ok: true, code: "OK", entries: [] }), []);
  assert.deepEqual(
    deriveCapabilityMenuEntries(Object.freeze({ ok: false, code: "REMOTE_CONFIRMATION_REQUIRED", entries: Object.freeze([]) })),
    []
  );
});

test("F03 menu renders only exact immutable entries from validated output", async () => {
  const { deriveCapabilityMenuEntries } = await loadMenu();
  const entries = deriveCapabilityMenuEntries(validatedView([
    { id: "my-capabilities", label: "My capabilities" },
    { id: "countries", label: "Countries" }
  ]));

  assert.deepEqual(entries.map((entry) => entry.id), ["my-capabilities", "countries"]);
  assert.equal(Object.isFrozen(entries), true);
  assert.equal(Object.isFrozen(entries[0]), true);
});

test("F03 isolated page wires the capability controller and explicit entries host", () => {
  const html = fs.readFileSync(pagePath, "utf8");
  assert.match(html, /scripts\/fusion\/f03-capability-menu\.js/);
  assert.match(html, /data-fusion-capability-entries/);
  assert.match(html, /data-fusion-capability-menu/);
  assert.match(html, /data-fusion-capability-sheet/);
});

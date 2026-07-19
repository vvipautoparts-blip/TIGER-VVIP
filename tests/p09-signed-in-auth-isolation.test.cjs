"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const controller = fs.readFileSync(
  "auth-clerk-index.js",
  "utf8"
);
const remembered = fs.readFileSync(
  "scripts/vvip-p09-remembered-account.js",
  "utf8"
);

test("deprecated inline authentication is absent", () => {
  assert.doesNotMatch(index, /vvip-p09-inline-auth-flow/);
  assert.doesNotMatch(index, /vvip-pr30-resilience/);
});

test("signed-in flow delegates to remembered account", () => {
  assert.match(controller, /VVIP_P09_REMEMBERED_ACCOUNT/);
  assert.match(controller, /\.show\s*\(/);
});

test("remembered account does not mount another sign-in UI", () => {
  assert.doesNotMatch(
    remembered,
    /mountSignIn|openSignIn|createSignIn/
  );

  assert.match(remembered, /clerk\?\.user/);
  assert.match(remembered, /clerk\.signOut/);
});

test("Clerk UI loads before Clerk browser runtime", () => {
  const ui = index.indexOf(
    "@clerk/ui@1/dist/ui.browser.js"
  );

  const clerk = index.indexOf(
    "@clerk/clerk-js@6/dist/clerk.browser.js"
  );

  assert.ok(ui >= 0);
  assert.ok(clerk >= 0);
  assert.ok(ui < clerk);
});

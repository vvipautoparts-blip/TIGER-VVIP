"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const indexHtml = fs.readFileSync(
  path.join(root, "index.html"),
  "utf8"
);

const authRuntime = fs.readFileSync(
  path.join(root, "auth-clerk-index.js"),
  "utf8"
);

test("index loads Clerk UI before Clerk JS", () => {
  const clerkUiPosition = indexHtml.indexOf(
    "@clerk/ui@1/dist/ui.browser.js"
  );

  const clerkJsPosition = indexHtml.indexOf(
    "@clerk/clerk-js@6/dist/clerk.browser.js"
  );

  assert.notEqual(
    clerkUiPosition,
    -1,
    "index.html must load the Clerk UI browser runtime"
  );

  assert.notEqual(
    clerkJsPosition,
    -1,
    "index.html must load Clerk JS"
  );

  assert.ok(
    clerkUiPosition < clerkJsPosition,
    "Clerk UI must be loaded before Clerk JS"
  );
});

test("Clerk gate loads Clerk with the UI constructor", () => {
  assert.match(
    authRuntime,
    /if\s*\(\s*!window\.__internal_ClerkUICtor\s*\)/
  );

  assert.match(
    authRuntime,
    /Clerk\.load\s*\(\s*\{\s*ui\s*:\s*\{\s*ClerkUI\s*:\s*window\.__internal_ClerkUICtor\s*\}\s*\}\s*\)/s
  );
});

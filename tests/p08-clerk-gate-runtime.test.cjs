"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const auth = require("../auth-clerk-index.js");

const root = path.resolve(__dirname, "..");
const authRuntime = fs.readFileSync(
  path.join(root, "auth-clerk-index.js"),
  "utf8"
);
const runtimeLoader = fs.readFileSync(
  path.join(root, "scripts/runtime/vvip-runtime-loader.js"),
  "utf8"
);

test("runtime loader owns the single Clerk UI bootstrap", () => {
  assert.match(runtimeLoader, /!root\.__internal_ClerkUICtor/);
  assert.match(
    runtimeLoader,
    /root\.Clerk\.load\s*\(\s*\{\s*ui\s*:\s*\{\s*ClerkUI\s*:\s*root\.__internal_ClerkUICtor\s*\}\s*\}\s*\)/s
  );

  assert.doesNotMatch(authRuntime, /__internal_ClerkUICtor/);
  assert.doesNotMatch(authRuntime, /Clerk\.load\s*\(/);
});

test("auth gate consumes VVIPRuntimeReady and mounts the runtime Clerk", () => {
  assert.match(authRuntime, /root\.VVIPRuntimeReady/);
  assert.match(authRuntime, /const clerk = runtime && runtime\.clerk/);
  assert.match(authRuntime, /clerk\.mountSignIn\s*\(/);
});

test("auth gate removes localhost preview bypass and keeps return paths fail-closed", () => {
  assert.equal(auth.localPreviewAllowed, undefined);
  assert.doesNotMatch(authRuntime, /localPreviewAllowed/);
  assert.doesNotMatch(authRuntime, /continueWithoutSignIn/);

  assert.equal(
    auth.safeReturnPath(
      { search: "?return_to=index.html" },
      { environment: "production" }
    ),
    "index.html"
  );
  assert.equal(
    auth.safeReturnPath(
      { search: "?return_to=private-profile-p03.html" },
      { environment: "preview" }
    ),
    "private-profile-p03.html"
  );
  assert.equal(
    auth.safeReturnPath(
      { search: "?return_to=private-profile-p03.html" },
      { environment: "production" }
    ),
    ""
  );
  assert.equal(
    auth.safeReturnPath({ search: "?return_to=https://evil.example" }),
    ""
  );
  assert.equal(
    auth.safeReturnPath({ search: "?return_to=../../admin" }),
    ""
  );
});

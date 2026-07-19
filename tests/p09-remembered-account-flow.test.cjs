"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "scripts/vvip-p09-remembered-account.js",
  "utf8"
);

test("remembered account uses valid URL routing", () => {
  assert.match(source, /new\s+URL\s*\(/);
  assert.doesNotMatch(source, /\bnewURL\s*\(/);
});

test("switch account and logout request Clerk sign-in", () => {
  const signInRequests =
    source.match(/auth\s*:\s*["']sign-in["']/g) || [];

  assert.ok(signInRequests.length >= 2);
  assert.match(source, /switch\s*:\s*["']1["']/);
  assert.match(source, /signed_out\s*:\s*["']1["']/);
});

test("logout ends the Clerk session only", () => {
  assert.match(source, /clerk\.signOut\s*\(/);
  assert.match(source, /redirectUrl\s*:\s*destination\.href/);

  assert.doesNotMatch(
    source,
    /deleteUser|deleteAccount|deleteListing|localStorage\.clear/
  );
});

test("continue opens the marketplace", () => {
  assert.match(source, /window\.VVIP_PR29/);
  assert.match(source, /marketplace\.showHome\s*\(\s*\)/);
  assert.match(source, /gate\.hidden\s*=\s*true/);
});

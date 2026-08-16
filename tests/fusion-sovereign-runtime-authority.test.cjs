"use strict";

// RED phase: this contract intentionally fails until runtime authority convergence is implemented.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("production runtime exposes one sovereign publication authority", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  const composer = read("scripts/fusion/progressive-composer.js");
  const release = read("tools/vvip_public_release.py");

  assert.match(repository, /function requestPublication\s*\(/);
  assert.doesNotMatch(repository, /\bsubmitForReview\b/);
  assert.doesNotMatch(repository, /\bcreateAndSubmit\b/);
  assert.doesNotMatch(repository, /function prepareForPublication\s*\(/);
  assert.match(composer, /\.requestPublication\s*\(/);
  assert.doesNotMatch(composer, /\.prepareForPublication\s*\(/);
  assert.doesNotMatch(release, /vvip-marketplace-rollback\.js/);
  assert.doesNotMatch(release, /["']scripts\/runtime\/["']/);
});

test("browser repository cannot directly mutate trusted publication status", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  assert.doesNotMatch(
    repository,
    /\.update\([^)]*status\s*:\s*["'](?:PENDING_REVIEW|ACTIVE)["']/s
  );
});

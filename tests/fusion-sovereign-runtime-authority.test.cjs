"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

function tupleBody(source, name) {
  const match = source.match(new RegExp(name + "\\s*=\\s*\\(([^]*?)\\n\\)", "m"));
  assert.ok(match, name + " must be an explicit tuple");
  return match[1];
}

test("production runtime exposes one current review-submission authority", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  const composer = read("scripts/fusion/progressive-composer.js");

  assert.match(repository, /function submitForReview\s*\(/);
  assert.match(repository, /vvip_marketplace_submit_for_review/);
  assert.doesNotMatch(repository, /\brequestPublication\b|\bprepareForPublication\b|\bcreateAndSubmit\b/);
  assert.match(composer, /\.submitForReview\s*\(/);
  assert.doesNotMatch(composer, /\.(?:requestPublication|prepareForPublication)\s*\(/);
});

test("production artifact is an exact allowlist with no prefix or rollback authority", () => {
  const release = read("tools/vvip_public_release.py");

  assert.doesNotMatch(release, /\bPUBLIC_PREFIXES\b/);
  assert.doesNotMatch(release, /for\s+prefix\s+in\s+/);

  const styles = tupleBody(release, "PUBLIC_STYLE_FILES");
  const icons = tupleBody(release, "PUBLIC_ICON_FILES");
  const runtime = tupleBody(release, "PUBLIC_RUNTIME_FILES");
  const scripts = tupleBody(release, "PUBLIC_SCRIPT_FILES");

  assert.match(styles, /styles\/fusion\/f02-single-surface\.css/);
  assert.match(styles, /styles\/fusion\/progressive-composer\.css/);
  assert.match(icons, /icons\/icon-192\.png/);
  assert.match(icons, /icons\/icon-512\.png/);
  assert.match(runtime, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.match(runtime, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(runtime, /scripts\/runtime\/vvip-static-delivery\.js/);
  assert.doesNotMatch(runtime + scripts, /vvip-marketplace-rollback\.js/);
  assert.doesNotMatch(runtime + scripts, /vvip-my-listings\.js/);

  const injection = release.match(/injection\s*=\s*"""([^]*?)"""\.rstrip\(\)/m);
  assert.ok(injection, "release injection must be explicit");
  assert.match(injection[1], /vvip-runtime-loader\.js/);
  assert.match(injection[1], /vvip-marketplace-repository\.js/);
  assert.doesNotMatch(injection[1], /vvip-marketplace-rollback\.js/);
});

test("browser repository cannot directly mutate trusted publication status", () => {
  const repository = read("scripts/runtime/vvip-marketplace-repository.js");
  assert.doesNotMatch(
    repository,
    /\.update\([^)]*status\s*:\s*["'](?:PENDING_REVIEW|ACTIVE)["']/s
  );
});

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

  const prefixes = tupleBody(release, "PUBLIC_PREFIXES");
  const publicScripts = tupleBody(release, "PUBLIC_SCRIPT_FILES");
  assert.doesNotMatch(prefixes, /scripts\/runtime\//);
  assert.match(publicScripts, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.match(publicScripts, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.doesNotMatch(publicScripts, /vvip-marketplace-rollback\.js/);

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

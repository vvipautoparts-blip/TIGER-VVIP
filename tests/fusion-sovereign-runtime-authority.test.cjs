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

test("production runtime exposes one current NEXUS Living Object creation authority", () => {
  const socialRuntime = read("scripts/social/runtime-adapters.js");
  const socialComposer = read("scripts/social/post-composer.js");

  assert.match(socialRuntime, /vvip_social_post_create/);
  assert.match(socialRuntime, /p_sector_key/);
  assert.match(socialRuntime, /p_intent_class/);
  assert.match(socialComposer, /CREATE_SOCIAL_POST/);
  assert.match(socialComposer, /sectorId/);
  assert.match(socialComposer, /intent/);

  for (const relative of [
    "scripts/runtime/vvip-marketplace-repository.js",
    "scripts/fusion/progressive-composer.js",
    "scripts/fusion/f02-feed.js",
    "scripts/fusion/runtime-adapters.js",
    "scripts/fusion/marketplace-context.js"
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, `${relative} must not coexist with NEXUS`);
  }
});

test("production artifact is an exact NEXUS allowlist with no parallel product runtime", () => {
  const release = read("tools/vvip_public_release.py");

  assert.doesNotMatch(release, /\bPUBLIC_PREFIXES\b/);
  assert.doesNotMatch(release, /for\s+prefix\s+in\s+/);

  const runtime = tupleBody(release, "PUBLIC_RUNTIME_FILES");
  const scripts = tupleBody(release, "PUBLIC_SCRIPT_FILES");

  assert.match(runtime, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.match(runtime, /scripts\/runtime\/vvip-static-delivery\.js/);
  assert.doesNotMatch(runtime, /marketplace-repository|marketplace-rollback|my-listings/);

  assert.match(scripts, /scripts\/social\/post-composer\.js/);
  assert.match(scripts, /scripts\/nexus\/sector-discovery\.js/);
  assert.match(scripts, /scripts\/nexus\/bootstrap\.js/);
  assert.match(scripts, /scripts\/nexus\/pulse-surface\.js/);
  assert.doesNotMatch(scripts, /fusion\/f02-feed|fusion\/runtime-adapters|fusion\/marketplace-context|progressive-composer/);

  const injection = release.match(/injection\s*=\s*"""([^]*?)"""\.rstrip\(\)/m);
  assert.ok(injection, "release injection must be explicit");
  assert.match(injection[1], /vvip-runtime-loader\.js/);
  assert.match(injection[1], /auth-clerk-index\.js/);
  assert.doesNotMatch(injection[1], /marketplace|listing|rollback/);
});

test("browser NEXUS publisher delegates creation to server RPC and does not own publication status", () => {
  const socialRuntime = read("scripts/social/runtime-adapters.js");
  assert.match(socialRuntime, /vvip_social_post_create/);
  assert.doesNotMatch(
    socialRuntime,
    /\.update\([^)]*status\s*:\s*["'](?:PENDING_REVIEW|ACTIVE)["']/s
  );
});

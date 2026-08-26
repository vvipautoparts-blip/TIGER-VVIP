"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("reactions controller is ordered between runtime adapter and feed controller", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const runtimeIndex = html.indexOf('scripts/social/runtime-adapters.js');
  const reactionsIndex = html.indexOf('scripts/social/reactions-controller.js');
  const feedIndex = html.indexOf('scripts/social/feed-controller.js');

  assert.ok(runtimeIndex >= 0, "social runtime adapter must be present");
  assert.ok(reactionsIndex > runtimeIndex, "reactions controller must load after social runtime");
  assert.ok(feedIndex > reactionsIndex, "feed controller must load after reactions controller");
});

test("public builder explicitly allowlists reactions controller", () => {
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");
  assert.match(builder, /"scripts\/social\/reactions-controller\.js"/);
});

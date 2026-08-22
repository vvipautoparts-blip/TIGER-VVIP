"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("unfinished Stories and Video/Reels are not presented as enabled V1 navigation", () => {
  const html = fs.readFileSync("index.html", "utf8");

  assert.match(
    html,
    /<section[^>]*data-social-story-strip[^>]*hidden[^>]*data-social-feature-state="future-hidden"/
  );
  assert.match(
    html,
    /<span[^>]*social-nav-item--inactive[^>]*hidden[^>]*data-social-feature-state="future-hidden"/
  );
});

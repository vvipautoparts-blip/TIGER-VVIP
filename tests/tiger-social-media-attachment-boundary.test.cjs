"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Social Composer keeps unfinished media attachments explicitly future-hidden", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const composer = fs.readFileSync("scripts/social/post-composer.js", "utf8");

  assert.match(
    html,
    /data-social-post-sheet[^>]*data-social-media-state="future-hidden"/
  );
  assert.doesNotMatch(html, /data-social-media-upload|data-social-attachment-upload/);
  assert.doesNotMatch(composer, /upload|storage|mime|attachment/i);
});

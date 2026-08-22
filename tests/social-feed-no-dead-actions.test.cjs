"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("feed does not render a dead future Share control", () => {
  const feed = read("scripts/social/feed-controller.js");

  assert.doesNotMatch(feed, /data-social-share-trigger/);
  assert.doesNotMatch(feed, /المشاركة غير متاحة في الإصدار الحالي/);
  assert.doesNotMatch(feed, /social-post-action--share/);
});

test("feed does not render a dead future three-dot control", () => {
  const feed = read("scripts/social/feed-controller.js");

  assert.doesNotMatch(feed, /خيارات المنشور غير متاحة في الإصدار الحالي/);
  assert.doesNotMatch(feed, /social-feed-post__menu/);
});

test("removing dead controls preserves working reaction and comment hosts", () => {
  const feed = read("scripts/social/feed-controller.js");

  assert.match(feed, /data-social-reactions-host/);
  assert.match(feed, /data-social-comment-trigger/);
  assert.match(feed, /data-social-comments-host/);
});
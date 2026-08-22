"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("social shell does not expose messaging before a real inbox discovery contract exists", () => {
  const html = read("index.html");
  const shell = read("scripts/social/core-shell.js");
  const runtime = read("scripts/social/runtime-adapters.js");

  assert.doesNotMatch(html, /data-social-(?:module|nav)=["']messages["']/i);
  assert.doesNotMatch(html, /data-social-module-placeholder=["']messages["']/i);
  assert.doesNotMatch(shell, /["']messages["']/i);

  assert.match(runtime, /open\s*:\s*async\s+function\s*\(\s*peerProfileId\s*\)/);
  assert.match(runtime, /list\s*:\s*async\s+function\s*\(\s*conversationId/);
  assert.match(runtime, /send\s*:\s*async\s+function\s*\(\s*conversationId/);
  assert.match(runtime, /markRead\s*:\s*async\s+function\s*\(\s*conversationId/);
  assert.match(runtime, /getChannelTicket\s*:\s*async\s+function\s*\(\s*conversationId\s*\)/);
  assert.doesNotMatch(runtime, /\blistConversations\b|\breadInbox\b/);
});

test("social shell does not expose notifications without a notification runtime contract", () => {
  const html = read("index.html");
  const shell = read("scripts/social/core-shell.js");
  const runtime = read("scripts/social/runtime-adapters.js");

  assert.doesNotMatch(html, /data-social-(?:module|nav)=["']notifications["']/i);
  assert.doesNotMatch(html, /data-social-module-placeholder=["']notifications["']/i);
  assert.doesNotMatch(shell, /["']notifications["']/i);
  assert.doesNotMatch(runtime, /\bnotifications\s*:\s*\{|\bnotificationsApi\b|\blistNotifications\b/i);
});

test("removing dead destinations preserves working home and friends navigation", () => {
  const html = read("index.html");
  const shell = read("scripts/social/core-shell.js");

  assert.match(html, /data-social-(?:module|nav)=["']home["']/i);
  assert.match(html, /data-social-(?:module|nav)=["']friends["']/i);
  assert.match(shell, /["']home["']/i);
  assert.match(shell, /["']friends["']/i);
});

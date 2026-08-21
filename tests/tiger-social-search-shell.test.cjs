"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const cssPath = path.join(root, "styles/tiger-social/search.css");
const shellPath = path.join(root, "scripts/social/core-shell.js");
const releasePath = path.join(root, "tools/vvip_public_release.py");

test("P0-C Search is a real Social destination with a dedicated accessible surface", () => {
  assert.equal(fs.existsSync(cssPath), true, "P0-C Search CSS must exist");
  const shell = fs.readFileSync(shellPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(shell, /'search'/);
  assert.match(shell, /dataSocialSearchSurface|socialSearchSurface/);
  assert.match(shell, /data\.socialNav\s*=\s*'search'/);
  assert.match(shell, /scripts\/social\/search-controller\.js/);
  assert.match(shell, /styles\/tiger-social\/search\.css/);
  assert.match(shell, /aria-live/);
  assert.match(shell, /maxLength\s*=\s*160/);
  assert.doesNotMatch(shell, /innerHTML\s*=/);
  assert.match(css, /social-search-surface/);
  assert.match(css, /focus-visible/);
  assert.match(css, /visually-hidden/);
});

test("P0-C Search controller and stylesheet are copied into the audited public artifact", () => {
  const release = fs.readFileSync(releasePath, "utf8");
  assert.match(release, /"styles\/tiger-social\/search\.css"/);
  assert.match(release, /"scripts\/social\/search-controller\.js"/);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const repositoryPath = "scripts/runtime/vvip-marketplace-repository.js";
const source = fs.readFileSync(repositoryPath, "utf8");

test("canonical repository owns trusted media-finalization transport", () => {
  assert.match(source, /function\s+finalizerUrl\s*\(/);
  assert.match(source, /parsed\.protocol\s*!==\s*["']https:["']/);
  assert.match(source, /function\s+requestFetch\s*\(/);
  assert.match(source, /async\s+function\s+finalizeMediaRow\s*\(/);
  assert.match(source, /vvip_marketplace_request_media_finalization/);
  assert.match(source, /finalization_token/);
  assert.match(source, /payload\.state\s*!==\s*["']CANONICAL["']/);
});

test("canonical repository creates drafts only after every media row reaches server canonical finalization", () => {
  assert.match(source, /select\(["']media_id,storage_path,position["']\)/);
  assert.match(source, /for\s*\(const\s+media\s+of\s+mediaRows\)/);
  assert.match(source, /await\s+finalizeMediaRow\s*\(/);
  assert.match(source, /MEDIA_FINALIZATION_ROWS_READ_FAILED/);
  assert.match(source, /storage\.from\(["']listing-media["']\)\.remove\(/);
  assert.match(source, /vvip_marketplace_listings["']\)\.delete\(\)/);
});

test("public feed signs only canonical media from the canonical private bucket", () => {
  assert.match(source, /canonical_storage_path/);
  assert.match(source, /finalization_state/);
  assert.match(source, /finalization_state\s*===\s*["']CANONICAL["']/);
  assert.match(source, /storage\.from\(["']listing-media-canonical["']\)\.createSignedUrls\(/);
  assert.doesNotMatch(source, /storage\.from\(["']listing-media["']\)\.createSignedUrls\(/);
});

test("repository exposes one publication command and no legacy alias", () => {
  assert.match(source, /function\s+requestPublication\s*\(/);
  assert.match(source, /vvip_marketplace_request_publication/);
  assert.doesNotMatch(source, /\bprepareForPublication\b/);
  assert.doesNotMatch(source, /\bsubmitForReview\b|\bcreateAndSubmit\b/);
});

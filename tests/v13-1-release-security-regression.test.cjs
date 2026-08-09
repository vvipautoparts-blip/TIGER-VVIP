"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const releaseRoot = path.resolve(__dirname, "../scripts/release");
const expectedFiles = [
  "v13-release-contracts.js",
  "v13-release-evidence.js",
  "v13-release-deviation.js",
  "v13-release-dependency-train.js",
  "v13-release-decision-engine.js",
  "v13-release-decision-record.js"
];

test("release engine source remains pure server-agnostic and free of fallback authority", () => {
  for (const file of expectedFiles) {
    const sourcePath = path.join(releaseRoot, file);
    assert.equal(fs.existsSync(sourcePath), true, `${file} must exist`);
    const source = fs.readFileSync(sourcePath, "utf8");

    assert.doesNotMatch(source,
      /process\.env|fetch\s*\(|XMLHttpRequest|WebSocket|createClient|storage\.from|child_process|exec\s*\(|spawn\s*\(|service[_-]?role|postgres(?:ql)?:\/\/|https?:\/\//i,
      `${file} must not access runtime infrastructure`);
    assert.doesNotMatch(source,
      /window\.|document\.|localStorage|sessionStorage|indexedDB|navigator\.|globalThis\.crypto/i,
      `${file} must not use browser or ambient crypto authority`);
    assert.doesNotMatch(source,
      /Math\.imul|\bfnv\b|fallbackHash|weakHash|nonCrypto/i,
      `${file} must not contain a non-cryptographic digest fallback`);
    assert.doesNotMatch(source,
      /defaultCountry|countryCode\s*[:=]\s*["']JO["']/i,
      `${file} must not invent an implicit country`);
  }
});

test("release decision record output surface excludes sensitive and authority-shaped fields", async () => {
  const sourcePath = path.join(releaseRoot, "v13-release-decision-record.js");
  const source = fs.readFileSync(sourcePath, "utf8");

  for (const forbidden of [
    "token",
    "secret",
    "password",
    "rawLog",
    "event_payload",
    "envelope",
    "connectionString",
    "environmentValues",
    "session",
    "authorizationHeader",
    "serviceRole"
  ]) {
    const outputKeyPattern = new RegExp(`["']${forbidden}["']\\s*:`, "i");
    assert.doesNotMatch(source, outputKeyPattern);
  }

  assert.match(source, /MAX_DECISION_BYTES/);
  assert.match(source, /digestSha256/);
  assert.match(source, /decisionDigest/);
  assert.match(source, /subjectHeadSha/);
});

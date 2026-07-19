"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

const deprecated = [
  "scripts/vvip-p09-inline-auth-flow.js",
  "styles/vvip-p09-inline-auth-flow.css",
  "scripts/vvip-pr30-resilience.js",
];

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "";
}

function runtimeFiles(directory) {
  const ignored = new Set([
    ".git",
    "node_modules",
    "backups",
    "approved",
    "docs",
    "tests",
  ]);

  const allowed = new Set([
    ".html",
    ".js",
    ".mjs",
    ".css",
    ".json",
  ]);

  const files = [];

  for (
    const entry of fs.readdirSync(
      directory,
      { withFileTypes: true }
    )
  ) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const full = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      files.push(...runtimeFiles(full));
      continue;
    }

    if (allowed.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

test("deprecated authentication runtime files are deleted", () => {
  for (const file of deprecated) {
    assert.equal(
      fs.existsSync(file),
      false,
      `${file} must not remain in live runtime`
    );
  }
});

test("runtime HTML does not load deprecated authentication assets", () => {
  const matches = [];

  for (const file of runtimeFiles(root)) {
    if (path.extname(file) !== ".html") {
      continue;
    }

    const content = read(file);

    for (const asset of deprecated) {
      if (content.includes(asset)) {
        matches.push(`${file}: ${asset}`);
      }
    }
  }

  assert.deepEqual(matches, []);
});

test("Clerk UI and Clerk JS remain available", () => {
  const html = read("index.html");

  assert.match(
    html,
    /@clerk\/ui@1\/dist\/ui\.browser\.js/
  );

  assert.match(
    html,
    /@clerk\/clerk-js@6\/dist\/clerk\.browser\.js/
  );

  assert.match(
    html,
    /auth-clerk-index\.js/
  );
});

test("current login renderer and account flow remain loaded once", () => {
  const html = read("index.html");

  for (const asset of [
    "vvip-p09-remembered-account.js",
    "vvip-p09-entry-override.js",
    "vvip-p09-auth-ready-bridge.js",
  ]) {
    const count = (
      html.match(
        new RegExp(
          asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "g"
        )
      ) || []
    ).length;

    assert.equal(
      count,
      1,
      `${asset} must be loaded exactly once`
    );
  }
});

test("legacy repeated identity is absent from live runtime", () => {
  const forbidden =
    "vvip" +
    "tiger autoparts autoparts";

  const matches = [];

  for (const file of runtimeFiles(root)) {
    const compact = read(file)
      .replace(/\s+/g, " ")
      .toLowerCase();

    if (compact.includes(forbidden)) {
      matches.push(
        path.relative(root, file)
      );
    }
  }

  assert.deepEqual(matches, []);
});

test("logout implementation uses Clerk without deleting user data", () => {
  const combined = [
    read("scripts/vvip-p09-remembered-account.js"),
    read("scripts/vvip-p09-account-ui-finalizer.js"),
    read("private-profile-p03.html"),
  ].join("\n");

  assert.match(
    combined,
    /signOut/
  );

  assert.doesNotMatch(
    combined,
    /deleteUser|deleteAccount|deleteListing|supabase\.from\([^)]*\)\.delete/
  );
});

test("password recovery remains delegated to official Clerk sign-in", () => {
  const html = read("index.html");

  assert.match(
    html,
    /clerk-sign-in/
  );

  assert.doesNotMatch(
    html,
    /custom-password-reset|local-password-reset/
  );
});

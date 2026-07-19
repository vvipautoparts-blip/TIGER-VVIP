"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "";
}

const policy = read(
  "scripts/vvip-identity-policy.js"
);

const remembered = read(
  "scripts/vvip-p09-remembered-account.js"
);

const forbidden =
  "VVIP" +
  "Tiger AutoParts AutoParts";

function runtimeFiles(directory) {
  const ignored = new Set([
    ".git",
    "node_modules",
    "backups",
    "approved",
    "docs",
  ]);

  const extensions = new Set([
    ".html",
    ".js",
    ".mjs",
    ".json",
    ".css",
    ".sql",
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

    if (
      extensions.has(
        path.extname(entry.name)
      )
    ) {
      files.push(full);
    }
  }

  return files;
}

test(
  "global identity policy is implemented",
  () => {
    assert.match(
      policy,
      /VVIP_IDENTITY_POLICY/
    );

    assert.match(
      policy,
      /sanitizeDisplayName/
    );

    assert.match(
      policy,
      /MutationObserver/
    );
  }
);

test(
  "remembered account uses the identity policy",
  () => {
    assert.match(
      remembered,
      /sanitizeDisplayName/
    );

    assert.match(
      remembered,
      /name\.hidden\s*=\s*!accountName/
    );
  }
);

test(
  "VVIP circle remains when account has no image",
  () => {
    assert.match(
      remembered,
      /if \(user\.imageUrl\)/
    );

    assert.match(
      remembered,
      /mark\.hidden = true/
    );

    assert.match(
      remembered,
      /mark\.hidden = false/
    );
  }
);

test(
  "deprecated repeated identity is absent from runtime files",
  () => {
    const matches = [];

    for (const file of runtimeFiles(ROOT)) {
      const content = read(file);

      if (
        content.toLowerCase().includes(
          forbidden.toLowerCase()
        )
      ) {
        matches.push(
          path.relative(ROOT, file)
        );
      }
    }

    assert.deepEqual(matches, []);
  }
);

test(
  "identity policy does not persist personal data",
  () => {
    assert.doesNotMatch(
      policy,
      /localStorage|sessionStorage|indexedDB/
    );

    assert.doesNotMatch(
      policy,
      /document\.cookie/
    );
  }
);

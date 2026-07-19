"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "";
}

const html = read("index.html");
const js = read(
  "scripts/vvip-p09-account-ui-finalizer.js"
);
const css = read(
  "styles/vvip-p09-account-ui-finalizer.css"
);

test("finalizer loads after remembered account controller", () => {
  assert.match(
    html,
    /vvip-p09-account-ui-finalizer\.js/
  );

  const remembered = html.indexOf(
    "vvip-p09-remembered-account.js"
  );

  const finalizer = html.indexOf(
    "vvip-p09-account-ui-finalizer.js"
  );

  assert.ok(remembered >= 0);
  assert.ok(finalizer > remembered);
});

test("account image hides VVIP circle and fallback restores it", () => {
  assert.match(js, /avatarVisible/);
  assert.match(js, /mark\.hidden = avatarVisible/);

  assert.match(
    css,
    /\.auth-gate__mark\[hidden\]/
  );

  assert.match(
    css,
    /display:\s*none\s*!important/
  );
});

test("logout requires confirmation and uses Clerk signOut", () => {
  assert.match(js, /تأكيد تسجيل الخروج/);
  assert.match(js, /إلغاء/);
  assert.match(js, /clerk\.signOut/);
  assert.match(js, /signed_out/);
});

test("legacy repeated account name is dynamically removed", () => {
  assert.match(js, /removeLegacyIdentity/);
  assert.match(js, /MutationObserver/);
});

test("no personal data is manually persisted", () => {
  assert.doesNotMatch(
    js,
    /localStorage|sessionStorage|indexedDB/
  );

  assert.doesNotMatch(
    js,
    /document\.cookie/
  );
});

test("legacy repeated name is absent from runtime files", () => {
  const forbidden =
    "vvip" +
    "tiger autoparts autoparts";

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
    ".json",
    ".css",
  ]);

  const matches = [];

  function walk(directory) {
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
        walk(full);
        continue;
      }

      if (!allowed.has(path.extname(entry.name))) {
        continue;
      }

      const content = read(full)
        .replace(/\s+/g, " ")
        .toLowerCase();

      if (content.includes(forbidden)) {
        matches.push(full);
      }
    }
  }

  walk(process.cwd());
  assert.deepEqual(matches, []);
});

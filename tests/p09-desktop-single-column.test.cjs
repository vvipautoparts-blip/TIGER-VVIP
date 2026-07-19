"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const css = fs.readFileSync(
  "styles/vvip-p09-final-auth.css",
  "utf8"
);

test("desktop login uses one centered column", () => {
  assert.match(
    css,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/
  );

  assert.match(
    css,
    /justify-items:\s*center/
  );
});

test("VVIP TIGER stays on one line", () => {
  assert.match(
    css,
    /\.auth-gate__identity h1[\s\S]*?white-space:\s*nowrap/
  );
});

test("Clerk footer follows the navy card", () => {
  assert.match(
    css,
    /#clerk-sign-in \.cl-footer[\s\S]*?background:\s*transparent\s*!important/
  );
});

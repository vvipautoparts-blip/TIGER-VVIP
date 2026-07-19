"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync(
  "styles/vvip-p09-final-auth.css",
  "utf8"
);

const gateMatch = html.match(
  /<section class="auth-gate"[\s\S]*?<\/section>/
);

const gate = gateMatch ? gateMatch[0] : "";

test("approved login has one real Clerk card", () => {
  assert.equal(
    (gate.match(/class="auth-gate__card"/g) || []).length,
    1
  );

  assert.equal(
    (gate.match(/id="clerk-sign-in"/g) || []).length,
    1
  );

  assert.match(
    html,
    /@clerk\/clerk-js@6\/dist\/clerk\.browser\.js/
  );
});

test("approved login contains no Arabic promotional text", () => {
  assert.doesNotMatch(gate, /[\u0600-\u06FF]/);
  assert.doesNotMatch(gate, /CLERK SECURE ACCESS/);
});

test("approved sky visual contract exists", () => {
  assert.match(css, /#7cddff/);
  assert.match(css, /#27b8ff/);
  assert.match(css, /auth-gate::before/);
  assert.match(css, /auth-gate::after/);
  assert.match(css, /width:\s*clamp\(190px,\s*25vw,\s*250px\)/);
  assert.match(css, /white-space:\s*nowrap/);
});

test("design remains responsive and accessible", () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-height:\s*100svh/);
});

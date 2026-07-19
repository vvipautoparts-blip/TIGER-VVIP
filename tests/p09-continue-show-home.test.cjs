"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const js = fs.readFileSync(
  "scripts/vvip-p09-remembered-account.js",
  "utf8"
);

const html = fs.readFileSync(
  "index.html",
  "utf8"
);

test(
  "continue button opens the existing marketplace view",
  () => {
    assert.match(
      js,
      /window\.VVIP_PR29/
    );

    assert.match(
      js,
      /typeof marketplace\.showHome/
    );

    assert.match(
      js,
      /marketplace\.showHome\(\)/
    );

    assert.doesNotMatch(
      js,
      /\.\/public-profile\.html/
    );
  }
);

test(
  "browser receives the corrected controller version",
  () => {
    assert.match(
      html,
      /vvip-p09-remembered-account\.js\?v=20260719-(?:show-home|hide-gate)-final/
    );
  }
);

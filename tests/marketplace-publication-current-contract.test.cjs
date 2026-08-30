"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("ordinary listing publication is content then preview then server review submission", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "scripts", "vvip-production-marketplace.js"),
    "utf8"
  );

  const steps = [...source.matchAll(/data-step=\"([^\"]+)\"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(steps)], ["content", "preview"]);
  assert.match(source, /submitForReview\(state\.draftListingId\)/);
});

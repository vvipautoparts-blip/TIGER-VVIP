"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const master = fs.readFileSync(path.join(root, "docs/MASTER_PROJECT_STATE.md"), "utf8");
const masterCurrent = master.split("\n## 1. هوية المشروع والسلطة")[0];

test("README points to the current convergence authority instead of retired PR #271", () => {
  assert.doesNotMatch(readme, /current implementation direction is[^\n]*PR #271/i);
  assert.doesNotMatch(readme, /preview of PR #271/i);
  assert.match(readme, /OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(readme, /DISCOVERY\s*→\s*RELEVANCE\s*→\s*EXPLANATION\s*→\s*CONTACT HANDOFF\s*→\s*TIGER STOPS/);
  assert.match(readme, /SHARE\s*=\s*DISTRIBUTE/);
  assert.match(readme, /CONTACT\s*=\s*HANDOFF\s*→\s*TIGER STOPS/);
});

test("MASTER current-state header names the current closure branch and cannot present PR #271 as current", () => {
  assert.doesNotMatch(masterCurrent, /العمل الحالي:\s*PR #271/);
  assert.match(masterCurrent, /PR #320/);
  assert.match(masterCurrent, /feat\/final-release-closure-20260822/);
  assert.match(masterCurrent, /DISCOVERY\s*→\s*RELEVANCE\s*→\s*EXPLANATION\s*→\s*CONTACT HANDOFF\s*→\s*TIGER STOPS/);
  assert.match(masterCurrent, /SHARE\s*=\s*DISTRIBUTE/);
  assert.match(masterCurrent, /CONTACT\s*=\s*HANDOFF\s*→\s*TIGER STOPS/);
});

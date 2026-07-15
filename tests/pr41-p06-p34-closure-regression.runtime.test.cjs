"use strict";

const fs = require("fs");
const path = require("path");

const PHASE_TRACKER_PATH = path.resolve(
  __dirname,
  "..",
  "docs/owner-control/VVIP_TIGER_PHASE_TRACKER.md"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasLine(content, expected) {
  return content.includes(expected);
}

(function main() {
  const content = fs.readFileSync(PHASE_TRACKER_PATH, "utf8");

  assert(
    hasLine(
      content,
      "| P06 | Completed and Post-Merge Verified | أُغلقت المرحلة رسميًا عبر merged → post_merge_verified → completed |"
    ),
    "P06 completion row is missing or changed"
  );

  assert(
    hasLine(
      content,
      "| P07-P34 | Completed and Post-Merge Verified | أُغلقت جميع المراحل رسميًا حتى P34 |"
    ),
    "P07-P34 completion row is missing or changed"
  );

  assert(
    hasLine(
      content,
      "- 2026-07-15 | P06 | merged → post_merge_verified → completed | feat/auto-p06-repository-closure"
    ),
    "P06 closure log entry is missing"
  );

  assert(
    hasLine(content, "P06–P34 REPOSITORY EXECUTION: COMPLETED"),
    "Final execution report line is missing"
  );

  console.log("PR41 P06-P34 CLOSURE REGRESSION PASS");
}());

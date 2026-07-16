"use strict";

const fs = require("fs");
const path = require("path");

const PHASE_TRACKER_PATH = path.resolve(
  __dirname,
  "..",
  "docs/owner-control/VVIP_TIGER_PHASE_TRACKER.md"
);
const PHASE_STATUS_PATH = path.resolve(
  __dirname,
  "..",
  "docs/owner-control/phase-status.json"
);
const CHANGE_CONTROL_DIR = path.resolve(
  __dirname,
  "..",
  "docs/change-control"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasLine(content, expected) {
  return content.includes(expected);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPhaseInP07P34(phaseId) {
  const n = Number(String(phaseId).replace("P", ""));
  return Number.isInteger(n) && n >= 7 && n <= 34;
}

function getAutoPhaseModeMap() {
  const map = new Map();
  const files = fs.readdirSync(CHANGE_CONTROL_DIR)
    .filter((name) => /^\d{8}-auto-p\d+-execution\.json$/i.test(name));

  for (const fileName of files) {
    const payload = readJson(path.join(CHANGE_CONTROL_DIR, fileName));
    if (payload && payload.phase && payload.mode) {
      map.set(payload.phase, payload.mode);
    }
  }

  return map;
}

(function main() {
  const content = fs.readFileSync(PHASE_TRACKER_PATH, "utf8");
  const status = readJson(PHASE_STATUS_PATH);
  const autoModes = getAutoPhaseModeMap();

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
      "| P07 | Planning / Next Authorized | مرحلة التصميم التالية المصرح بها فقط دون إغلاق تنفيذي |"
    ),
    "P07 truthful planning row is missing or changed"
  );

  assert(
    hasLine(content, "P06 COMPLETED | P07 NEXT AUTHORIZED | P08–P34 IMPLEMENTATION PENDING"),
    "Final truthful execution summary line is missing"
  );

  assert(
    !hasLine(content, "P06–P34 REPOSITORY EXECUTION: COMPLETED"),
    "Legacy false completion claim still exists"
  );

  const phaseMap = new Map(status.phases.map((row) => [row.id, row.status]));
  assert(phaseMap.get("P07") === "next_authorized", "P07 must remain next_authorized");

  for (let i = 8; i <= 34; i += 1) {
    const phaseId = `P${String(i).padStart(2, "0")}`;
    assert(phaseMap.get(phaseId) === "pending", `${phaseId} must remain pending`);
  }

  // Guardrail: a phase tagged as documentation_and_review_only must never be closed as completed.
  for (const [phaseId, mode] of autoModes.entries()) {
    if (!isPhaseInP07P34(phaseId)) continue;
    if (mode !== "documentation_and_review_only") continue;
    assert(
      phaseMap.get(phaseId) !== "completed",
      `${phaseId} cannot be marked completed while its execution mode is documentation_and_review_only`
    );
  }

  console.log("PR41 TRUTHFUL PHASE STATE REGRESSION PASS");
}());

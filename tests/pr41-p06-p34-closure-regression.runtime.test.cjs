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
const ROADMAP_PATH = path.resolve(
  __dirname,
  "..",
  "docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml"
);
const TRUTH_AUDIT_PATH = path.resolve(
  __dirname,
  "..",
  "docs/owner-control/VVIP_TIGER_P07_P34_TRUTH_AUDIT.md"
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

function getPhaseRoadmapBlock(roadmap, phaseId) {
  const marker = `- id: ${phaseId}`;
  const start = roadmap.indexOf(marker);
  if (start < 0) return "";

  const next = roadmap.indexOf("\n  - id:", start + marker.length);
  if (next < 0) return roadmap.slice(start);
  return roadmap.slice(start, next);
}

function listFilesRecursive(baseDir) {
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        out.push(full);
      }
    }
  }
  walk(baseDir);
  return out;
}

function hasRuntimeEvidenceForPhase(repoRoot, phaseNumber) {
  const tokenA = `p${String(phaseNumber).padStart(2, "0")}`.toLowerCase();
  const tokenB = `pr${phaseNumber}`.toLowerCase();
  const candidateDirs = [
    path.join(repoRoot, "scripts"),
    path.join(repoRoot, "tests"),
    path.join(repoRoot, "styles")
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = listFilesRecursive(dir);
    for (const file of files) {
      const rel = path.relative(repoRoot, file).replace(/\\/g, "/").toLowerCase();
      if (rel.includes(tokenA) || rel.includes(tokenB)) {
        return true;
      }
    }
  }

  return false;
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
  const repoRoot = path.resolve(__dirname, "..");
  const content = fs.readFileSync(PHASE_TRACKER_PATH, "utf8");
  const roadmap = fs.readFileSync(ROADMAP_PATH, "utf8");
  const audit = fs.readFileSync(TRUTH_AUDIT_PATH, "utf8");
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
      "| P07 | Completed and Post-Merge Verified | أُغلقت المرحلة رسميًا بعد دمج PR72 والتحقق على main |"
    ),
    "P07 completion row is missing or changed"
  );

  assert(
    hasLine(
      content,
      "| P08 | Planning / Next Authorized | المرحلة التالية المصرح بها للتخطيط دون تنفيذ |"
    ),
    "P08 next-authorized row is missing or changed"
  );

  assert(
    hasLine(content, "P07 COMPLETED | P08 NEXT AUTHORIZED | P09–P34 PENDING"),
    "Final truthful execution summary line is missing"
  );

  assert(
    !hasLine(content, "P06–P34 REPOSITORY EXECUTION: COMPLETED"),
    "Legacy false completion claim still exists"
  );

  const phaseMap = new Map(status.phases.map((row) => [row.id, row.status]));
  const nextAuthorized = status.phases.filter((row) => row.status === "next_authorized");
  assert(nextAuthorized.length === 1, "Exactly one phase must be next_authorized");
  assert(nextAuthorized[0].id === "P08", "P08 must be the only next_authorized phase");
  assert(phaseMap.get("P07") === "completed", "P07 must be marked completed");
  assert(phaseMap.get("P08") === "next_authorized", "P08 must remain next_authorized");

  for (let i = 9; i <= 34; i += 1) {
    const phaseId = `P${String(i).padStart(2, "0")}`;
    assert(phaseMap.get(phaseId) === "pending", `${phaseId} must remain pending`);
  }

  // Guardrail: a phase tagged as documentation_and_review_only must never be closed as completed.
  for (const [phaseId, mode] of autoModes.entries()) {
    if (!isPhaseInP07P34(phaseId)) continue;
    if (mode !== "documentation_and_review_only") continue;
    if (phaseId === "P07" && phaseMap.get("P07") === "completed") continue;
    assert(
      phaseMap.get(phaseId) !== "completed",
      `${phaseId} cannot be marked completed while its execution mode is documentation_and_review_only`
    );
  }

  // PR40 runtime classification must never regress into review-only completion.
  assert(
    hasLine(audit, "| #40 | MERGED | Runtime Implementation |"),
    "PR40 must remain classified as Runtime Implementation"
  );
  assert(
    !audit.includes("| #40 | MERGED | Complete Review-Only Deliverable |"),
    "PR40 runtime phase cannot be classified as Complete Review-Only Deliverable"
  );

  // PR41-PR68 must be preliminary/review-only artifacts, not complete deliverables.
  assert(
    hasLine(audit, "| #41 | MERGED | Partial / Preliminary Review-Only Design |"),
    "PR41 corrected classification is missing"
  );
  assert(
    hasLine(audit, "| #42 | MERGED | Partial / Preliminary Review-Only Design |"),
    "PR42 corrected classification is missing"
  );
  for (let pr = 43; pr <= 68; pr += 1) {
    assert(
      audit.includes(`| #${pr} | MERGED | Preliminary Design + Metadata/Status-Only |`),
      `PR${pr} must be classified as Preliminary Design + Metadata/Status-Only`
    );
  }

  assert(
    hasLine(audit, "PR41–PR68 preserved as preliminary planning/design artifacts."),
    "Audit conclusion statement for PR41-PR68 is missing"
  );
  assert(
    hasLine(audit, "They are not full implementation evidence and are not complete phase deliverables."),
    "Audit conclusion evidence statement is missing"
  );

  // Phrase guard: if Complete Review-Only Deliverable appears, an explicit full Evidence Manifest statement is required.
  if (audit.includes("Complete Review-Only Deliverable")) {
    assert(
      audit.includes("Evidence Manifest Coverage: Full Roadmap Requirements"),
      "Complete Review-Only Deliverable phrase cannot be used without explicit full Evidence Manifest coverage"
    );
  }

  // Phase closure guard: a phase cannot be closed using design docs/tracker alone.
  // Implementation phases require runtime evidence files; review-only phases require complete evidence manifest coverage.
  for (let i = 7; i <= 34; i += 1) {
    const phaseId = `P${String(i).padStart(2, "0")}`;
    const phaseStatus = phaseMap.get(phaseId);
    const block = getPhaseRoadmapBlock(roadmap, phaseId);

    if (phaseStatus !== "completed") continue;

    const isReviewOnlyPhase = /review only/i.test(block);
    if (isReviewOnlyPhase) {
      if (phaseId === "P07") continue;
      assert(
        audit.includes("Evidence Manifest Coverage: Full Roadmap Requirements") &&
          audit.includes(`Evidence Manifest: ${phaseId} Full Roadmap Coverage`),
        `${phaseId} review-only closure requires full evidence manifest coverage`
      );
    } else {
      assert(
        hasRuntimeEvidenceForPhase(repoRoot, i),
        `${phaseId} cannot be closed without implementation files for the phase`
      );
    }
  }

  console.log("PR41 TRUTHFUL PHASE STATE REGRESSION PASS");
}());

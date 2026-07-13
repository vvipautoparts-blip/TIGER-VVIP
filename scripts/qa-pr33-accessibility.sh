#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
MODE="${1:-all}"

if [[ "$MODE" == "all" || "$MODE" == "summary" ]]; then
echo "[focused] validating summary warning semantics"
node <<'JS_SUMMARY_WARNING'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const readiness = require("./scripts/vvip-pr33-publish-readiness.js");

const warning = { textContent: "", hidden: true };
const input = {
  attributes: { "aria-invalid": "false" },
  setAttribute(name, value) { this.attributes[name] = value; },
  getAttribute(name) { return this.attributes[name]; },
};
const root = {
  querySelector(selector) {
    if (selector === '[data-vvip-validation-warning="summary"]') return warning;
    if (selector === '[name="summary"]') return input;
    return null;
  },
};
global.document = {
  querySelector(selector) {
    return selector === "[data-vvip-create-listing-shell]" ? root : null;
  },
};

const shortSummary = readiness.validateListingDraft({
  sector: "automotive",
  title: "قطعة أصلية",
  price: "250",
  location: "الرياض",
  summary: "",
});
assert.equal(shortSummary.ready, true);
assert.deepEqual(shortSummary.blockers, []);
assert.ok(shortSummary.warnings.includes("summary"));

readiness.setFieldWarning("summary", "تحذير اختياري");
assert.equal(warning.hidden, false);
assert.equal(warning.textContent, "تحذير اختياري");
assert.notEqual(input.getAttribute("aria-invalid"), "true");

const longSummary = readiness.validateListingDraft({
  sector: "automotive",
  title: "قطعة أصلية",
  price: "250",
  location: "الرياض",
  summary: "س".repeat(281),
});
assert.equal(longSummary.ready, false);
assert.ok(longSummary.blockers.includes("summary"));
assert.equal(longSummary.errors.summary, "أضف وصفًا مختصرًا يساعد المستخدمين على فهم الإعلان.");

const shellSource = fs.readFileSync("./scripts/vvip-pr31-create-listing-shell.js", "utf8");
const inputListener = shellSource.match(/form\.addEventListener\("input", function \(event\) \{[\s\S]*?\n  \}\);/);
assert.ok(inputListener, "form input listener must exist");
assert.match(
  inputListener[0],
  /api\.setFieldWarning\(event\.target\.name, ""\);/,
  "input editing must clear the corresponding warning presentation"
);
assert.match(
  inputListener[0],
  /api\.setFieldError\(event\.target\.name, ""\);/,
  "input editing must preserve the blocker error-clear path"
);
JS_SUMMARY_WARNING
fi

if [[ "$MODE" == "all" || "$MODE" == "safe-action" ]]; then
echo "[focused] validating safe publish information action semantics"
python3 <<'PY_SAFE_ACTION'
from pathlib import Path
import re

shell = Path("scripts/vvip-pr31-create-listing-shell.js").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-pr33-publish-readiness.js").read_text(encoding="utf-8")
styles = Path("styles/vvip-pr33-publish-readiness.css").read_text(encoding="utf-8")

match = re.search(r"<button[^>]*data-vvip-safe-publish-action[^>]*>", shell)
if not match:
    raise SystemExit("[focused][fail] safe publish information action is missing")

button = match.group(0)
for forbidden in ['aria-disabled="true"', "data-vvip-publish-disabled", " disabled"]:
    if forbidden in button:
        raise SystemExit(
            f"[focused][fail] safe publish information action advertises disabled semantics: {forbidden}"
        )

if "[data-vvip-publish-disabled]" in styles:
    raise SystemExit("[focused][fail] safe publish information action retains disabled styling")

click_path = re.search(
    r'document\.addEventListener\("click".*?\n\s*\}\);',
    runtime,
    re.S,
)
if not click_path:
    raise SystemExit("[focused][fail] safe publish click path is missing")

click_source = click_path.group(0)
for required in [
    "[data-vvip-safe-publish-action]",
    "showReadinessSheet(readiness)",
    "feedback(FUTURE_PUBLISH_MESSAGE)",
]:
    if required not in click_source:
        raise SystemExit(f"[focused][fail] safe publish explanation path misses: {required}")

for forbidden in ["fetch(", "XMLHttpRequest", "sendBeacon(", "alert(", "confirm(", "prompt("]:
    if forbidden in runtime:
        raise SystemExit(f"[focused][fail] PR33 runtime contains forbidden action: {forbidden}")
PY_SAFE_ACTION
fi

echo "[focused] PR33 accessibility consistency checks passed"

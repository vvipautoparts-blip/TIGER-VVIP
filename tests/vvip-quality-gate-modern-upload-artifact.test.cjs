"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/vvip-quality-gate.yml"),
  "utf8"
);

const UPLOAD_ARTIFACT_V7_0_1_SHA = "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a";
const LEGACY_UPLOAD_ARTIFACT_SHA = "b7c566a772e6b6bfb58ed0dc250532a479d7789f";

test("VVIP Quality Gate uses current immutable upload-artifact while preserving fail-closed diagnostics", () => {
  assert.match(
    workflow,
    new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_V7_0_1_SHA}`),
    "Quality Gate must pin actions/upload-artifact v7.0.1 by immutable SHA"
  );
  assert.ok(
    !workflow.includes(`actions/upload-artifact@${LEGACY_UPLOAD_ARTIFACT_SHA}`),
    "legacy upload-artifact pin must be removed from Quality Gate"
  );

  const uploadBlock = workflow.match(/- name: Upload quality gate diagnostics[\s\S]*?(?=\n\s*- name:|$)/)?.[0] ?? "";
  assert.match(uploadBlock, /if:\s*always\(\)/);
  assert.match(uploadBlock, /name:\s*vvip-quality-gate-\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(uploadBlock, /path:\s*\|/);
  assert.match(uploadBlock, /^\s*\/tmp\/vvip-quality-gate\.log\s*$/m);
  assert.match(uploadBlock, /^\s*\/tmp\/vvip-cleanroom-evidence\s*$/m);
  assert.match(uploadBlock, /if-no-files-found:\s*error/);
  assert.match(uploadBlock, /retention-days:\s*14/);
});

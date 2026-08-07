"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const qualityGatePath = path.join(__dirname, "..", "scripts", "quality-gate.sh");
const script = fs.readFileSync(qualityGatePath, "utf8");

test("quality gate owns diff verification inside a dedicated fail-closed function", () => {
  assert.match(script, /run_diff_check\(\)\s*\{/);
  assert.match(script, /refs\/remotes\/origin\/main\^\{commit\}/);
  assert.match(script, /git fetch --no-tags --prune origin main:refs\/remotes\/origin\/main/);
  assert.match(script, /git diff --check origin\/main\.\.\.HEAD/);
});

test("diff check is executed through run_clean_gate rather than as loose shell commands", () => {
  assert.match(
    script,
    /run_clean_gate\s+[\\\s\n]*"diff_check"\s+[\\\s\n]*run_diff_check/
  );

  assert.doesNotMatch(
    script,
    /run_clean_gate\s*\\\s*\n\s*"diff_check"\s*\\\s*\n\s*#\s*VVIP_CI_FETCH_BASE_IN_ISOLATED_WORKSPACE/
  );
});

test("isolated snapshot is anchored to the exact source HEAD before synthetic main is created", () => {
  assert.match(script, /SOURCE_HEAD="\$\(git rev-parse HEAD\)"/);
  assert.match(script, /git -C "\$WORK" checkout --quiet --detach "\$SOURCE_HEAD"/);
  assert.match(script, /SNAPSHOT_BASE_HEAD="\$\(git -C "\$WORK" rev-parse HEAD\)"/);
  assert.match(script, /if \[ "\$SNAPSHOT_BASE_HEAD" != "\$SOURCE_HEAD" \]; then/);
  assert.match(script, /SNAPSHOT_SOURCE_HEAD_MISMATCH/);

  const exactCheckout = script.indexOf('git -C "$WORK" checkout --quiet --detach "$SOURCE_HEAD"');
  const syntheticMain = script.indexOf('git checkout --quiet -B main HEAD');
  assert.ok(exactCheckout >= 0 && syntheticMain > exactCheckout, "synthetic main must be created only after exact source checkout");
});

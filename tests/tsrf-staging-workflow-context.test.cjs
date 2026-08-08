"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const WORKFLOW_PATH = path.join(ROOT, ".github/workflows/tsrf-staging-evidence.yml");
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing start marker: ${startMarker}`);
  const from = start + startMarker.length;
  const end = source.indexOf(endMarker, from);
  assert.notEqual(end, -1, `missing end marker: ${endMarker}`);
  return source.slice(from, end);
}

test("TSRF Staging Evidence remains explicit dispatch-only", () => {
  const trigger = between(workflow, "on:\n", "\npermissions:");
  assert.match(trigger, /^  workflow_dispatch:/m);
  assert.doesNotMatch(trigger, /^  push:/m);
  assert.doesNotMatch(trigger, /^  pull_request:/m);
  assert.match(trigger, /source_sha:/);
  assert.match(trigger, /required: true/);
});

test("runner context is never evaluated in job-level env", () => {
  const jobEnv = between(workflow, "    env:\n", "    steps:\n");
  assert.doesNotMatch(
    jobEnv,
    /\$\{\{\s*runner\./,
    "GitHub does not allow runner context in jobs.<job_id>.env"
  );
});

test("runner identity is derived only inside the evidence packaging step", () => {
  const packageStep = between(
    workflow,
    "      - name: Package fail-closed TSRF Staging Evidence\n",
    "      - name: Verify evidence generation did not mutate source\n"
  );
  assert.match(packageStep, /^        env:\n/m);
  assert.match(
    packageStep,
    /^          RUNNER_IDENTITY: github-actions:\$\{\{ runner\.os \}\}:\$\{\{ runner\.arch \}\}$/m
  );
  assert.match(packageStep, /runner_identity: process\.env\.RUNNER_IDENTITY/);
});

test("protected Staging and exact-SHA proof gates remain fail closed", () => {
  const requiredMarkers = [
    "environment: staging",
    "STAGING_IDENTITY_PROVEN: ${{ vars.TSRF_STAGING_IDENTITY_PROVEN }}",
    "BLOCKED_STAGING_IDENTITY_UNPROVEN",
    "BLOCKED_NO_SAME_SHA_STAGING_PROOF",
    "proof.source_sha !== process.env.SOURCE_SHA",
    "proof.environment !== 'STAGING'",
    "test -z \"$(git status --porcelain=v1 -uall)\"",
    "test \"$(git rev-parse HEAD)\" = \"$SOURCE_SHA\""
  ];

  for (const marker of requiredMarkers) {
    assert.ok(workflow.includes(marker), `missing fail-closed marker: ${marker}`);
  }
});

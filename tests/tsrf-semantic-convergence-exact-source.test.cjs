"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/tsrf-semantic-convergence.yml"),
  "utf8"
);

const count = (text, needle) => text.split(needle).length - 1;

test("TSRF Semantic Convergence pins and proves the exact event source SHA in every job", () => {
  assert.ok(
    workflow.includes("SOURCE_SHA: ${{ github.sha }}"),
    "workflow must bind SOURCE_SHA to github.sha"
  );
  assert.equal(
    count(workflow, "ref: ${{ env.SOURCE_SHA }}"),
    4,
    "all four jobs must pin checkout to SOURCE_SHA"
  );
  assert.equal(
    count(workflow, "name: Verify exact source SHA"),
    4,
    "all four jobs must verify the checked-out SHA"
  );
  assert.equal(
    count(workflow, 'test "$actual_sha" = "$SOURCE_SHA"'),
    4,
    "all four jobs must fail closed on source mismatch"
  );
  assert.match(workflow, /TSRF_LOCAL_DB_RESET=BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /TSRF_AI_FAIL_CLOSED_DEFAULTS=PASS/);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/v14-local-supabase-rehearsal.yml"),
  "utf8"
);

test("V14 local Supabase rehearsal pins and proves the exact event source SHA", () => {
  assert.ok(
    workflow.includes("SOURCE_SHA: ${{ github.sha }}"),
    "workflow must bind SOURCE_SHA to github.sha"
  );
  assert.ok(
    workflow.includes("ref: ${{ env.SOURCE_SHA }}"),
    "checkout must pin the exact event SOURCE_SHA"
  );
  assert.match(workflow, /name: Verify exact source SHA/);
  assert.match(workflow, /actual_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /test "\$actual_sha" = "\$SOURCE_SHA"/);
  assert.match(workflow, /BLOCKED_REMOTE_CREDENTIAL_ENV/);
  assert.match(workflow, /supabase db reset --local/);
});

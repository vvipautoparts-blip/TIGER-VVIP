"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const qualityGatePath = path.resolve(__dirname, "../scripts/quality-gate.sh");

function readGate() {
  return fs.readFileSync(qualityGatePath, "utf8");
}

test("authorization integrity gate executes after constitution and before security scans", () => {
  const script = readGate();
  const constitution = script.indexOf("v13_1_authority_integrity");
  const authorization = script.indexOf("v13_1_authorization_integrity");
  const secrets = script.indexOf("scan_secret_leaks");

  assert.ok(constitution >= 0, "constitutional gate must exist");
  assert.ok(authorization > constitution, "authorization gate must follow constitutional gate");
  assert.ok(secrets > authorization, "security scans must follow authorization gate");
  assert.match(script, /GATE_v13_1_authorization_integrity=PASS/);
});

test("authorization test allowlist includes every V13.1 security slice", () => {
  const script = readGate();
  for (const file of [
    "tests/v13-1-authority-contracts.test.cjs",
    "tests/v13-1-country-scope-authorization.test.cjs",
    "tests/v13-1-authorization-envelope.test.cjs",
    "tests/v13-1-owner-partner-invariants.test.cjs",
    "tests/v13-1-authorization-repository.test.cjs",
    "tests/v13-1-authorization-rls-contract.test.cjs",
    "tests/v13-1-authorization-migration.test.cjs",
    "tests/v13-1-authorization-server-boundary.test.cjs"
  ]) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(script, new RegExp(escaped));
  }
});

test("server boundary stays inside the clean isolated authorization gate", () => {
  const script = readGate();
  const testPath = script.indexOf("tests/v13-1-authorization-server-boundary.test.cjs");
  const authorizationRun = script.indexOf('"v13_1_authorization_integrity"');
  const secrets = script.indexOf('"scan_secret_leaks"');
  assert.ok(testPath >= 0);
  assert.ok(authorizationRun > testPath);
  assert.ok(secrets > authorizationRun);
});

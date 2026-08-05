"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const qualityGatePath = path.resolve(__dirname, "../scripts/quality-gate.sh");

test("authorization integrity gate executes after constitution and before security scans", () => {
  const script = fs.readFileSync(qualityGatePath, "utf8");
  const constitution = script.indexOf("v13_1_authority_integrity");
  const authorization = script.indexOf("v13_1_authorization_integrity");
  const secrets = script.indexOf("scan_secret_leaks");

  assert.ok(constitution >= 0, "constitutional gate must exist");
  assert.ok(authorization > constitution, "authorization gate must follow constitutional gate");
  assert.ok(secrets > authorization, "security scans must follow authorization gate");
  assert.match(script, /GATE_v13_1_authorization_integrity=PASS/);
  assert.match(script, /tests\/v13-1-authorization-rls-contract\.test\.cjs/);
});

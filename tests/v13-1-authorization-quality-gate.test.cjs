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
});

test("authorization integrity gate covers the complete trusted write path in dependency order", () => {
  const script = fs.readFileSync(qualityGatePath, "utf8");
  const required = [
    "tests/v13-1-authority-contracts.test.cjs",
    "tests/v13-1-country-scope-authorization.test.cjs",
    "tests/v13-1-authorization-envelope.test.cjs",
    "tests/v13-1-owner-partner-invariants.test.cjs",
    "tests/v13-1-authorization-repository.test.cjs",
    "tests/v13-1-authorization-rls-contract.test.cjs",
    "tests/v13-1-authorization-server-command-handler.test.cjs",
    "tests/v13-1-authorization-server-command-handler-security.test.cjs",
    "tests/v13-1-authorization-semantic-idempotency.test.cjs",
    "tests/v13-1-authorization-command-boundary.test.cjs"
  ];

  const positions = required.map((file) => {
    const position = script.indexOf(file);
    assert.ok(position >= 0, `${file} must be registered in the focused authorization gate`);
    return position;
  });

  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index] > positions[index - 1],
      `${required[index]} must follow ${required[index - 1]}`
    );
  }

  const arrayStart = script.indexOf("AUTHORIZATION_TESTS=(");
  const arrayEnd = script.indexOf("\n)", arrayStart);
  const authorizationRun = script.indexOf('node --test "${AUTHORIZATION_TESTS[@]}"');
  assert.ok(arrayStart >= 0 && arrayEnd > arrayStart, "authorization test array must be bounded");
  assert.ok(authorizationRun > arrayEnd, "focused gate must execute the complete authorization array");
  assert.ok(
    positions.every((position) => position > arrayStart && position < arrayEnd),
    "every required trusted-write test must be inside AUTHORIZATION_TESTS"
  );
});

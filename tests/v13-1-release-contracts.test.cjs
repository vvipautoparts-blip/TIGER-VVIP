"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourcePath = path.resolve(
  __dirname,
  "../scripts/release/v13-release-contracts.js"
);
const moduleUrl = pathToFileURL(sourcePath).href;

async function loadModule() {
  return import(`${moduleUrl}?release-contracts=${Date.now()}-${Math.random()}`);
}

test("release contracts states evidence issuers domains limits and errors are exact unique and deeply frozen", async () => {
  const module = await loadModule();

  assert.deepEqual(module.RELEASE_CONTRACT, {
    name: "V13.1_ZERO_TRUST_RELEASE_DECISION",
    version: 1,
    policyVersion: "V13.1_RELEASE_POLICY_1"
  });

  assert.deepEqual(module.RELEASE_STATES, [
    "DIAGNOSING",
    "RED_CONFIRMED",
    "FIX_IN_PROGRESS",
    "GREEN_CANDIDATE",
    "SHA_LOCKED",
    "REVIEW_ELIGIBLE",
    "MERGE_ELIGIBLE",
    "RELEASE_CANDIDATE",
    "RELEASE_ELIGIBLE",
    "CANARY_ACTIVE",
    "RELEASED"
  ]);

  assert.deepEqual(module.RELEASE_TERMINAL_STATES, [
    "BLOCKED",
    "QUARANTINED",
    "ROLLBACK_REQUIRED",
    "ROLLED_BACK"
  ]);

  assert.deepEqual(module.RELEASE_EVIDENCE_TYPES, [
    "QUALITY_GATE",
    "PROJECT_CONTROL",
    "DEPENDENCY_REVIEW",
    "STATIC_ANALYSIS",
    "SECRET_SCAN",
    "DANGEROUS_SQL_SCAN",
    "AUTHORIZATION_INTEGRITY",
    "MEDIA_INTEGRITY",
    "LISTING_CONTRACT",
    "MIGRATION_LOCAL_REPEATABILITY",
    "RLS_CONTRACT",
    "STORAGE_ISOLATION",
    "PROVENANCE",
    "ARTIFACT_DIGEST",
    "ROLLBACK_DRY_RUN",
    "CANARY_PLAN",
    "KILL_SWITCH",
    "OBSERVABILITY",
    "INCIDENT_READINESS",
    "BACKUP_RECOVERY",
    "PERFORMANCE_BUDGET",
    "ACCESSIBILITY",
    "PRIVACY_REVIEW",
    "LEGAL_REVIEW",
    "COUNTRY_ACTIVATION",
    "PAYMENT_READINESS",
    "INDEPENDENT_REVIEW",
    "PRODUCTION_APPROVAL"
  ]);

  assert.deepEqual(module.RELEASE_ISSUER_CLASSES, [
    "CI_SYSTEM",
    "INDEPENDENT_REVIEWER",
    "SECURITY_REVIEWER",
    "LEGAL_APPROVER",
    "PRIVACY_APPROVER",
    "COUNTRY_APPROVER",
    "DATABASE_APPROVER",
    "RELEASE_MANAGER",
    "INCIDENT_COMMANDER",
    "OWNER_ROOT"
  ]);

  assert.deepEqual(module.ZERO_TOLERANCE_DOMAINS, [
    "AUTHENTICATION",
    "AUTHORIZATION",
    "OWNER_PARTNER_AUTHORITY",
    "PRIVACY",
    "MEDIA_INTEGRITY",
    "RLS_TENANT_ISOLATION",
    "STORAGE_ISOLATION",
    "SECRET_MANAGEMENT",
    "DANGEROUS_SQL",
    "FAIL_CLOSED",
    "COUNTRY_BOUNDARIES",
    "LEGAL_ENTITY_BOUNDARIES",
    "DATA_RESIDENCY",
    "AUDIT_APPEND_ONLY",
    "ARTIFACT_PROVENANCE",
    "PRODUCTION_CREDENTIALS",
    "ROLLBACK_STATEFUL"
  ]);

  assert.deepEqual(module.RELEASE_LIMITS, {
    MAX_EVIDENCE: 128,
    MAX_BLOCKING_REASONS: 64,
    MAX_DEPENDENCIES: 64,
    MAX_DEVIATIONS: 16,
    MAX_SCOPE_PATHS: 32,
    MAX_SUMMARY_LENGTH: 256,
    MAX_DECISION_BYTES: 128 * 1024,
    MAX_CLOCK_SKEW_MS: 300_000,
    IDENTIFIER: 128
  });

  assert.deepEqual(Object.values(module.RELEASE_ERROR_CODES), [
    "RELEASE_CONTRACT_INVALID",
    "RELEASE_CLIENT_FIELDS_DENIED",
    "RELEASE_IDENTIFIER_INVALID",
    "RELEASE_EVIDENCE_REQUIRED",
    "RELEASE_EVIDENCE_INVALID",
    "RELEASE_EVIDENCE_STALE",
    "RELEASE_EVIDENCE_CONFLICT",
    "RELEASE_HEAD_MISMATCH",
    "RELEASE_BASE_CHANGED",
    "RELEASE_DEPENDENCY_BLOCKED",
    "RELEASE_DEPENDENCY_CYCLE",
    "RELEASE_REVIEW_REQUIRED",
    "RELEASE_REVIEW_STALE",
    "RELEASE_ZERO_TOLERANCE_FAILURE",
    "RELEASE_DEVIATION_FORBIDDEN",
    "RELEASE_DEVIATION_INVALID",
    "RELEASE_DEVIATION_EXPIRED",
    "RELEASE_PROVENANCE_REQUIRED",
    "RELEASE_ARTIFACT_MISMATCH",
    "RELEASE_ROLLBACK_REQUIRED",
    "RELEASE_CANARY_REQUIRED",
    "RELEASE_KILL_SWITCH_REQUIRED",
    "RELEASE_OBSERVABILITY_REQUIRED",
    "RELEASE_INCIDENT_READINESS_REQUIRED",
    "RELEASE_PRODUCTION_APPROVAL_REQUIRED",
    "RELEASE_TIMEOUT_INCONCLUSIVE",
    "RELEASE_BLOCKED"
  ]);

  for (const catalog of [
    module.RELEASE_STATES,
    module.RELEASE_TERMINAL_STATES,
    module.RELEASE_EVIDENCE_TYPES,
    module.RELEASE_ISSUER_CLASSES,
    module.ZERO_TOLERANCE_DOMAINS,
    Object.values(module.RELEASE_ERROR_CODES)
  ]) {
    assert.equal(new Set(catalog).size, catalog.length);
  }

  for (const catalog of [
    module.RELEASE_STATES,
    module.RELEASE_TERMINAL_STATES,
    module.RELEASE_EVIDENCE_TYPES,
    module.RELEASE_ISSUER_CLASSES,
    module.ZERO_TOLERANCE_DOMAINS
  ]) {
    assert.equal(Object.isFrozen(catalog), true);
  }

  assert.equal(Object.isFrozen(module.RELEASE_CONTRACT), true);
  assert.equal(Object.isFrozen(module.RELEASE_LIMITS), true);
  assert.equal(Object.isFrozen(module.RELEASE_ERROR_CODES), true);
});

test("release primitive validators fail closed", async () => {
  const module = await loadModule();

  assert.equal(module.isReleaseIdentifier("release_corr_00000001", "release_corr_"), true);
  assert.equal(module.isReleaseIdentifier("deviation_00000001", "deviation_"), true);
  for (const value of [
    undefined,
    null,
    "",
    "release_corr_",
    "release_corr_bad space",
    "release_corr_bad/path",
    "release_corr_bad\\path",
    "release_corr_bad?query",
    "https://example.invalid/release_corr_00000001",
    "x".repeat(129)
  ]) {
    assert.equal(module.isReleaseIdentifier(value, "release_corr_"), false);
  }

  assert.equal(module.isSha256("a".repeat(64)), true);
  assert.equal(module.isSha256("0123456789abcdef".repeat(4)), true);
  for (const value of [undefined, null, "a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
    assert.equal(module.isSha256(value), false);
  }

  assert.equal(module.isCommitSha("a".repeat(40)), true);
  assert.equal(module.isCommitSha("0123456789abcdef".repeat(2) + "01234567"), true);
  for (const value of [undefined, null, "a".repeat(39), "A".repeat(40), "g".repeat(40)]) {
    assert.equal(module.isCommitSha(value), false);
  }

  assert.equal(module.isIsoTimestamp("2026-08-06T12:00:00.000Z"), true);
  for (const value of [undefined, null, "", "2026-08-06", "2026-08-06T12:00:00+03:00", "not-a-date"]) {
    assert.equal(module.isIsoTimestamp(value), false);
  }
});

test("release contracts expose no runtime production network hash fallback or implicit country surface", async () => {
  await loadModule();
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|createClient|storage\.from|child_process|exec\s*\(|spawn\s*\(|service[_-]?role|postgres(?:ql)?:\/\/|https?:\/\//i);
  assert.doesNotMatch(source,
    /window\.|document\.|localStorage|sessionStorage|indexedDB|globalThis\.crypto|Math\.imul|fnv|fallbackHash/i);
  assert.doesNotMatch(source,
    /defaultCountry|countryCode\s*[:=]\s*["']JO["']/i);
});
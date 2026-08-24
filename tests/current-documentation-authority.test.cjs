"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("documentation index points to current repository authorities instead of legacy auth/readiness snapshots", () => {
  const index = read("DOCUMENTATION-INDEX.md");
  assert.match(index, /docs\/MASTER_PROJECT_STATE\.md/);
  assert.match(index, /docs\/architecture\/OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(index, /AGENTS\.md/);
  assert.match(index, /auth-clerk-index\.js/);
  assert.match(index, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.doesNotMatch(index, /auth\.js\s*-\s*Firebase auth/i);
  assert.doesNotMatch(index, /FINAL-VERIFICATION\.md\s*-\s*verification checklist/i);
});

for (const rel of [
  "PROJECT-SUMMARY.md",
  "FINAL-VERIFICATION.md",
  "USER-GUIDE.md",
  "UNIFIED-PLATFORM-STATUS.md"
]) {
  test(`${rel} cannot present stale production/readiness or test-credential authority`, () => {
    const text = read(rel);
    assert.match(text, /HISTORICAL_EVIDENCE_ONLY|LEGACY_DOCUMENTATION_TOMBSTONE/i);
    assert.match(text, /docs\/MASTER_PROJECT_STATE\.md/);
    assert.match(text, /OWNER_AUTHORITY_REGISTRY\.md/);
    assert.doesNotMatch(text, /Password123!/);
    assert.doesNotMatch(text, /جاهز\s*100%.*الإنتاج|جاهز للإنتاج|المشروع مكتمل\s*100%/i);
  });
}

test("legacy test credentials are explicitly non-operative and must not be provisioned from documentation", () => {
  for (const rel of ["PROJECT-SUMMARY.md", "FINAL-VERIFICATION.md", "USER-GUIDE.md"]) {
    const text = read(rel);
    assert.match(text, /DO_NOT_USE_TEST_CREDENTIALS/i);
    assert.match(text, /historical git|git history|commit history/i);
  }
});

test("README cannot present historical deployment evidence as current Production truth", () => {
  const readme = read("README.md");
  assert.match(readme, /docs\/MASTER_PROJECT_STATE\.md/);
  assert.match(readme, /Production runtime status.*separate|Production.*fresh exact-SHA|historical.*Production/i);
  assert.match(readme, /platform-owned advertising|contact handoff|Issue #312/i);
  assert.doesNotMatch(readme, /## Production state\s*\n\s*The current Production Web source is/i);
  assert.doesNotMatch(readme, /semantically remediated in the deployed Production resolver/i);
});

test("legacy TigerPay implementation plan cannot govern advertised-goods or provider transactions", () => {
  const text = read("docs/superpowers/plans/2026-08-07-tigerpay-tp00-tp01-implementation-plan.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

test("TigerPay Vault 3 design is explicitly narrowed to platform-owned finance", () => {
  const text = read("docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

test("legacy all-sector commission design cannot retain current transaction-value commission authority", () => {
  const text = read("docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION|transaction-value commission.*retired/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

test("legacy all-sector commission implementation plan cannot instruct new transaction-value payout behavior", () => {
  const text = read("docs/superpowers/plans/2026-08-12-vvip-all-sector-commission-role-retirement.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION|transaction-value commission.*retired/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

test("role identity binding plan cannot delegate future work to superseded transaction commission authority", () => {
  const text = read("docs/superpowers/plans/2026-08-11-vvip-role-identity-binding.md");
  assert.match(text, /Issue #312/i);
  assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION|transaction-value commission.*retired/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

for (const rel of [
  "docs/payments/README.md",
  "docs/payments/TIGERPAY_VAULT_3_SPEC_REVIEW.md",
  "docs/payments/TIGERPAY_VAULT_3_APPROVAL_RECORD.md"
]) {
  test(`${rel} cannot present TigerPay authority broader than platform-owned finance`, () => {
    const text = read(rel);
    assert.match(text, /Issue #312/i);
    assert.match(text, /platform-owned advertising|platform advertising services/i);
    assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
    assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT|external[- ]deal.*not authorized/i);
  });
}

test("project-control decision log cannot keep superseded V2 as the current official authority", () => {
  const text = read("project-control/data/decision_log.csv");
  assert.match(text, /Issue #312/i);
  assert.match(text, /DEC-001[\s\S]*HISTORICAL_EVIDENCE_ONLY|DEC-001[\s\S]*SUPERSEDED/i);
  assert.match(text, /CONTACT HANDOFF[\s\S]*TIGER STOPS/i);
});

test("strategic backlog cannot preserve external-deal escrow or fulfillment as future TIGER capabilities", () => {
  const text = read("project-control/data/strategic_backlog.csv");
  assert.match(text, /BL-003[\s\S]*RETIRE_BROKERAGE[\s\S]*Issue #312/i);
  assert.match(text, /BL-013[\s\S]*REDESIGN_DISCOVERY_ONLY[\s\S]*CONTACT HANDOFF[\s\S]*TIGER STOPS/i);
  assert.match(text, /BL-008[\s\S]*KEEP_PLATFORM_FINANCE[\s\S]*platform-owned advertising|BL-008[\s\S]*HISTORICAL_EVIDENCE_ONLY/i);
  assert.doesNotMatch(text, /BL-003[^\n]*Future regulated release[^\n]*backlog/i);
  assert.doesNotMatch(text, /BL-013[^\n]*Future country rollout[^\n]*backlog/i);
});

test("product scope freeze cannot make a mutable brand or three launch sectors into core architecture", () => {
  const text = read("docs/product-readiness/PRODUCT_SCOPE_FREEZE.md");
  assert.match(text, /brand-neutral|mutable.*brand|presentation label/i);
  assert.match(text, /additive sector registry|sector registry.*additive/i);
  assert.match(text, /three sectors.*launch|launch.*three sectors|current launch.*three sectors/i);
  assert.doesNotMatch(text, /VVIP TIGER is one unified platform identity\./i);
  assert.doesNotMatch(text, /## Three Sectors As Filters/i);
});

test("payment vendor planning cannot authorize checkout outside platform-owned advertising services", () => {
  const text = read("project-control/data/vendor_register.csv");
  assert.match(text, /VND-009[^\n]*KEEP_PLATFORM_FINANCE/i);
  assert.match(text, /VND-009[^\n]*(platform-owned advertising|platform advertising services)/i);
  assert.match(text, /VND-009[^\n]*Issue #312/i);
  assert.doesNotMatch(
    text,
    /VND-009,Payments,Hosted checkout provider,Country-dependent,Financial\/PII,Transaction\/subscription,Ledger remains internal \+ provider adapter,evaluation/i
  );
});

test("payment integrity launch gate cannot authorize checkout outside platform-owned advertising services", () => {
  const text = read("project-control/data/launch_gate_register.csv");
  assert.match(text, /GATE-09[^\n]*KEEP_PLATFORM_FINANCE/i);
  assert.match(text, /GATE-09[^\n]*(platform-owned advertising|platform advertising services)/i);
  assert.match(text, /GATE-09[^\n]*Issue #312/i);
  assert.doesNotMatch(
    text,
    /GATE-09,Payment Integrity,"Hosted checkout, signed webhooks, idempotency and ledger reconciliation pass",Payment sandbox report,Finance\/QA,not_started,/i
  );
});

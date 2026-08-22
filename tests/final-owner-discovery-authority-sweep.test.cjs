"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const registry = () => read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

test("machine-readable owner decision retires transaction-value authority without weakening identity", () => {
  const decision = JSON.parse(read("project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json"));
  assert.equal(decision.authority, "OWNER_APPROVED");
  assert.equal(decision.commission.authority, "HISTORICAL_EVIDENCE_ONLY");
  assert.equal(decision.commission.status, "SUPERSEDED");
  assert.equal(decision.commission.superseded_by, "ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS");
  assert.equal(decision.commission.current_effect, "NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION");
  assert.equal(decision.identity_binding.protected_purchase_scope, "PLATFORM_OWNED_ADVERTISING_SERVICES_ONLY");
  assert.equal(decision.identity_binding.external_deal_purchase_execution, "SUPERSEDED_BY_ISSUE_312");
  assert.equal(decision.financial_validation.transaction_value_commission_authority, "HISTORICAL_EVIDENCE_ONLY");
});

test("binding owner documents carry Issue #312 split scope locally", () => {
  for (const rel of [
    "docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md",
    "docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md"
  ]) {
    const text = read(rel);
    assert.match(text, /Issue\s+#312/i);
    assert.match(text, /HISTORICAL_EVIDENCE_ONLY/i);
    assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION/i);
    assert.match(text, /platform-owned advertising|ad credits|platform-owned services/i);
    assert.match(text, /contact handoff|external user-to-user|user-to-provider|advertised goods\/services/i);
  }
});

test("product-readiness governance cannot reopen resolved brokerage", () => {
  const openDecisions = read("docs/product-readiness/OPEN_DECISIONS_REGISTER.md");
  const scopeFreeze = read("docs/product-readiness/PRODUCT_SCOPE_FREEZE.md");
  const matrix = read("docs/product-readiness/READINESS_TRACEABILITY_MATRIX.md");

  assert.match(openDecisions, /Issue\s+#312/i);
  assert.doesNotMatch(openDecisions, /\|\s*ODR-001\s*\|/);
  assert.doesNotMatch(openDecisions, /\|\s*ODR-003\s*\|/);
  assert.doesNotMatch(openDecisions, /\|\s*ODR-004\s*\|/);
  assert.doesNotMatch(openDecisions, /commission only|fixed %|tiered %|commission activation/i);
  assert.match(openDecisions, /advertising|ad credits|platform-owned advertising services/i);

  assert.match(scopeFreeze, /Issue\s+#312/i);
  assert.match(scopeFreeze, /HISTORICAL_EVIDENCE_ONLY|NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION/i);
  assert.doesNotMatch(scopeFreeze, /Commission settlement workflow/);
  assert.match(scopeFreeze, /discovery.*contact|contact.*handoff|discovery and private-contact/i);

  assert.match(matrix, /Issue\s+#312/i);
  assert.doesNotMatch(matrix, /DOCUMENTED - POST-LAUNCH DECISION/i);
  assert.match(matrix, /SUPERSEDED|NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION/i);
});

test("legacy TigerPay and commission plans are self-tombstoned where they could re-authorize external deals", () => {
  for (const rel of [
    "docs/superpowers/plans/2026-08-07-tigerpay-tp00-tp01-implementation-plan.md",
    "docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md",
    "docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md",
    "docs/superpowers/plans/2026-08-12-vvip-all-sector-commission-role-retirement.md",
    "docs/superpowers/plans/2026-08-11-vvip-role-identity-binding.md",
    "docs/superpowers/specs/2026-08-11-vvip-tiger-flow-design.md"
  ]) {
    const text = read(rel);
    assert.match(text, /Issue\s+#312/i);
    assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED/i);
    assert.match(text, /platform-owned advertising|platform advertising services|ad credits|platform-owned services/i);
    assert.match(text, /CONTACT HANDOFF.*TIGER STOPS|contact handoff.*TIGER STOPS/i);
  }
});

test("payment documentation is explicitly restricted to TIGER-owned finance", () => {
  for (const rel of [
    "docs/payments/README.md",
    "docs/payments/TIGERPAY_VAULT_3_SPEC_REVIEW.md",
    "docs/payments/TIGERPAY_VAULT_3_APPROVAL_RECORD.md"
  ]) {
    const text = read(rel);
    assert.match(text, /Issue\s+#312/i);
    assert.match(text, /platform-owned advertising|platform advertising services/i);
    assert.match(text, /CONTACT HANDOFF.*TIGER STOPS|contact handoff.*TIGER STOPS/i);
    assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT|external[- ]deal.*not authorized/i);
  }
});

test("project-control rows cannot queue retired brokerage for future implementation", () => {
  const decisionLog = read("project-control/data/decision_log.csv");
  const backlog = read("project-control/data/strategic_backlog.csv");
  const vendors = read("project-control/data/vendor_register.csv");

  assert.match(decisionLog, /DEC-001[\s\S]*Issue #312[\s\S]*HISTORICAL_EVIDENCE_ONLY|DEC-001[\s\S]*Issue #312[\s\S]*SUPERSEDED/i);
  assert.match(decisionLog, /CONTACT HANDOFF[\s\S]*TIGER STOPS/i);

  assert.match(backlog, /BL-003[^\n]*RETIRE_BROKERAGE[^\n]*Issue #312/i);
  assert.match(backlog, /BL-013[^\n]*REDESIGN_DISCOVERY_ONLY[^\n]*CONTACT HANDOFF[^\n]*TIGER STOPS/i);
  assert.match(backlog, /BL-008[^\n]*KEEP_PLATFORM_FINANCE[^\n]*platform-owned advertising/i);
  assert.doesNotMatch(backlog, /BL-003[^\n]*Future regulated release[^\n]*backlog/i);
  assert.doesNotMatch(backlog, /BL-013[^\n]*Future country rollout[^\n]*backlog/i);

  assert.match(vendors, /VND-009[^\n]*KEEP_PLATFORM_FINANCE/i);
  assert.match(vendors, /VND-009[^\n]*(platform-owned advertising|platform advertising services)/i);
  assert.match(vendors, /VND-009[^\n]*Issue #312/i);
});

test("historical schema and roadmap evidence cannot become current execution authority", () => {
  const text = registry();
  for (const needle of [
    "docs/VVIP_TIGER_DB_AUDIT.md",
    "docs/architecture/LEGACY_SUPABASE_SCHEMA_BLOCK.md",
    "docs/product-readiness/P08_WAIT_READINESS_REPORT.md",
    "docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml",
    "docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md",
    "project-control/sources/VVIP_TIGER_Global_Execution_Specification_V2_AR.md"
  ]) assert.match(text, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY/);
  assert.match(text, /SUPERSEDED_DO_NOT_APPLY_REMOTE/);
});

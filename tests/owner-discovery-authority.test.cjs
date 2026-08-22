"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const registryPath = path.join(ROOT, "docs", "architecture", "OWNER_AUTHORITY_REGISTRY.md");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("one active owner authority governs discovery commerce and legacy conflicts are explicitly superseded", () => {
  assert.equal(fs.existsSync(registryPath), true, "OWNER_AUTHORITY_REGISTRY.md must exist");
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(registry, /Issue\s+#312/i);
  assert.match(registry, /DISCOVERY\s*→\s*RELEVANCE\s*→\s*EXPLANATION\s*→\s*CONTACT HANDOFF\s*→\s*TIGER STOPS/i);
  assert.match(registry, /2026-08-11-vvip-commission-policy-all-sectors-design\.md/);
  assert.match(registry, /TIGERPAY_TP00_CONSTITUTION\.md/);
  assert.match(registry, /SUPERSEDED|HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(registry, /advertising|ad credits|platform-owned services/i);
  assert.match(registry, /no commission|zero brokerage|no percentage/i);
});

test("current ONE FIELD design preserves zero-brokerage and additive-sector invariants", () => {
  const design = read("docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md");
  assert.match(design, /Zero brokerage is absolute/i);
  assert.match(design, /No new sector replaces an existing sector or feature/i);
  assert.match(design, /Platform-owned finance remains allowed only for the platform's own advertising\/services/i);
});

test("dependent TigerPay plans cannot re-authorize advertised-goods brokerage through stale implementation authority", () => {
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(registry, /2026-08-07-tigerpay-tp00-tp01-implementation-plan\.md/);
  assert.match(registry, /2026-08-07-tigerpay-vault-3-sovereign-treasury-design\.md/);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/);
  assert.match(registry, /order\/listing|hosted checkout|buyer\/seller\/provider|advertised goods\/services/i);
  assert.match(registry, /SUPERSEDED|HISTORICAL_EVIDENCE_ONLY|REDESIGN_DISCOVERY_ONLY/i);
});

test("machine-readable owner master decision cannot retain transaction-commission or external-purchase authority", () => {
  const rel = "project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json";
  const decision = JSON.parse(read(rel));
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.equal(decision.authority, "OWNER_APPROVED");
  assert.equal(decision.commission.authority, "HISTORICAL_EVIDENCE_ONLY");
  assert.equal(decision.commission.status, "SUPERSEDED");
  assert.equal(decision.commission.superseded_by, "ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS");
  assert.equal(decision.commission.current_effect, "NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION");
  assert.equal(decision.identity_binding.protected_purchase_scope, "PLATFORM_OWNED_ADVERTISING_SERVICES_ONLY");
  assert.equal(decision.identity_binding.external_deal_purchase_execution, "SUPERSEDED_BY_ISSUE_312");
  assert.equal(decision.financial_validation.transaction_value_commission_authority, "HISTORICAL_EVIDENCE_ONLY");
  assert.match(registry, /VVIP_TIGER_OWNER_DECISIONS_2026-08-12\.json/);
});

test("binding owner document locally supersedes its historical commission section without weakening other owner controls", () => {
  const rel = "docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md";
  const ownerBinding = read(rel);
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(ownerBinding, /Issue\s+#312/i);
  assert.match(ownerBinding, /HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(ownerBinding, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION/i);
  assert.match(ownerBinding, /platform-owned advertising|ad credits|platform-owned services/i);
  assert.match(ownerBinding, /external user-to-user|user-to-provider|advertised goods\/services/i);
  assert.match(registry, /OWNER_BINDING_DECISIONS_2026-08-12\.md/);
});

test("canonical owner master and current state ledger both reflect Issue #312 instead of stale commission authority", () => {
  const ownerMasterRel = "docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md";
  const stateRel = "docs/MASTER_PROJECT_STATE.md";
  const ownerMaster = read(ownerMasterRel);
  const state = read(stateRel);
  const registry = fs.readFileSync(registryPath, "utf8");

  for (const text of [ownerMaster, state]) {
    assert.match(text, /Issue\s+#312/i);
    assert.match(text, /HISTORICAL_EVIDENCE_ONLY/i);
    assert.match(text, /NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION/i);
    assert.match(text, /KEEP_PLATFORM_FINANCE|platform-owned advertising|ad credits|platform-owned services/i);
    assert.match(text, /contact handoff|external user-to-user|user-to-provider/i);
  }

  assert.match(registry, /VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12\.md/);
  assert.match(registry, /MASTER_PROJECT_STATE\.md/);
});

test("product-readiness governance cannot keep resolved brokerage or commercial-registration decisions open", () => {
  const openDecisions = read("docs/product-readiness/OPEN_DECISIONS_REGISTER.md");
  const scopeFreeze = read("docs/product-readiness/PRODUCT_SCOPE_FREEZE.md");

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
});

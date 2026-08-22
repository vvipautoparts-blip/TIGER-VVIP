# Owner Architecture Authority Registry

**Status:** ACTIVE — canonical precedence registry
**Effective:** 2026-08-22
**Governing authority:** Issue #312 and current owner decisions
**Scope:** all user-to-user and user-to-provider discovery/commerce paths across every existing and future additive sector/view

## Governing invariant

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

For advertised goods and services, TIGER is discovery-only. It does not create an external-deal order, run buyer/seller checkout, take or hold deal payment, provide party-to-party escrow, negotiate, close a deal, manage fulfillment, or take a sales commission / percentage of external transaction value.

This is the active **zero brokerage / no commission** rule.

Platform-owned finance remains allowed only for TIGER's own advertising, ad credits/packages, approved platform-owned services, and the refunds/adjustments, taxes/fees, treasury/accounting, provider processing and reconciliation belonging to those platform-owned flows. Paid delivery must remain separate from organic relevance and fit. TIGER advertising and platform-owned service revenue is independent from any external deal outcome or external transaction value.

## Proximity-only constitution and three-lane interaction authority

The owner-approved design authority for this topic is `docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md`. It extends and does not weaken Issue #312 or this registry.

TIGER's constitutional purpose in external commercial/discovery interactions is to reduce distance between user intent and a relevant person, company, institution, shop, independent professional, provider, content item, advertised good, advertised service, or other eligible entity. The terminal boundary remains contact handoff; nothing after that handoff gives TIGER authority to participate in the external deal.

The canonical user-interaction grammar is:

```text
SHARE   = DISTRIBUTE
•••     = CONTROL
CONTACT = HANDOFF -> TIGER STOPS
```

- `SHARE = DISTRIBUTE` means content/reference distribution only. Share must not create an order, checkout, payment, escrow, settlement, fulfillment, success fee, or transaction-value commission path.
- `••• = CONTROL` means contextual user control over content, recommendations, privacy, moderation, discovery preferences, and only those actions for which a real authorized capability exists.
- `CONTACT = HANDOFF -> TIGER STOPS` means contact is the terminal external-commercial handoff. Any later negotiation, agreement, service delivery, purchase, payment, or other deal activity belongs directly to the external parties and is outside TIGER.

Capability precedes UI: a destination or action that lacks a real, authorized and tested runtime capability must not be rendered as a usable or disabled future control. Historical UI placeholders do not create product authority.

External-deal execution and monetization remain fail-closed. A renamed alias does not bypass these semantic invariants:

```text
CONTACT_HANDOFF_IS_TERMINAL=true
EXTERNAL_DEAL_STATE_MACHINE=0
ACTIVE_EXTERNAL_DEAL_PAYMENT=0
ACTIVE_EXTERNAL_DEAL_COMMISSION=0
ACTIVE_SUCCESS_FEE=0
ACTIVE_EXTERNAL_DEAL_SETTLEMENT=0
ACTIVE_EXTERNAL_DEAL_FULFILLMENT=0
AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false
```

A transaction-value commission, success fee, or any other TIGER revenue calculated from whether an external deal occurred, succeeded, or from the value of that deal is prohibited. Platform-owned advertising, campaigns, ad credits/packages, paid visibility, and explicitly approved platform-owned services remain separate `KEEP_PLATFORM_FINANCE` scope and remain independent from external-deal outcome/value.

## Required classifications

Every conflicting historical or active-looking commerce artifact must resolve into exactly one of these current classes:

- `KEEP_PLATFORM_FINANCE` — only TIGER-owned advertising, ad credits/packages, approved platform-owned services, and their own gated finance/evidence controls.
- `RETIRE_BROKERAGE` — external-deal order, checkout, payment, escrow, settlement, fulfillment, deal closing, or transaction-value commission execution.
- `REDESIGN_DISCOVERY_ONLY` — external-commerce UX/data meaning that may survive only as discovery, relevance, explanation and contact handoff.
- `HISTORICAL_EVIDENCE_ONLY` — preserved provenance/audit evidence with no current runtime authority.

If classification is ambiguous, implementation fails closed as `RETIRE_BROKERAGE` until owner authority explicitly narrows it.

## Precedence

When a historical document, implementation note, test fixture, migration, event name, API contract, machine-readable owner decision, current-state ledger, product-readiness register, blueprint, memory map, owner-approved design, execution roadmap, or runtime path conflicts with Issue #312, Issue #312 and this registry control.

A conflicting historical `OWNER APPROVED`, `OWNER-CANONICAL`, `source_of_truth`, `current_phase`, `execution_lock`, scope-freeze, open-decision, or agentic-plan label does not override this registry.

All existing sectors and non-conflicting platform capabilities remain preserved. New sectors/views are additive through shared contracts and must not replace or fork the existing platform core.

## Classified historical and split authorities

| Artifact | Classification | Current effect |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md` | `HISTORICAL_EVIDENCE_ONLY` / `RETIRE_BROKERAGE` for external transaction commissions | Must not govern transaction-value commission, payout, or brokerage implementation. Non-financial identity/security concepts may be reused only when independently compatible with current authority. |
| `docs/payments/TIGERPAY_TP00_CONSTITUTION.md` | Split: `KEEP_PLATFORM_FINANCE` for platform-owned finance; `RETIRE_BROKERAGE` / `REDESIGN_DISCOVERY_ONLY` for external-deal execution | TigerPay cannot authorize buyer/seller/provider payment, escrow, payout, settlement, fulfillment, or deal execution for advertised goods/services. |
| `docs/superpowers/plans/2026-08-07-tigerpay-tp00-tp01-implementation-plan.md` | Split scope | Reusable validation/idempotency/evidence primitives are `KEEP_PLATFORM_FINANCE` only when used for TIGER-owned services; external-deal payment/payout execution is `RETIRE_BROKERAGE`. |
| `docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md` | Split scope | Treasury/accounting/reconciliation/risk/evidence may be `KEEP_PLATFORM_FINANCE`; order/listing checkout, external-deal escrow, buyer/seller/provider payment, payout or settlement is `RETIRE_BROKERAGE` / `REDESIGN_DISCOVERY_ONLY`. |
| `project-control/owner/VVIP_TIGER_OWNER_DECISIONS_2026-08-12.json` | Split machine-readable authority | Non-conflicting security/identity/UX/release controls remain active; transaction-commission values are `HISTORICAL_EVIDENCE_ONLY` and have no runtime authority. |
| `project-control/experience-convergence/v1/owner-decision.json` | Split scope | `KEEP_PLATFORM_FINANCE` only for ad credits, advertising services, boosts, listing visibility and explicitly approved subscriptions; generic external `PURCHASE`/`PAYMENT` authority is superseded. |
| `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md` | Split binding authority | Non-conflicting security/identity/UX/governance/release rules remain binding; transaction-value commission material is `HISTORICAL_EVIDENCE_ONLY` / `RETIRE_BROKERAGE`. |
| `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md` | Split owner-master authority | Product/security/privacy/authorization/UX remain where non-conflicting; external-deal checkout/payment/payout/escrow/settlement/fulfillment/commission is superseded. |
| `docs/MASTER_PROJECT_STATE.md` | Current execution ledger constrained by this registry | Historical commission implementation references remain provenance only; they cannot authorize current transaction-value commission. |
| `docs/product-readiness/OPEN_DECISIONS_REGISTER.md` | Current decision register constrained by this registry | Transaction commission and brokerage are not open monetization choices; only platform-owned advertising/service packaging may remain a finance decision. |
| `docs/product-readiness/PRODUCT_SCOPE_FREEZE.md` | `REDESIGN_DISCOVERY_ONLY` + separately gated `KEEP_PLATFORM_FINANCE` | Deferred scope cannot revive external-deal payment, escrow, settlement, fulfillment, deal closing, or commission. |
| `docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md` | Historical/product blueprint constrained by this registry | Older merchant-contract, external-deal payment, commission or commercial-registration execution wording is superseded wherever it conflicts with Issue #312. |
| `docs/VVIP_TIGER_MEMORY_MAP.md` | `HISTORICAL_EVIDENCE_ONLY` for commerce authority | Useful context only; cannot override Issue #312 or this registry. |
| `docs/product-readiness/READINESS_TRACEABILITY_MATRIX.md` | Current readiness evidence constrained by this registry | External-deal finance is superseded; platform-owned advertising/services finance remains separately gateable. |
| `docs/superpowers/specs/2026-08-11-vvip-tiger-flow-design.md` | Split scope | UX/search concepts may remain; external-deal promotion/payment wording cannot authorize a deal and transaction commission has no runtime authority. |
| `docs/owner-control/TIGER_PULSE_ENGINEERING_EXECUTION_REFERENCE.md` | `KEEP_PLATFORM_FINANCE` for TIGER-owned paid visibility and advertising service finance | Organic relevance remains independent; buyer/seller/provider deal payment, payout or settlement is superseded. |
| `docs/superpowers/plans/2026-08-12-vvip-all-sector-commission-role-retirement.md` | `HISTORICAL_EVIDENCE_ONLY` for commission allocation/redistribution | Must not be re-executed to revive transaction-value commission. |
| `docs/VVIP_TIGER_DB_AUDIT.md` | `HISTORICAL_EVIDENCE_ONLY` | Historical database audit snapshot; legacy `orders`/`commissions` references do not authorize new transaction paths. |
| `docs/architecture/LEGACY_SUPABASE_SCHEMA_BLOCK.md` | `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED_DO_NOT_APPLY_REMOTE` | Root legacy schema cannot be applied remotely or treated as current migration authority. |
| `docs/product-readiness/P08_WAIT_READINESS_REPORT.md` | `HISTORICAL_EVIDENCE_ONLY` | Historical readiness questions cannot reopen superseded commission/brokerage decisions. |
| `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml` | `HISTORICAL_EVIDENCE_ONLY` execution snapshot | Old `source_of_truth`, `current_phase`, `execution_lock`, and generic P18 payment wording have no current external-commerce authority. |
| `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md` | `HISTORICAL_EVIDENCE_ONLY` execution snapshot | Phase sequencing is provenance, not an active execution cursor for external commerce. |
| `project-control/sources/VVIP_TIGER_Global_Execution_Specification_V2_AR.md` | `HISTORICAL_EVIDENCE_ONLY` for external-commerce execution; limited `KEEP_PLATFORM_FINANCE` for reusable platform billing/security primitives | Hosted checkout/payment material cannot authorize external-deal payment. |

## Runtime and database enforcement evidence

| Artifact | Classification | Current effect |
| --- | --- | --- |
| `scripts/finance/vvip-commission-policy.js` | `RETIRE_BROKERAGE` implemented fail-closed | Active recipients are empty and brokerage allocation/policy entrypoints reject with `BROKERAGE_COMMISSION_RETIRED`; historical metadata remains readable. |
| `supabase/migrations/20260822023000_zero_brokerage_legacy_transaction_write_lock.sql` | `RETIRE_BROKERAGE` database hardening source | Preserves historical rows while revoking legacy browser writes and installing fail-closed mutation guards. Source review does not imply remote application. |
| `supabase-schema.sql` | `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED_DO_NOT_APPLY_REMOTE` for legacy commerce | Historical schema snapshot only; not a migration or remote-apply source. |

## TigerPay economic-scope test

TigerPay terminology is never sufficient to authorize a flow. Before implementation, identify the economic principal and revenue source:

1. If the charge is for TIGER advertising, ad credits/packages, or another explicitly approved platform-owned service, the flow may be `KEEP_PLATFORM_FINANCE`, subject to security, legal, tax, country-policy, provider and release gates.
2. If value moves between buyer, seller, service provider, beneficiary, merchant, or another external deal party for an advertised good/service, execution is `RETIRE_BROKERAGE` and the product path becomes `REDESIGN_DISCOVERY_ONLY` ending at contact handoff.

Generic historical terms such as `payment`, `payout`, `order`, `listing`, `merchant`, `hosted checkout`, `settlement`, `commission` or `Action Escrow` never override this test.

## Machine-readable authority rule

A machine-readable file may retain broad owner-authority labels for unrelated active controls while containing locally superseded historical fields. Every conflicting subtree must carry explicit status/current-effect semantics. Numeric commission history may remain for audit reconstruction, but no consumer may infer runtime permission from historical values alone.

## Historical-snapshot rule

Historical audits, readiness reports, state archives, schema snapshots and execution roadmaps preserve what was believed or present at their checkpoint. They are evidence, not current authority. A stale open question, legacy table name, old implementation plan, `source_of_truth`, `current_phase`, `execution_lock`, generic payment phase, or percentage inside a preserved snapshot cannot reopen a decision superseded by later owner authority.

## Implementation rule

New code, SQL/RLS, APIs, workflows, UI, migrations and events must fail closed against brokerage semantics. Historical evidence may remain for auditability, but it is not active business authority. Any retirement/redesign must preserve dependency evidence and must not delete sectors, user data, security controls, RLS protections, or unrelated platform features.

### Release invariant

```text
ACTIVE_BROKERAGE_PATHS=0
ACTIVE_EXTERNAL_TRANSACTION_COMMISSION=0
ACTIVE_BUYER_SELLER_CHECKOUT=0
ACTIVE_EXTERNAL_DEAL_ESCROW=0
ACTIVE_EXTERNAL_DEAL_SETTLEMENT=0
```

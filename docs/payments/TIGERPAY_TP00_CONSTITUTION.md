# TigerPay TP-00 — Constitution & Boundary Freeze

Status: **SPLIT_SCOPE — SUPERSEDED FOR EXTERNAL COMMERCE / KEEP_PLATFORM_FINANCE ONLY**
Date: **2026-08-07**
Current authority amendment: **2026-08-22 — Issue #312**
Project: **VVIP TIGER (`vviptiger`)**
Parent architecture: **TigerPay Vault 3.0 — Sovereign Treasury & Trust Fabric**
Owner authority label: **`OWNER_VIP_TIGER`**
Runtime effect: **NONE**

> **Issue #312 authority amendment:** This document is `KEEP_PLATFORM_FINANCE` only for TIGER's platform-owned advertising, ad credits/packages, approved platform-owned services, and their own refunds/adjustments/taxes/treasury/accounting/provider settlement. Any TigerPay meaning that would execute buyer/seller/provider, user-to-user, or user-to-provider payment, payout, escrow, settlement, negotiation, fulfillment, or deal completion for advertised goods/services is `SUPERSEDED` / `REDESIGN_DISCOVERY_ONLY`. For those external deals the binding path is **DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**. Historical terminology below is retained for security/audit provenance and must not be read as external-commerce implementation authority.

---

## 1. Purpose

Within the Issue #312 split scope above, TP-00 preserves financial-domain security and evidence constraints that any future allowed TigerPay implementation slice must obey. It creates terminology, authority boundaries, permanent deny rules, regulated-provider/custody boundaries, and the migration contract from the legacy `P18 — Payment Gateway` package.

TP-00 deliberately introduces no payment runtime, no provider integration, no database migration, no production credentials, no payout executor, and no production financial mutation.

The foundational separation is permanent:

```text
MONEY ≠ SETTLEMENT ≠ ACCOUNTING ≠ AUTHORIZATION ≠ AUDIT ≠ AI
```

A component may exchange typed facts with another component, but no component may silently inherit the authority or truth semantics of another domain.

---

## 2. Normative Terminology

### 2.1 `OWNER_VIP_TIGER`

`OWNER_VIP_TIGER` means a **trusted server-side authorization result** proving that the current actor is the sovereign owner for the requested financial scope.

It is never:

- a browser `localStorage` value,
- a DOM attribute,
- a query parameter,
- a caller-provided JSON field,
- a partner role string,
- an AI claim,
- a provider callback claim.

### 2.2 Payment

A **PAYMENT** is the customer/provider economic payment lifecycle from TigerPay payment intent through provider processing, accounting, settlement, and reconciliation. Under Issue #312 this terminology is executable only for allowed platform-owned finance; external advertised-goods/services payment is superseded.

A payment-provider state is not automatically accounting truth, settlement truth, or authorization truth.

### 2.3 Payout

A **PAYOUT** is an outbound platform-controlled disbursement lifecycle inside allowed platform-owned finance. A payout may be drafted, risk-assessed, placed in Action Escrow, approved, capability-bound, submitted, settled, accounted, and reconciled as separate facts. It does not authorize payout between external deal parties.

### 2.4 Settlement

**SETTLEMENT** is the provider/bank realization of expected money movement inside allowed platform-owned finance. A successful provider API response does not prove settlement.

### 2.5 Accounting

**ACCOUNTING** is TigerPay's independent double-entry financial truth for allowed platform-owned finance. Posted historical accounting entries are not edited in place; corrections occur through reversing/adjusting entries in later ledger slices.

### 2.6 Authorization

**AUTHORIZATION** is a deterministic permission result produced by trusted server-side policy and identity controls. Provider events, dashboard state, AI output, client fields, or network success cannot grant authorization.

### 2.7 Evidence / Audit

**EVIDENCE** is reconstructable proof of actor, policy, approved payload, provider result, accounting result, settlement result, and verification outcome. Evidence is distinct from the accounting ledger.

### 2.8 AI

**AI** in the TigerPay financial domain is limited to:

```text
READ + ANALYZE + RECOMMEND + DRAFT
```

AI output is never payment authorization, owner approval, capability issuance, treasury activation, or money-movement authority.

---

## 3. Permanent Financial Deny Rules

The following rules are constitutional denies for TigerPay. They apply only within the finance scope still permitted by Issue #312 and cannot expand that scope. No ordinary feature flag, AI recommendation, provider response, partner request, or browser input may override them.

1. **No AI money movement.**
2. **No AI treasury-destination mutation.**
3. **No AI owner-permission mutation.**
4. **No partner write access to treasury or settlement controls.**
5. **No client-side L4 authorization.**
6. **No raw card PAN or CVV storage/handling in TigerPay browser/runtime.**
7. **No financial execution without an idempotency/replay-protection contract.**
8. **No L2/L3 financial write without deterministic rollback or compensating-action design.**
9. **No L4 execution without trusted owner authorization.**
10. **No country payment activation without a certified Country Payment Package.**
11. **No provider callback is trusted merely because its payload claims success.** Provider authenticity and event uniqueness must be verified in the appropriate future slice.
12. **No historical accounting entry is edited in place.**
13. **No ordinary application role may update/delete immutable financial evidence.**
14. **No financial incident recovery may expand privileges.**
15. **Freeze is intentionally easier than unfreeze.**
16. **Core marketplace functionality must degrade safely when financial AI is unavailable.**
17. **Provider failure must not corrupt accounting state.**
18. **Dashboard failure must not authorize or execute money movement.**
19. **No voice request directly sends money, approves payouts, changes treasury destinations, or unfreezes the vault.**
20. **No provider normalization layer may import provider-supplied authority fields into TigerPay authorization state.**
21. **No TigerPay flow may execute buyer/seller/provider or user-to-user/user-to-provider payment, payout, escrow, settlement, negotiation, fulfillment, or deal closing for advertised goods/services.**

---

## 4. Provider, Custody & Money-Movement Boundary

For the platform-owned finance scope permitted by Issue #312, the TigerPay operating model is:

```text
TigerPay
= orchestration
+ deterministic governance
+ accounting control
+ settlement/reconciliation control
+ evidence/audit control
+ risk/incident control

Licensed/approved bank, PSP or merchant acquirer
= actual payment rail
+ regulated money movement
+ provider-side card processing/settlement functions under the selected commercial arrangement
```

TigerPay's initial runtime is **not** designed to operate as an unlicensed:

- stored-value wallet,
- customer-fund custodian,
- bank,
- money-transfer operator,
- card vault.

Production activation for a country requires the exact legal/compliance position for the selected provider, entity, commercial model, money flow, settlement model, and supported payment rails. This cannot authorize external advertised-goods/services deal execution.

### 4.1 Card Boundary

For allowed platform-owned advertising/services purchases, TigerPay targets hosted/tokenized provider checkout patterns. Raw card PAN/CVV must not enter ordinary TigerPay browser/runtime logs, telemetry, storage, partner projections, AI context, or domain contracts.

### 4.2 CliQ / Jordan Boundary

CliQ is treated as a country/provider rail capability only for allowed platform-owned finance through supported bank/acquirer/provider integration. It is not a hard-coded personal-account automation path and is not exposed as a browser transfer primitive.

Provider/country limits and capabilities are configuration facts owned by a future Country Payment Package/provider registry, not permanent global constants in TP-00/TP-01 code.

---

## 5. Authority Separation Matrix

| Source / Component | May provide financial facts | May recommend | May authorize L4 | May execute money movement |
| --- | --- | --- | --- | --- |
| Owner browser UI | Yes | No | No by itself | No |
| Trusted owner server authorization | Yes | No | Yes, when full future ceremony passes | No by itself |
| Partner surface | Read-only projection | No | No | No |
| Financial AI | Yes, within granted read scope | Yes | No | No |
| Provider callback | Yes, after authenticity checks | No | No | No |
| Deterministic policy kernel | Yes | No | Produces/requests required authorization decision | No |
| Future capability broker | Yes | No | Consumes trusted approval; does not create owner identity | Issues scoped execution capability only for allowed platform-owned finance |
| Future provider executor | Yes | No | No | Yes only with valid scoped capability for allowed platform-owned finance |
| Accounting poster | Yes | No | No | Posts accounting effect only, not provider transfer authority |
| Evidence writer | Yes | No | No | Writes evidence only |

No row inherits another row's authority merely because data flows between them. No row may expand finance beyond the Issue #312 platform-owned scope.

---

## 6. P18 Migration Contract

The historical repository artifact `docs/owner-control/P18_PAYMENT_GATEWAY.md` is preserved as evidence of a prior design-and-review closure package. It explicitly contained no production payment execution.

TigerPay Vault 3.0 supersedes P18's **implementation intent**, not its historical record. Issue #312 further limits any reusable TigerPay implementation intent to platform-owned advertising/services finance.

### 6.1 Mapping

The following mapping is historical design provenance. Any implementation use must first satisfy Issue #312 and be platform-owned finance only.

| Legacy P18 concept | TigerPay replacement |
| --- | --- |
| Payment gateway design | TP-01 domain contracts + TP-05 provider registry/sandbox adapter + TP-06 inbound payment sandbox runtime |
| Hosted payment flow plan | TP-05/TP-06 provider-hosted/tokenized checkout contracts |
| Payment completion concept | Canonical payment state machine + Accounting + Settlement + Reconciliation; provider success alone is insufficient |
| Owner payment control | TP-02 sovereign identity + TP-08 Action Escrow + TP-09 capability broker/executor gates |
| Financial records | TP-04 Triple Ledger + TP-07 reconciliation |
| Financial dashboard | TP-12/TP-13 Sovereign Command Center slices under the master roadmap |
| Production launch | Country certification/activation + security/BLACKBOX/owner gates in later milestones |

### 6.2 Migration Rules

- Do not delete `P18_PAYMENT_GATEWAY.md` merely because TigerPay exists.
- Do not mark P18 production payment runtime implemented based on historical design evidence.
- Do not re-use a legacy state name if it collapses payment, accounting, settlement, or authorization truth.
- New TigerPay runtime must consume canonical contracts only after Issue #312 economic-scope classification and normal security/release gates.
- External advertised-goods/services commerce must stop at contact handoff; it cannot consume TigerPay execution paths.

---

## 7. TP-00 Outputs Consumed by TP-01

Within allowed platform-owned finance only, TP-01 may encode deterministic, dependency-free domain syntax/normalization contracts for:

- canonical payment states,
- canonical payout states,
- treasury destination states,
- business continuity modes,
- financial data classes,
- action decisions,
- money amount/currency validation,
- TigerPay identifiers,
- idempotency-key syntax,
- provider-event normalization.

TP-01 must not implement external-deal execution. It also must not implement authorization transitions, WebAuthn, TFAL enforcement, network calls, SQL, provider signatures, accounting posting, settlement reconciliation, capability consumption, or live dashboard data merely from this document.

---

## 8. Security Invariants for Provider Normalization

A provider event is untrusted external data until verified in the future provider-security slice.

Even after provider authenticity is verified, normalization may map provider facts into canonical payment facts only for permitted platform-owned finance. It must never import provider-supplied fields such as:

```text
approved
authorized
ownerApproved
capability
executionAllowed
role
ownerRole
permissions
```

into TigerPay authorization state.

Provider normalization therefore uses an allowlisted output contract rather than spreading arbitrary provider input.

---

## 9. TP-00 Verification Statement

This milestone remains historical constitution/boundary evidence and does not independently authorize implementation. Current scope is controlled by Issue #312.

```text
TP00_RUNTIME_CHANGE=NONE
TP00_LIVE_PROVIDER=NONE
TP00_PRODUCTION_SQL=NONE
TP00_PRODUCTION_CREDENTIALS=NONE
TP00_MONEY_MOVEMENT=NONE
TP00_EXTERNAL_DEAL_EXECUTION=SUPERSEDED
TP00_PLATFORM_FINANCE_SCOPE=KEEP_PLATFORM_FINANCE
TP00_BOUNDARY_FREEZE=ENFORCED_BY_SPEC
```

TP-00 does not claim that future runtime controls are implemented. Its reusable controls apply only within Issue #312's allowed platform-owned finance scope.

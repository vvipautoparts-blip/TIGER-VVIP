# TigerPay TP-00 — Constitution & Boundary Freeze

Status: **SPLIT_SCOPE — SUPERSEDED FOR EXTERNAL COMMERCE / KEEP_PLATFORM_FINANCE ONLY**
Original date: **2026-08-07**
Current authority amendment: **2026-08-22 — Issue #312**
Project: **VVIP TIGER (`vviptiger`)**
Owner authority label: **`OWNER_VIP_TIGER`**
Runtime effect: **NONE**

> **Issue #312 economic-scope amendment:** This document is `KEEP_PLATFORM_FINANCE` only for TIGER's platform-owned advertising, ad credits/packages, explicitly approved platform-owned services, and their own refunds/adjustments, taxes/fees, treasury/accounting, provider processing, settlement and reconciliation. Any interpretation that would execute buyer/seller/provider, user-to-user, or user-to-provider payment, payout, escrow, settlement, negotiation, fulfillment, checkout, order completion, or deal completion for an advertised external good/service is `SUPERSEDED` / `RETIRE_BROKERAGE` and must be `REDESIGN_DISCOVERY_ONLY`. The binding external-commerce path is **DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**. Historical terminology below is retained for security/audit provenance; it is not authority to implement external-deal finance.

---

## 1. Purpose

Within the Issue #312 split scope above, TP-00 preserves financial-domain security and evidence constraints for any future **allowed platform-owned finance** implementation slice. It defines terminology, authority boundaries, permanent deny rules, regulated-provider/custody boundaries, and the migration contract from historical payment designs.

TP-00 itself introduces no payment runtime, provider integration, database migration, production credential, payout executor, or production financial mutation.

The foundational separation is permanent:

```text
MONEY ≠ SETTLEMENT ≠ ACCOUNTING ≠ AUTHORIZATION ≠ AUDIT ≠ AI
```

No component silently inherits another component's authority or truth semantics.

---

## 2. Normative terminology — platform-owned finance only

### 2.1 `OWNER_VIP_TIGER`

`OWNER_VIP_TIGER` means a trusted server-side authorization result proving that the current actor is the sovereign owner for the requested **allowed platform-owned financial scope**. It is never a browser value, DOM attribute, query parameter, caller-provided JSON field, partner role, AI claim, or provider callback claim.

### 2.2 Payment

A `PAYMENT` is a payment lifecycle for an allowed TIGER-owned charge, such as advertising, ad credits/packages, or another explicitly approved platform-owned service. It may include provider processing, accounting, settlement and reconciliation. It does **not** mean payment between parties to an advertised external deal.

### 2.3 Payout

A `PAYOUT` is an outbound platform-controlled disbursement lifecycle arising from allowed platform-owned finance. It does not authorize payout between external buyer/seller/provider deal parties and cannot be derived from external transaction value.

### 2.4 Settlement

`SETTLEMENT` is provider/bank realization of expected money movement for allowed platform-owned finance. A provider success response does not prove settlement. External-deal settlement is superseded by Issue #312.

### 2.5 Accounting

`ACCOUNTING` is TIGER's double-entry truth for allowed platform-owned finance. Posted historical entries are not edited in place; corrections use reversing/adjusting entries.

### 2.6 Authorization

`AUTHORIZATION` is a deterministic permission result produced by trusted server-side policy and identity controls. Provider events, dashboard state, AI output, client fields, or network success cannot grant authorization.

### 2.7 Evidence / Audit

`EVIDENCE` is reconstructable proof of actor, policy, approved payload, provider result, accounting result, settlement result, and verification outcome for an allowed flow. Evidence is distinct from the accounting ledger.

### 2.8 AI

AI in the TigerPay financial domain is limited to:

```text
READ + ANALYZE + RECOMMEND + DRAFT
```

AI output is never payment authorization, owner approval, capability issuance, treasury activation, or money-movement authority.

---

## 3. Permanent deny rules

These denies apply in addition to Issue #312. No feature flag, AI recommendation, provider response, partner request, browser input, old roadmap, old percentage, or historical owner label may override them.

1. **No external-deal payment execution.** TIGER does not collect or route the buyer/seller/provider price of advertised goods/services.
2. **No external-deal escrow or custody.**
3. **No transaction-value commission or percentage on external deals.**
4. **No external-deal payout, settlement, fulfillment, deal closing, or order-completion authority.**
5. **No AI money movement.**
6. **No AI treasury-destination or owner-permission mutation.**
7. **No partner write access to treasury or settlement controls.**
8. **No client-side high-risk financial authorization.**
9. **No raw PAN/CVV storage or handling in ordinary TIGER browser/runtime.**
10. **No allowed financial execution without idempotency/replay protection.**
11. **No high-risk write without deterministic rollback or compensating-action design.**
12. **No production money movement without trusted owner authorization and the applicable release/legal/provider gates.**
13. **No country payment activation without an approved Country Payment Profile/Package.**
14. **No provider callback is trusted merely because its payload claims success.**
15. **No historical accounting entry is edited in place.**
16. **No ordinary application role may update/delete immutable financial evidence.**
17. **No incident recovery may expand privileges.**
18. **Freeze is easier than unfreeze.**
19. **Discovery must degrade safely when finance or financial AI is unavailable.**
20. **Provider failure must not corrupt accounting state.**
21. **Dashboard failure must not authorize or execute money movement.**
22. **No voice request directly sends money, approves payouts, changes treasury destinations, or unfreezes a financial control.**
23. **No provider-normalization layer may import provider-supplied authority fields into TIGER authorization state.**

---

## 4. Provider, custody and money-movement boundary

For **allowed platform-owned finance only**:

```text
TigerPay
= orchestration
+ deterministic governance
+ accounting control
+ reconciliation/evidence control
+ risk/incident control

Approved bank / PSP / merchant acquirer
= regulated payment rail
+ provider-side card processing
+ provider-side settlement functions under the selected commercial arrangement
```

TigerPay is not designed to operate as an unlicensed stored-value wallet, customer-fund custodian, bank, money-transfer operator, or card vault.

Production activation for a country requires the exact legal/compliance position for the selected provider, entity, commercial model, money flow, settlement model and supported payment rails. This requirement cannot be satisfied by CI alone.

### 4.1 Card boundary

Allowed platform-owned card charges use hosted/tokenized provider patterns. Raw PAN/CVV must not enter ordinary TIGER browser/runtime logs, telemetry, storage, partner projections, AI context, or domain contracts.

### 4.2 Country/rail boundary

Country-specific rails (including CliQ in Jordan where lawfully supported) are provider capabilities configured through the country payment profile. They are not personal-account automation paths or browser transfer primitives.

---

## 5. Authority separation matrix

| Source / Component | May provide financial facts | May recommend | May authorize | May execute allowed provider movement |
| --- | --- | --- | --- | --- |
| Owner browser UI | Yes | No | No by itself | No |
| Trusted owner server authorization | Yes | No | Yes within allowed scope and ceremony | No by itself |
| Partner surface | Read-only projection | No | No | No |
| Financial AI | Yes, within granted read scope | Yes | No | No |
| Provider callback | Yes, after authenticity checks | No | No | No |
| Deterministic policy kernel | Yes | No | Produces/requests decision | No |
| Scoped capability broker | Yes | No | Consumes trusted approval only | Issues scoped capability only |
| Provider executor | Yes | No | No | Yes only for an allowed platform-owned flow with valid capability |
| Accounting poster | Yes | No | No | Accounting effect only |
| Evidence writer | Yes | No | No | Evidence only |

No row inherits another row's authority because data flows between them.

---

## 6. Historical payment-design migration contract

Historical payment architecture is preserved as provenance, not external-commerce authority. Reusable security primitives may survive only after the Issue #312 economic-scope test.

| Historical concept | Current classification |
| --- | --- |
| External buyer/seller/provider checkout | `RETIRE_BROKERAGE` / `REDESIGN_DISCOVERY_ONLY` |
| External-deal order completion | `RETIRE_BROKERAGE` |
| External-deal escrow/custody | `RETIRE_BROKERAGE` |
| External transaction-value commission | `RETIRE_BROKERAGE` / `HISTORICAL_EVIDENCE_ONLY` |
| TIGER advertising/ad-credit checkout | `KEEP_PLATFORM_FINANCE` subject to security/legal/country/provider gates |
| TIGER-owned service accounting/reconciliation/evidence | `KEEP_PLATFORM_FINANCE` subject to its normal gates |
| Generic provider security/idempotency/event verification | reusable primitive only when independently scoped to an allowed flow |

Historical `P18_PAYMENT_GATEWAY.md` and TigerPay roadmap material may remain for evidence. They must not be marked or interpreted as live external-commerce payment implementation authority.

---

## 7. Future implementation rule

Every future financial slice must declare before code:

```text
ECONOMIC_PRINCIPAL=<TIGER_PLATFORM|EXTERNAL_DEAL_PARTY>
REVENUE_SOURCE=<ADVERTISING|AD_CREDIT|APPROVED_PLATFORM_SERVICE|EXTERNAL_DEAL_VALUE>
ISSUE_312_CLASSIFICATION=<KEEP_PLATFORM_FINANCE|RETIRE_BROKERAGE|REDESIGN_DISCOVERY_ONLY|HISTORICAL_EVIDENCE_ONLY>
```

Only `ECONOMIC_PRINCIPAL=TIGER_PLATFORM` with an explicitly allowed revenue source can enter an executable `KEEP_PLATFORM_FINANCE` design. `EXTERNAL_DEAL_VALUE` is never a valid TIGER commission basis under current authority.

---

## 8. Provider normalization security invariant

Provider input remains untrusted external data until verified. Even after authenticity verification, normalization may map facts only; it must never import provider-supplied fields such as `approved`, `authorized`, `ownerApproved`, `capability`, `executionAllowed`, `role`, `ownerRole`, or `permissions` into TIGER authorization state.

Use allowlisted output contracts rather than spreading arbitrary provider input.

---

## 9. TP-00 verification statement

TP-00 is a documentation/policy boundary, not runtime evidence:

```text
TP00_RUNTIME_CHANGE=NONE
TP00_LIVE_PROVIDER=NONE
TP00_PRODUCTION_SQL=NONE
TP00_PRODUCTION_CREDENTIALS=NONE
TP00_EXTERNAL_DEAL_PAYMENT=PROHIBITED
TP00_EXTERNAL_TRANSACTION_COMMISSION=PROHIBITED
TP00_PLATFORM_FINANCE_SCOPE=ADVERTISING_AD_CREDITS_APPROVED_PLATFORM_SERVICES_ONLY
TP00_BOUNDARY_FREEZE=ENFORCED_BY_SPEC
```

Real Production financial readiness requires separate same-SHA environment, provider, legal, security, accounting, reconciliation, rollback and release evidence. No prose in this document grants it.

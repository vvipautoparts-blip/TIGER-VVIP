# TigerPay Vault 3.0 — Spec Review & Terminology Lock

## 2026-08-22 authority amendment — Issue #312

The 2026-08-07 review remains historical architecture evidence, but its current executable authority is limited to `KEEP_PLATFORM_FINANCE_ONLY`: TIGER's own **platform-owned advertising** and approved platform advertising services, including their credits/packages/boosts, refunds/adjustments, applicable taxes/fees, treasury/accounting, provider settlement, reconciliation, and evidence.

`NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT`

For advertised goods/services and user-to-user or user-to-provider commerce:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

Issue #312 supersedes any older interpretation that could authorize external-deal checkout, buyer/seller payment, escrow between parties, settlement, fulfillment, payout, or percentage-of-deal commission. Terms below such as settlement, payout approval, treasury destination, provider integration, or financial assurance apply only inside independently allowed platform-owned finance unless a later explicit owner authority says otherwise.

Date: **2026-08-07**
Applies to: `docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md`
Status: **SELF-REVIEW COMPLETE — RUNTIME STILL GATED — ISSUE #312 SCOPE APPLIES**

## 1. Review Result

The master design was reviewed for:

- placeholders,
- internal contradictions,
- scope size,
- ambiguous terminology,
- authority conflicts,
- payment/provider boundary conflicts,
- accounting/settlement conflation,
- partner privilege leakage,
- AI authority leakage,
- dashboard/runtime coupling,
- migration conflict with legacy P18.

Result:

```text
PLACEHOLDERS=T0
CONTRADICTIONS=0_CRITICAL
SCOPE=DECOMPOSED_TP00_TP16
EXTERNAL_DEAL_PAYMENT_AUTHORITY=NONE
LIVE_MONEY_AUTHORIZATION=NO
PRODUCTION_DB_AUTHORIZATION=NO
PRODUCTION_PROVIDER_AUTHORIZATION=NO
```

`T0` means zero `TODO`, `TBD`, or intentionally undefined implementation requirements in the architecture baseline.

## 2. Terminology Correction — TFAL

The master design uses the labels `FAL0_VIEW`, `FAL1_SENSITIVE_READ`, `FAL2_CONFIG_CHANGE`, and `FAL3_MONEY_AUTHORIZATION` in its authentication section.

To avoid ambiguity with external identity/federation terminology, **implementation identifiers SHALL use `TFAL`**, meaning **Tiger Financial Assurance Level**.

Normative implementation identifiers are:

- `TFAL0_VIEW`
- `TFAL1_SENSITIVE_READ`
- `TFAL2_CONFIG_CHANGE`
- `TFAL3_MONEY_AUTHORIZATION`

Any `FAL*` occurrence in the architecture document is interpreted as the corresponding `TFAL*` design shorthand and MUST NOT be presented as an external certification level.

### TFAL0_VIEW

Purpose: authenticated read access to non-sovereign financial views within allowed platform-owned finance.

Does not authorize:

- unmasking raw treasury destination data,
- financial export containing restricted data,
- configuration mutation,
- payout approval,
- unfreeze.

### TFAL1_SENSITIVE_READ

Purpose: fresh step-up for restricted read/export operations within allowed platform-owned finance.

Examples:

- sensitive owner-only reports,
- controlled unmasking where policy allows,
- restricted evidence export.

Does not authorize money movement or treasury mutation.

### TFAL2_CONFIG_CHANGE

Purpose: phishing-resistant fresh step-up for proposing/confirming sensitive financial configuration within allowed platform-owned finance.

Examples:

- treasury destination proposal/final activation,
- payment-provider configuration approval,
- country financial configuration approval.

It does not by itself execute a payout and does not create external-deal payment authority.

### TFAL3_MONEY_AUTHORIZATION

Purpose: strongest TigerPay owner ceremony for high-impact financial authorization or controlled unfreeze **inside allowed platform-owned finance only**.

Target controls include:

- trusted server-side owner identity,
- phishing-resistant public-key authentication,
- fresh authentication timestamp,
- hardware-backed/non-exportable credential where supported/required by policy,
- exact action review,
- amount/currency binding,
- beneficiary/destination binding,
- canonical action digest,
- expiration,
- one-time approval consumption,
- post-approval short-lived capability.

Voice, AI output, browser role flags, partner approval, SMS alone, or an old authenticated session do not satisfy TFAL3.

## 3. P18 Migration Consistency

The legacy P18 artifact remains historical design evidence and is not deleted.

TigerPay Vault 3.0 supersedes P18's implementation contract only within the finance scope still allowed by Issue #312 and does not mark P18 implemented merely because the newer architecture was approved.

The roadmap status file is not changed by this review.

## 4. Financial Truth Separation

Review confirms the architecture consistently separates, for allowed platform-owned finance:

1. payment/provider state,
2. accounting state,
3. settlement/reconciliation state,
4. authorization state,
5. immutable evidence state.

No provider callback is allowed to become direct accounting truth or direct owner authorization.

## 5. Partner Authority Review

Partner capability remains:

```text
READ + VERIFIED EXPORT WITHIN PARTNER SCOPE
```

Partner capability does not include:

```text
TREASURY_WRITE
PAYOUT_APPROVAL
UNFREEZE
PRICING_MUTATION
PROVIDER_SECRET_ACCESS
LEDGER_EDIT
OWNER_PERMISSION_CHANGE
```

Masking is server-side, not a CSS-only control.

## 6. AI Authority Review

Financial AI remains:

```text
READ + ANALYZE + RECOMMEND + DRAFT
```

Financial AI has no capability for:

- money movement,
- payout approval,
- treasury mutation,
- owner recovery,
- unfreeze,
- provider-secret rotation,
- ledger mutation outside deterministic accounting services.

## 7. Dashboard Review

The TigerPay Sovereign Command Center is a projection/control interface over server-side services for allowed platform-owned finance.

The dashboard itself is never the financial source of truth.

Required distinction remains explicit:

```text
PAYMENT_CONFIRMED ≠ SETTLED ≠ RECONCILED
```

Unknown/loading states must never render as financial success.

## 8. Country/Provider Boundary Review

Jordan-specific CliQ/payment assumptions remain inside a Country Payment Package and provider registry for allowed platform-owned finance.

They are not global constants.

No production integration is authorized until a specific bank/PSP/merchant-acquirer contract and current compliance review exist.

## 9. Implementation Gate

Any implementation planning derived from this review is subordinate to Issue #312 and may cover only platform-owned advertising/services finance unless later explicit owner authority changes the scope.

This review does not authorize:

- external-deal payment, payout, escrow, settlement, fulfillment, or commission,
- SQL migrations,
- live payment collection,
- payout execution,
- live CliQ/bank automation,
- production credentials,
- production deployment,
- merge to `main`.

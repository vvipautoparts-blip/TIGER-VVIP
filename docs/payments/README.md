# VVIP TIGER Payments Architecture

## Current authority — Issue #312

`KEEP_PLATFORM_FINANCE_ONLY`

TigerPay financial architecture is authoritative only for TIGER's own **platform-owned advertising** and approved platform advertising services, including their credits/packages/boosts, refunds/adjustments, applicable taxes/fees, treasury/accounting, provider settlement, reconciliation, and evidence.

`NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT`

For advertised goods/services and user-to-user or user-to-provider commerce, the active boundary is:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

TIGER does not create or close the external deal, collect buyer/seller payment, hold escrow between the parties, settle or fulfill that deal, or take a percentage of its value. Issue #312 and `../architecture/OWNER_AUTHORITY_REGISTRY.md` supersede any older broader interpretation.

## Historical architecture baseline

The following TigerPay Vault 3.0 materials remain reusable architecture evidence only within the allowed platform-owned finance scope above:

- `../superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md`
- `TIGERPAY_VAULT_3_SPEC_REVIEW.md`
- `TIGERPAY_VAULT_3_APPROVAL_RECORD.md`

Current state:

```text
ARCHITECTURE=APPROVED_WITH_ISSUE_312_SCOPE
IMPLEMENTATION=GATED
EXTERNAL_DEAL_PAYMENT_AUTHORITY=NONE
LIVE_PAYMENTS=NOT_AUTHORIZED
LIVE_PAYOUTS=NOT_AUTHORIZED
PRODUCTION_DB_CHANGES=NOT_AUTHORIZED
```

Legacy P18 remains historical evidence under `docs/owner-control/P18_PAYMENT_GATEWAY.md` and cannot restore external-deal payment authority.

# Owner Architecture Authority Registry

**Status:** ACTIVE — canonical precedence registry
**Effective authority:** Issue #312 and its current owner amendments
**Scope:** user-to-user and user-to-provider discovery/commerce boundaries across all sectors and future additive views

## Governing invariant

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

For advertised goods and services, the platform is discovery-only. It does not create orders, run checkout, take buyer/seller payment, hold escrow between parties, negotiate, close deals, manage fulfillment, or take a sales commission / percentage of deal value. This is the zero brokerage / no commission rule.

Platform-owned finance remains allowed only for TIGER's own advertising, ad credits/packages, approved platform-owned services, their refunds/adjustments, taxes/fees, treasury/accounting, and provider settlement for those platform-owned flows. Paid delivery must remain separate from organic relevance/fit.

## Precedence

When a historical document, implementation note, test fixture, migration, event name, API contract, or runtime path conflicts with Issue #312, Issue #312 controls. A conflicting historical `OWNER APPROVED` label does not override this registry or Issue #312.

All existing sectors and non-conflicting platform capabilities remain preserved. New sectors/views are additive through shared contracts and must not replace or fork the existing platform core.

## Classified historical authorities

| Artifact | Classification | Current effect |
| --- | --- | --- |
| `docs/superpowers/specs/2026-08-11-vvip-commission-policy-all-sectors-design.md` | `HISTORICAL_EVIDENCE_ONLY` / `SUPERSEDED` for user-to-user or user-to-provider transaction commissions | Must not govern transaction-value commission, payout, or brokerage implementation. Non-financial identity/security concepts may be reused only when independently compatible with current authority. |
| `docs/payments/TIGERPAY_TP00_CONSTITUTION.md` | `SUPERSEDED` wherever it could authorize buyer/seller/provider payment, escrow, payout, settlement, or deal execution for advertised goods/services | Financial architecture may survive only inside the platform-owned advertising/services scope above and remains subject to separate security/legal/country-policy gates. |

## Implementation rule

New code and migrations must fail closed against brokerage semantics. Historical evidence may remain for auditability, but it is not active business authority. Any retirement/redesign must preserve dependency evidence and must not delete sectors, user data, security controls, RLS protections, or unrelated platform features.

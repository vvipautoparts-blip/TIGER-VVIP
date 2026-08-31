# TIGER STATUTORY TAX BOUNDARY — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / FAIL_CLOSED`
**Effective owner decision:** 2026-09-01
**Domain:** statutory tax charged on TIGER-owned paid platform services.

## 1. Binding rule

VVIP TIGER sets the platform service price. VVIP TIGER does **not** invent, set, absorb, redistribute, or treat a statutory tax rate as a TIGER financial allocation.

The legally applicable tax for the transaction is an external statutory charge determined by the applicable jurisdiction/rules and supplied to checkout through verified tax evidence/provider logic.

The user-facing checkout is therefore:

`PLATFORM SERVICE PRICE + VERIFIED STATUTORY TAX = USER TOTAL`

Examples are mechanical only:

- verified statutory tax `0%` -> add `0`;
- verified statutory tax `12%` -> add the verified 12% tax amount;
- verified statutory tax `16%` -> add the verified 16% tax amount;
- verified statutory tax `20%` -> add the verified 20% tax amount.

There is no TIGER 16% tax ceiling, tax subsidy, tax shield, tax-gap subsidy, or automatic tax-rate override.

## 2. Tax is outside platform distribution

Statutory tax is never platform distributable revenue.

It is excluded from:

- OWNER percentage calculations;
- PARTNER percentage calculations;
- ACTUAL_OPERATIONS calculations;
- SALES_ADMINISTRATION calculations;
- GENERAL_MANAGER / SECTOR_MANAGER / MARKETER commissions;
- DIGITAL actor economics;
- self-service commission allocation;
- any replacement allocation for the cancelled former TAX_RESERVE.

The platform distribution basis is the TIGER platform-service revenue amount **excluding statutory tax**.

`TAX MONEY != COMMISSION MONEY`

## 3. Former TAX_RESERVE 16% is not statutory tax

The former internal `TAX_RESERVE = 16%` remains cancelled.

The unresolved 16 percentage points left in the internal platform distribution after that cancellation are an **unallocated platform-revenue decision pending owner allocation**. They are not statutory tax, are not a tax reserve, and may not be used to pay or absorb statutory tax by inference.

Until a separate explicit owner decision reallocates those 16 percentage points, final platform distribution remains fail-closed exactly as required by current financial authority.

## 4. Country activation is independent from tax rate

Country opening, suspension, or closure is a TIGER commercial/operational owner-governance decision and is not automatically determined by whether the statutory tax is below, equal to, or above 16%.

A jurisdiction having a 20% statutory tax does not by itself mean TIGER absorbs 4%, blocks the country, or changes commissions. If the country is commercially activated and the transaction is legally taxable at a verified 20%, the verified tax amount is added to the user checkout and remains outside TIGER revenue distribution.

Owner country-activation authority must not be confused with legal tax-rate determination.

## 5. Server-authoritative checkout boundary

The canonical enforcement module is:

`project-control/finance/statutory-tax-boundary.cjs`

The module accepts TIGER platform price and a verified statutory tax quote. It returns separated values for:

- platform revenue;
- statutory tax;
- user total;
- distribution basis.

The distribution basis is always platform revenue only and excludes statutory tax.

## 6. Fail-closed tax evidence

TIGER must not invent a statutory tax value when the required tax result is unavailable or unverified.

A tax quote used by the canonical boundary must be marked `VERIFIED` and contain at minimum:

- tax amount in minor currency units;
- effective rate evidence where supplied by the tax engine;
- jurisdiction identity/context;
- source evidence identity.

If required tax evidence is unverified, malformed, negative, or unavailable, the financial boundary fails closed instead of guessing a rate.

A zero verified tax amount is valid and adds nothing to the user price.

## 7. Human and digital financial firewall compatibility

This authority does not change the Human–Digital Financial Firewall.

All DIGITAL actors remain zero-financial-benefit actors. Statutory tax cannot create a commission, share, entitlement, wallet, payout destination, or sale-commission ownership for a DIGITAL actor.

Human sales commission remains calculated only from the approved TIGER platform-revenue distribution basis, excluding statutory tax.

## 8. Immutable audit separation

Financial records must preserve separate fields/dimensions for platform revenue and statutory tax so that tax cannot be silently included in commissionable revenue.

At minimum, each taxable platform purchase must be auditable to:

- platform service amount;
- statutory tax amount;
- total charged to the user;
- tax jurisdiction/context;
- tax evidence/source identity;
- distribution basis excluding statutory tax;
- refunds/reversals where applicable.

## 9. Acceptance statement

> **VVIP TIGER sets its service price; the applicable jurisdiction determines statutory tax. A verified statutory tax amount is added to the user price as legally applicable. If verified tax is zero, nothing is added. Statutory tax is external to TIGER distribution and cannot enter owner, partner, operations, sales commission, or digital-role economics. Country activation is an independent owner-governance decision and is not automatically controlled by a 16% tax threshold. The former internal TAX_RESERVE 16% remains cancelled; the unresolved internal 16 percentage points are not tax and remain pending a separate owner allocation decision. Unverified tax fails closed rather than being guessed.**

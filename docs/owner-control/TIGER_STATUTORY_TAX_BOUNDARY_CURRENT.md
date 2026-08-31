# TIGER STATUTORY TAX BOUNDARY — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / FAIL_CLOSED`
**Effective owner decision:** 2026-09-01
**Domain:** statutory tax contained in the final user-facing price of TIGER-owned paid platform services.

## 1. Binding rule — final price is tax-inclusive

The newest owner decision is:

> **The price shown to the user is the final price and already includes any verified statutory tax applicable to that transaction. TIGER separates the tax internally; it does not add another tax amount at capture.**

Canonical presentation:

`FINAL DISPLAYED PRICE = PLATFORM SERVICE REVENUE + INCLUDED VERIFIED STATUTORY TAX`

and:

`USER CHARGE = FINAL DISPLAYED PRICE`

Therefore:

`ADDITIONAL TAX AT CAPTURE = 0`

The user must not see one price and then receive a second TIGER-added statutory-tax surcharge at the final payment step.

## 2. TIGER does not invent the legal tax

VVIP TIGER controls its commercial pricing and presentation. It does **not** invent or arbitrarily define the statutory tax rate.

The legally applicable tax for a transaction is determined by the applicable jurisdiction/rules and supplied through verified tax evidence/provider logic.

The verified tax result must correspond to the **final displayed tax-inclusive price** for the transaction.

Examples of the boundary:

- verified included statutory tax `0` -> platform revenue equals the full final displayed price;
- verified included statutory tax greater than `0` -> that verified amount is separated from the final displayed price;
- the user's charged amount remains the same final displayed price in both cases;
- no second tax amount is added at capture.

There is no TIGER 16% tax ceiling, tax subsidy, tax shield, tax-gap subsidy, or automatic tax-rate override.

## 3. Internal separation formula

For every taxable TIGER-owned platform purchase:

`PLATFORM SERVICE REVENUE = FINAL DISPLAYED PRICE - VERIFIED INCLUDED STATUTORY TAX`

`STATUTORY TAX = VERIFIED INCLUDED STATUTORY TAX`

`DISTRIBUTION BASIS = PLATFORM SERVICE REVENUE`

The included statutory tax may never exceed the final displayed price. Any impossible or inconsistent quote fails closed.

## 4. Tax is outside platform distribution

Statutory tax is never TIGER distributable revenue.

It is excluded from:

- OWNER percentage calculations;
- PARTNER percentage calculations;
- ACTUAL_OPERATIONS calculations;
- SALES_ADMINISTRATION calculations;
- GENERAL_MANAGER / SECTOR_MANAGER / MARKETER commissions;
- DIGITAL actor economics;
- self-service commission allocation;
- any replacement allocation for the cancelled former TAX_RESERVE.

`TAX MONEY != COMMISSION MONEY`

## 5. Discounts and final price

Any owner-approved commercial discount that applies to the purchase must be resolved **before the final tax-inclusive price/tax quote is sealed for payment**.

The statutory-tax evidence used by the financial boundary must match that final displayed price. TIGER must not calculate commissions from a pre-discount amount while charging or taxing a different final amount.

## 6. Former TAX_RESERVE 16% is not statutory tax

The former internal `TAX_RESERVE = 16%` remains cancelled.

The unresolved 16 percentage points left in the internal platform distribution after that cancellation are an **unallocated platform-revenue decision pending owner allocation**. They are not statutory tax, are not a tax reserve, and may not be used to pay or absorb statutory tax by inference.

Until a separate explicit owner decision reallocates those 16 percentage points, final platform distribution remains fail-closed exactly as required by current financial authority.

## 7. Country activation is independent from tax rate

Country opening, suspension, or closure is a TIGER commercial/operational owner-governance decision and is not automatically determined by whether statutory tax is below, equal to, or above 16%.

Owner country-activation authority must not be confused with legal tax-rate determination.

## 8. Server-authoritative enforcement

The canonical enforcement module is:

`project-control/finance/statutory-tax-boundary.cjs`

It accepts:

- the final displayed price in minor currency units;
- a verified statutory-tax quote for that final price.

It returns separated values for:

- final displayed price;
- user total;
- platform revenue;
- statutory tax;
- distribution basis;
- tax jurisdiction/evidence;
- `additionalTaxAtCaptureMinor = 0`;
- `taxIncludedInDisplayedPrice = true`.

## 9. Fail-closed tax evidence

A tax quote used by the canonical boundary must be marked `VERIFIED` and contain at minimum:

- included statutory-tax amount in minor currency units;
- effective rate evidence where supplied by the tax engine;
- jurisdiction identity/context;
- source evidence identity.

If required tax evidence is unverified, malformed, negative, unavailable, or internally inconsistent, the financial boundary fails closed instead of guessing a rate or silently changing the user's final price.

A verified zero tax amount is valid.

## 10. Human and digital financial firewall compatibility

This authority does not change the Human–Digital Financial Firewall.

All DIGITAL actors remain zero-financial-benefit actors. Statutory tax cannot create a commission, share, entitlement, wallet, payout destination, or sale-commission ownership for a DIGITAL actor.

Human sales commission is calculated only from the approved TIGER platform-revenue distribution basis **after included statutory tax has been separated**.

## 11. Immutable audit separation

Each taxable platform purchase must remain auditable to at least:

- final displayed tax-inclusive price;
- actual user charge;
- platform service revenue;
- included statutory-tax amount;
- tax jurisdiction/context;
- tax evidence/source identity;
- distribution basis excluding statutory tax;
- approved discounts where applicable;
- refunds/reversals where applicable.

The ledger must prove that:

`FINAL DISPLAYED PRICE = PLATFORM SERVICE REVENUE + STATUTORY TAX`

and:

`USER CHARGE = FINAL DISPLAYED PRICE`

## 12. Acceptance statement

> **The TIGER price shown to the user is the final tax-inclusive price. Any legally applicable verified statutory tax is separated internally from that final price and is not added again at capture. Verified zero tax means the full final price is platform-service revenue; verified non-zero tax is carved out before internal distribution. Statutory tax never enters OWNER, PARTNER, ACTUAL_OPERATIONS, SALES_ADMINISTRATION, HUMAN commission, or DIGITAL economics. Country activation remains an independent owner-governance decision. The former internal TAX_RESERVE 16% remains cancelled; the unresolved internal 16 percentage points are not tax and remain pending a separate owner allocation decision. Unverified or inconsistent tax evidence fails closed.**

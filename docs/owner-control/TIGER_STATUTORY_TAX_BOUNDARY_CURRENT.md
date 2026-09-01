# TIGER STATUTORY TAX BOUNDARY — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / FAIL_CLOSED`
**Effective owner decision:** 2026-09-01
**Domain:** statutory tax for TIGER-owned paid platform services.

## 1. Binding rule — tax is outside TIGER internal economics

VVIP TIGER sets the **platform base price** for its own paid service. The applicable government/statutory tax is determined by the relevant jurisdiction and transaction rules, not by TIGER.

Canonical formula:

`PLATFORM BASE PRICE = TIGER-APPROVED SERVICE PRICE`

`STATUTORY TAX = PLATFORM BASE PRICE × VERIFIED APPLICABLE TAX RATE`

`FINAL USER TOTAL = PLATFORM BASE PRICE + STATUTORY TAX`

There is **no universal 16% tax rate, no 16% tax ceiling, and no 16% pricing baseline** in the current authority.

Examples for a platform base price of 10.00:

- applicable tax `0%` → tax `0.00` → user total `10.00`;
- applicable tax `12%` → tax `1.20` → user total `11.20`;
- applicable tax `16%` → tax `1.60` → user total `11.60`;
- applicable tax `20%` → tax `2.00` → user total `12.00`;
- applicable tax `25%` → tax `2.50` → user total `12.50`.

A higher statutory rate is not absorbed by TIGER and is not capped at 16%.

## 2. TIGER does not invent legal tax

The applicable tax result must come from verified jurisdiction/tax evidence or a lawful tax provider/rules engine appropriate to the actual transaction.

Depending on jurisdiction, the result may depend on factors such as B2B/B2C status, customer location, service classification, exemptions, registration thresholds, marketplace/deemed-supplier rules, or other legally relevant facts.

Unverified, malformed, negative, unavailable, or otherwise invalid tax evidence fails closed rather than being guessed.

## 3. Quote and display rule

Before capture, the authoritative server quote must expose at least:

- platform base price;
- verified statutory tax amount;
- applicable tax rate/context;
- final user total;
- jurisdiction/evidence identity.

The final sealed quote includes the applicable statutory tax. After that quote is sealed, no hidden or second statutory-tax surcharge may be added without generating a new valid quote.

## 4. Distribution basis

Statutory tax never enters TIGER internal distribution or commission calculations.

`PLATFORM SERVICE REVENUE = PLATFORM BASE PRICE`

`DISTRIBUTION BASIS = PLATFORM BASE PRICE`

`STATUTORY TAX LIABILITY = STATUTORY TAX`

`FINAL USER TOTAL = DISTRIBUTION BASIS + STATUTORY TAX LIABILITY`

Tax is excluded from:

- OWNER percentages;
- PARTNER percentages;
- ACTUAL_OPERATIONS percentages;
- SALES_ADMINISTRATION percentages;
- GENERAL_MANAGER / SECTOR_MANAGER / MARKETER commissions;
- all DIGITAL actor economics;
- self-service commission allocation.

`TAX MONEY != COMMISSION MONEY`

## 5. Former internal TAX_RESERVE 16% is unrelated

The former internal `TAX_RESERVE = 16%` distribution allocation remains **cancelled**.

Its unresolved internal 16 percentage points are a separate pending owner allocation decision. They are not statutory tax, are not a pricing baseline, and may not be restored, consumed, or reassigned by inference.

## 6. Country activation is independent

Opening, suspending, or closing a country remains a separate commercial/operational owner-governance decision.

The statutory tax percentage by itself does not automatically open or close a country.

## 7. Canonical server enforcement

Canonical module:

`project-control/finance/statutory-tax-boundary.cjs`

Input:

- `basePriceMinor` — TIGER-approved platform service base price in minor currency units;
- verified statutory tax quote containing applicable effective rate, jurisdiction, and source evidence identity.

Output includes:

- base price;
- statutory tax amount;
- tax liability amount;
- final displayed/user total;
- distribution basis equal to the base price;
- jurisdiction/evidence identity;
- explicit tax exclusion from distribution and commissions.

## 8. Rounding and integrity

All canonical monetary calculations execute in minor currency units with deterministic rounding and safe-integer checks.

Invalid inputs and overflow fail closed.

## 9. Discounts

Any owner-approved discount, including the current eligible self-service discount, applies to the TIGER platform service price according to current pricing authority **before** the final taxable quote is sealed, unless applicable law requires a different taxable basis.

The statutory tax calculation must follow the verified legal treatment for that transaction. No discount path may cause statutory tax to enter commissionable/distributable revenue.

## 10. Audit separation

Every taxable TIGER platform-service purchase must remain auditable to at least:

- approved platform base price;
- discounts/reversals where applicable;
- verified tax rate and tax context;
- statutory tax amount;
- final user total;
- tax jurisdiction;
- tax evidence/provider identity;
- distribution basis excluding statutory tax;
- immutable purchase/quote identity and timestamps.

## 11. Acceptance statement

> **VVIP TIGER sets its platform service base price. The applicable legal tax is determined from verified jurisdiction/transaction rules and is added to the user total as required. 0% adds nothing; 12% adds 12%; 16% adds 16%; 20% adds 20%; 25% adds 25%. There is no 16% tax ceiling and no 16% pricing baseline. Statutory tax remains outside all TIGER distributions and commissions. Country activation is an independent owner business decision. The cancelled former internal TAX_RESERVE 16% remains a separate unresolved owner-allocation matter. Unverified tax fails closed.**

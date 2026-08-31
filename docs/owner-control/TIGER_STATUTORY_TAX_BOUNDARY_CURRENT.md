# TIGER STATUTORY TAX BOUNDARY — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / FAIL_CLOSED`
**Effective owner decision:** 2026-09-01
**Domain:** country-specific statutory tax pricing for TIGER-owned paid platform services.

## 1. Binding rule — 16% is the reference-price baseline

The newest owner decision supersedes the prior fixed-final-price extraction model.

The approved TIGER reference prices, including the current Pulse reference levels, are calibrated with **16% tax already included**.

For each user transaction TIGER must:

1. start from the approved reference price;
2. remove the included 16% baseline correctly by division, not by subtracting 16% of the gross price;
3. obtain the verified statutory tax rate applicable to the user's jurisdiction/transaction;
4. apply that verified country tax to the untaxed base;
5. display the resulting country-specific total as the final price the user pays.

Canonical formula:

`UNTAXED BASE = REFERENCE PRICE / 1.16`

`COUNTRY TAX = UNTAXED BASE × VERIFIED COUNTRY TAX RATE`

`FINAL USER PRICE = UNTAXED BASE + COUNTRY TAX`

The 16% baseline is a **pricing calibration baseline**, not a universal tax rate and not a statutory tax chosen by TIGER.

## 2. Examples

Using a reference price of 10.00:

- verified country tax 0% -> untaxed base ≈ 8.62 -> final user price ≈ 8.62;
- verified country tax 12% -> untaxed base ≈ 8.62 -> final user price ≈ 9.65/9.66 depending on minor-unit rounding;
- verified country tax 16% -> final user price returns to 10.00;
- verified country tax 20% -> final user price ≈ 10.34.

The exact implementation works in minor currency units with deterministic rounding.

## 3. User-facing price

The price displayed for the user's country after the rebase is the **final tax-inclusive amount charged**.

`USER CHARGE = DISPLAYED COUNTRY PRICE`

`ADDITIONAL TAX AT CAPTURE = 0`

No second tax surcharge may be added after the country-specific final price has been displayed and sealed for payment.

## 4. TIGER does not invent legal tax

VVIP TIGER controls the commercial reference prices but does not invent or arbitrarily choose statutory tax rates.

The applicable tax rate must come from verified jurisdiction/tax evidence or provider logic appropriate to the transaction.

Unverified, malformed, negative, or unavailable tax evidence fails closed rather than being guessed.

## 5. Distribution basis is the untaxed platform-service base

The statutory tax amount is outside TIGER distributable revenue.

For the current pricing model:

`PLATFORM SERVICE REVENUE = UNTAXED BASE`

`DISTRIBUTION BASIS = UNTAXED BASE`

`STATUTORY TAX = COUNTRY TAX APPLIED TO UNTAXED BASE`

Tax is excluded from:

- OWNER percentage calculations;
- PARTNER percentage calculations;
- ACTUAL_OPERATIONS calculations;
- SALES_ADMINISTRATION calculations;
- GENERAL_MANAGER / SECTOR_MANAGER / MARKETER commissions;
- DIGITAL actor economics;
- self-service commission allocation.

`TAX MONEY != COMMISSION MONEY`

## 6. Correct removal of the 16% baseline

The baseline must be removed by division:

`REFERENCE PRICE / 1.16`

It must **not** be implemented as:

`REFERENCE PRICE × 0.84`

because subtracting 16% from a tax-inclusive gross price does not mathematically recover the pre-tax base.

## 7. Former TAX_RESERVE 16% remains separate

The pricing baseline of 16% in this document is not the former internal `TAX_RESERVE = 16%` distribution allocation.

The former internal TAX_RESERVE remains cancelled under the current financial-distribution authority. Its unresolved internal 16 percentage points remain a separate owner allocation decision and must not be restored, consumed, or reclassified as statutory tax by inference.

## 8. Country activation is independent

Opening, suspending, or closing a country remains a TIGER commercial/operational owner-governance decision.

The country tax rate itself does not automatically open or close a country.

## 9. Server-authoritative enforcement

The canonical enforcement module is:

`project-control/finance/statutory-tax-boundary.cjs`

It accepts:

- `referencePriceMinor` — approved reference price in minor units, calibrated with the 16% baseline included;
- a verified tax quote containing the applicable effective country tax rate plus jurisdiction/evidence identity.

It returns at minimum:

- reference price;
- baseline included tax basis points = 1600;
- untaxed base;
- statutory country tax;
- country-specific displayed/final user price;
- platform revenue/distribution basis;
- jurisdiction/evidence;
- zero additional tax at capture.

## 10. Rounding and integrity

All monetary calculations execute in minor currency units.

The implementation uses deterministic rounding and safe-integer checks. Overflow or invalid inputs fail closed.

At a verified 16% country rate, the country-specific total must return to the approved reference price within the deterministic minor-unit calculation.

## 11. Discounts

Any owner-approved discount, including the current eligible self-service discount, must be resolved consistently before the final country-specific payment amount is sealed.

No discount path may cause statutory tax to enter commissionable/distributable revenue.

## 12. Audit separation

Every taxable platform purchase must remain auditable to at least:

- approved reference price;
- 16% reference baseline;
- untaxed base;
- verified country tax rate;
- statutory tax amount;
- final displayed/user-charged price;
- tax jurisdiction/context;
- tax evidence/source identity;
- distribution basis excluding statutory tax;
- discounts and reversals where applicable.

## 13. Acceptance statement

> **TIGER reference prices are calibrated with a 16% tax baseline already included. For each country, TIGER first recovers the untaxed base by dividing the reference price by 1.16, then applies the verified statutory tax rate for the user's jurisdiction, and the resulting country-specific amount is the final price displayed and charged. A 16% jurisdiction returns the reference price; a lower tax produces a lower user price; a higher tax produces a higher user price. Statutory tax remains outside all TIGER distributions and commissions. The 16% pricing baseline is separate from the cancelled former internal TAX_RESERVE 16%, which remains governed by the separate pending owner-allocation decision. Unverified tax fails closed.**

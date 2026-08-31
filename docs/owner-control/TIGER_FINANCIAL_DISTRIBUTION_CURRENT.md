# TIGER FINANCIAL DISTRIBUTION — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK`
**Effective decision:** 2026-09-01
**Domain:** distribution of TIGER-owned paid platform-service revenue.

## 1. Distribution basis

All TIGER internal percentages are calculated only from **platform service revenue excluding statutory tax**.

Under the current country-tax pricing model, approved reference prices are calibrated with a 16% tax baseline. The system first recovers the untaxed base by dividing the reference price by 1.16, then applies the verified statutory tax rate for the user's jurisdiction.

`UNTAXED BASE = REFERENCE PRICE / 1.16`

`COUNTRY TAX = UNTAXED BASE × VERIFIED COUNTRY TAX RATE`

`FINAL USER PRICE = UNTAXED BASE + COUNTRY TAX`

`DISTRIBUTION BASIS = UNTAXED BASE`

The resulting country-specific displayed price is the final amount charged. No second tax is added at capture.

The binding tax authority is:

`docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`

## 2. Pricing examples

For a reference price of 10.00:

- country tax 0% -> final ≈ 8.62;
- country tax 12% -> final ≈ 9.65/9.66 depending on minor-unit rounding;
- country tax 16% -> final = 10.00;
- country tax 20% -> final ≈ 10.34.

The 16% pricing baseline is not a universal statutory tax selected by TIGER. It is only the calibration already contained in the approved reference prices.

## 3. Former TAX_RESERVE 16% remains cancelled

`TAX_RESERVE_STATUS: CANCELLED`

The former internal `TAX_RESERVE = 16%` allocation is cancelled and is **not** the same thing as the 16% pricing baseline.

The unresolved 16 percentage points left after cancellation remain an unallocated platform-revenue decision pending explicit owner allocation.

They are not statutory tax and may not be used to fund, absorb, or replace country tax by inference.

No person, role, account, partner, operations bucket, sales bucket, CSR bucket, owner bucket, digital actor, or tax bucket may receive those 16 percentage points until a later explicit owner decision reallocates them.

Final distribution execution therefore remains fail-closed.

## 4. Current known allocations — 84%

| Allocation | Percentage |
|---|---:|
| `OWNER` | **5%** |
| `PARTNER_1` | **5%** |
| `PARTNER_2` | **5%** |
| `PARTNER_3` | **5%** |
| `ACTUAL_OPERATIONS` | **43%** |
| `SALES_ADMINISTRATION` | **21%** |
| **KNOWN CURRENT TOTAL** | **84%** |
| **PENDING EXPLICIT OWNER REALLOCATION** | **16%** |

The pending 16% row is not an allocation.

## 5. Owner and partner allocations

`OWNER = 5%` of the distribution basis.

Each partner allocation is independent:

- `PARTNER_1 = 5%`;
- `PARTNER_2 = 5%`;
- `PARTNER_3 = 5%`.

If a partner position is unassigned, its approved 5% routes to OWNER with an auditable `UNASSIGNED_PARTNER` reason code.

A partner must have a valid payout destination. If none exists within 12 hours of role grant, payout eligibility is suspended and the affected approved share routes to OWNER unless the owner explicitly extends the grace period.

The unresolved internal 16% never routes to OWNER by inference.

## 6. Actual operations — 43%

`ACTUAL_OPERATIONS = 43%` of the distribution basis.

| Operations item | Percentage |
|---|---:|
| `RISK_RESERVE` | **8%** |
| `MAINTENANCE` | **8%** |
| `DEVELOPMENT` | **8%** |
| `TECHNICAL_SUPPORT` | **8%** |
| `ADVERTISING` | **8%** |
| `CSR` | **3%** |
| **TOTAL** | **43%** |

CSR is inside the 43%. There is no separate 1% charity allocation.

## 7. Sales administration — 21%

| Role | Reserved percentage |
|---|---:|
| `GENERAL_MANAGER` | **7%** |
| `SECTOR_MANAGER` | **7%** |
| `MARKETER` | **7%** |
| **TOTAL** | **21%** |

### One sale — one human winner

One purchase may have at most one winning sales-role claim.

- GENERAL_MANAGER winner -> that HUMAN role receives its 7%; the other two sales roles receive 0.
- SECTOR_MANAGER winner -> that HUMAN role receives its 7%; the other two sales roles receive 0.
- MARKETER winner -> that HUMAN role receives its 7%; the other two sales roles receive 0.

The two non-winning reserved 7% shares route to OWNER with `NON_WINNING_SALES_ROLE` reason codes.

There is no hierarchical commission cascade.

### Self-service

If there is no valid HUMAN sales claimant:

1. the approved visible 7% self-service discount is applied according to current pricing authority before the payment quote is finalized;
2. the discounted reference-price path is then rebased from its 16% calibration to the verified country tax;
3. statutory tax remains excluded from distribution;
4. no sales role receives commission;
5. the 21% SALES_ADMINISTRATION envelope routes to OWNER with absent-role reason codes;
6. the 7% discount is recorded separately.

If a valid sales claimant exists, the self-service discount does not apply.

## 8. Human–Digital Financial Firewall

Every canonical `DIGITAL` actor is permanently a zero-financial-benefit actor.

For every DIGITAL actor:

- `financialBeneficiary = false`;
- `commissionBps = 0`;
- `shareBps = 0`;
- `financialEntitlement = 0`;
- `payoutDestination = null`;
- wallet authority prohibited;
- sales-commission ownership prohibited.

`DIGITAL_*` role names are also treated as digital for financial enforcement even if actor type is misclassified.

A winning sale claim must belong to exactly one `HUMAN + ACTIVE + ELIGIBLE` GENERAL_MANAGER, SECTOR_MANAGER, or MARKETER with deterministic attribution evidence.

The canonical firewall is:

`project-control/finance/human-digital-financial-firewall.cjs`

## 9. Deterministic sale attribution

Every eligible sale claim must include at minimum:

- purchase or quote identity;
- winning HUMAN role type;
- winning user identity;
- assignment version/epoch;
- source/referral evidence;
- timestamp;
- deduplication key;
- SHA-256-shaped integrity hash.

Ambiguous, duplicate, invalid, DIGITAL, inactive/ineligible, unknown-role, or multi-winner claims fail closed.

## 10. Country-tax pricing boundary

The canonical tax module is:

`project-control/finance/statutory-tax-boundary.cjs`

Required identities:

`untaxedBase = referencePrice / 1.16`

`statutoryTax = untaxedBase × verifiedCountryTaxRate`

`userTotal = untaxedBase + statutoryTax`

`displayedPrice = userTotal`

`distributionBasis = untaxedBase`

`additionalTaxAtCapture = 0`

The old rule that treated the reference price itself as a fixed final price and merely carved tax out of it is superseded and must not remain active.

An unverified, negative, malformed, or unavailable tax result fails closed. TIGER does not guess legal tax rates.

## 11. Payout and ledger

Eligible external human commission payouts are settled every 14 days.

A successful settlement may reduce payable balance to zero but never erases ledger history.

Financial records preserve separated dimensions for at least:

- OWNER;
- PARTNERS;
- ACTUAL_OPERATIONS;
- SALES_ADMINISTRATION;
- PENDING_OWNER_DECISION;
- STATUTORY_TAX_EXTERNAL;
- ABSENT_SALES_ROLE;
- ACTIVE_USER_DISCOUNT;
- refunds/reversals.

Every movement remains auditable to purchase identity, reference price, baseline 16% calibration, untaxed base, verified country tax rate, statutory tax amount, final displayed/user charge, distribution basis, allocation, beneficiary/fallback, reason code, status, timestamps, and immutable evidence linkage.

## 12. Security invariants

Financial execution is server-authoritative and fail closed.

Required invariants include:

- the approved reference price is calibrated with a 16% baseline;
- the baseline is removed by division by 1.16, never by multiplying the gross price by 0.84;
- verified country tax is applied to the recovered untaxed base;
- the country-specific displayed price is the final charge;
- no second tax surcharge is added at capture;
- statutory tax never enters platform distribution or commissions;
- no restored TAX_RESERVE;
- no invented reassignment of the unresolved internal 16%;
- final distribution remains blocked while current owner allocation totals only 84%;
- one sale / one HUMAN winner;
- all DIGITAL actors remain zero-benefit;
- payout changes are verified;
- replay/deduplication protection;
- immutable auditable ledger;
- atomic reversal for refunds/chargebacks;
- no client-authoritative commission calculation;
- no silent/manual balance edits without audit evidence.

## 13. Acceptance statement

> **Approved TIGER reference prices contain a 16% pricing baseline. The system removes that baseline correctly by dividing the reference price by 1.16, applies the verified statutory tax rate for the user's country/transaction to the recovered untaxed base, and displays/charges the resulting country-specific final price. A 16% country returns the reference price; lower tax lowers the final user price; higher tax raises it. Distribution and commissions use only the untaxed platform-service base. The pricing baseline is separate from the cancelled former internal TAX_RESERVE 16%, whose unresolved 16 percentage points remain pending a separate owner allocation decision. Current known allocations remain OWNER 5%, three partners 5% each, ACTUAL_OPERATIONS 43%, and SALES_ADMINISTRATION 21%. One sale has at most one ACTIVE, ELIGIBLE HUMAN sales winner. Every DIGITAL actor remains permanently zero-financial-benefit.**

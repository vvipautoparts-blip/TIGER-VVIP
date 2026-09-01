# TIGER FINANCIAL DISTRIBUTION — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK`
**Effective decision:** 2026-09-01
**Domain:** distribution of TIGER-owned paid platform-service revenue.

## 1. Distribution basis

All TIGER internal percentages are calculated only from **platform service revenue excluding statutory tax**.

Canonical pricing boundary:

`PLATFORM BASE PRICE = TIGER-APPROVED SERVICE PRICE`

`STATUTORY TAX = PLATFORM BASE PRICE × VERIFIED APPLICABLE TAX RATE`

`FINAL USER TOTAL = PLATFORM BASE PRICE + STATUTORY TAX`

`DISTRIBUTION BASIS = PLATFORM BASE PRICE`

There is no 16% pricing baseline and no 16% tax ceiling. The applicable legal tax is outside TIGER internal distribution economics.

Binding tax authority:

`docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`

## 2. Tax examples

For a TIGER platform base price of 10.00:

- tax 0% → final user total 10.00;
- tax 12% → final user total 11.20;
- tax 16% → final user total 11.60;
- tax 20% → final user total 12.00;
- tax 25% → final user total 12.50.

The legal rate is not selected by TIGER. Unverified tax fails closed.

## 3. Former TAX_RESERVE 16% remains cancelled

`TAX_RESERVE_STATUS: CANCELLED`

The former internal `TAX_RESERVE = 16%` allocation is cancelled. It is **not** statutory tax and is not a pricing baseline.

The unresolved 16 percentage points left after cancellation remain an unallocated platform-revenue decision pending explicit owner allocation.

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

- GENERAL_MANAGER winner → that HUMAN role receives its 7%; the other two sales roles receive 0.
- SECTOR_MANAGER winner → that HUMAN role receives its 7%; the other two sales roles receive 0.
- MARKETER winner → that HUMAN role receives its 7%; the other two sales roles receive 0.

The two non-winning reserved 7% shares route to OWNER with `NON_WINNING_SALES_ROLE` reason codes.

There is no hierarchical commission cascade.

### Self-service

If there is no valid HUMAN sales claimant:

1. apply the approved visible 7% self-service discount to the TIGER platform service price according to current pricing/legal tax treatment;
2. create a verified statutory-tax quote for the resulting taxable platform service amount;
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

Canonical firewall:

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

## 10. Country-tax boundary

Canonical tax module:

`project-control/finance/statutory-tax-boundary.cjs`

Required identities:

`statutoryTax = platformBasePrice × verifiedApplicableTaxRate`

`userTotal = platformBasePrice + statutoryTax`

`distributionBasis = platformBasePrice`

`taxLiability = statutoryTax`

Statutory tax is segregated from platform revenue, commissions, and all internal allocation percentages.

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

Every movement remains auditable to purchase identity, platform base price, discount treatment, verified tax context/rate, statutory tax amount, final user total, distribution basis, allocation, beneficiary/fallback, reason code, status, timestamps, and immutable evidence linkage.

## 12. Security invariants

Financial execution is server-authoritative and fail closed.

Required invariants include:

- TIGER platform base price is independent from statutory tax;
- verified statutory tax is added according to applicable law;
- there is no artificial 16% tax ceiling or 16% pricing baseline;
- final quote exposes platform base price + statutory tax + user total;
- no hidden second tax is added after a sealed final quote;
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

> **TIGER sets the platform service base price. Verified statutory tax is added to the user total as legally applicable and remains outside every TIGER distribution and commission calculation. There is no 16% pricing baseline and no 16% tax ceiling. The former internal TAX_RESERVE 16% remains cancelled, and its unresolved internal 16 percentage points remain pending a separate explicit owner allocation decision. Current known allocations remain OWNER 5%, three partners 5% each, ACTUAL_OPERATIONS 43%, and SALES_ADMINISTRATION 21%. One sale has at most one ACTIVE, ELIGIBLE HUMAN sales winner. Every DIGITAL actor remains permanently zero-financial-benefit.**

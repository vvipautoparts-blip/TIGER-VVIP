# TIGER FINANCIAL DISTRIBUTION — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK`
**Effective decision:** 2026-09-01
**Domain:** distribution of TIGER-owned paid platform-service revenue.

## 1. Distribution basis

All TIGER internal percentages are calculated from **platform service revenue after included statutory tax has been separated from the final tax-inclusive user price**.

`DISTRIBUTION_BASIS = PLATFORM_SERVICE_REVENUE_EXCLUDING_STATUTORY_TAX`

The user-facing price is final and tax-inclusive. Statutory tax is not added again at capture.

The binding statutory-tax authority is:

`docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`

A refund, reversal, void, or chargeback reverses the related platform allocations atomically while preserving immutable audit evidence.

## 2. Current statutory-tax boundary — final price includes tax

VVIP TIGER does not invent the legal tax rate. The applicable jurisdiction/rules determine the statutory-tax result, and TIGER consumes verified tax evidence/provider logic.

The current boundary is:

`FINAL DISPLAYED PRICE = PLATFORM SERVICE REVENUE + INCLUDED VERIFIED STATUTORY TAX`

`USER CHARGE = FINAL DISPLAYED PRICE`

`ADDITIONAL TAX AT CAPTURE = 0`

`PLATFORM SERVICE REVENUE = FINAL DISPLAYED PRICE - INCLUDED VERIFIED STATUTORY TAX`

The verified tax quote must correspond to the final displayed price. If verified included tax is zero, the full final displayed price is platform service revenue. If included tax is non-zero, that verified tax amount is carved out internally before distribution.

There is no TIGER 16% tax ceiling, no tax subsidy, no tax shield, and no use of internal commission/revenue allocations to absorb statutory tax.

Country opening/closing is an owner-governance decision independent from the tax rate itself.

## 3. Former TAX_RESERVE 16% remains cancelled

`TAX_RESERVE_STATUS: CANCELLED`

The former internal `TAX_RESERVE = 16%` is cancelled. It is not a statutory tax rate, tax bucket, reserve, beneficiary, or fallback.

The 16 percentage points left after that cancellation remain an **unallocated platform-revenue decision pending explicit owner allocation**.

They are not statutory tax and may not be used to pay or absorb statutory tax by inference.

No person, role, account, partner, operations bucket, sales bucket, CSR bucket, owner bucket, digital actor, or tax bucket may receive those 16 percentage points until a later explicit owner decision reallocates them.

Therefore final distribution execution remains fail-closed.

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

The pending 16% row is not an allocation. It records only the unresolved commercial distribution balance.

## 5. Owner and partner allocations

`OWNER = 5%` of the distribution basis.

Each partner allocation is independent:

- `PARTNER_1 = 5%`;
- `PARTNER_2 = 5%`;
- `PARTNER_3 = 5%`.

If a partner position is unassigned, its approved 5% routes to OWNER with an auditable `UNASSIGNED_PARTNER` reason code.

A partner must have a valid payout destination. If no acceptable payout destination exists within 12 hours of role grant, payout eligibility is suspended and the affected approved share routes to OWNER unless the owner explicitly extends the grace period.

The unresolved 16% never routes to OWNER by inference.

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

The operations sub-allocation engine fails closed unless the total is exactly 43%.

## 7. Sales administration — 21%

| Role | Reserved percentage |
|---|---:|
| `GENERAL_MANAGER` | **7%** |
| `SECTOR_MANAGER` | **7%** |
| `MARKETER` | **7%** |
| **TOTAL** | **21%** |

### One sale — one human winner

One purchase may have at most one winning sales-role claim.

- GENERAL_MANAGER winner -> that HUMAN role receives 7%; the other two sales-role shares do not receive commission.
- SECTOR_MANAGER winner -> that HUMAN role receives 7%; the other two sales-role shares do not receive commission.
- MARKETER winner -> that HUMAN role receives 7%; the other two sales-role shares do not receive commission.

The two non-winning 7% reserved shares route to OWNER with `NON_WINNING_SALES_ROLE` reason codes.

There is no hierarchical commission cascade.

### Self-service

If there is no valid HUMAN sales claimant:

1. the user receives the approved visible 7% self-service discount before the final payment price is sealed;
2. the tax engine/provider must produce verified included-tax evidence for that final discounted tax-inclusive price;
3. included statutory tax is separated from the final displayed price;
4. the resulting platform-service revenue excluding statutory tax is the distribution basis;
5. no sales role receives commission;
6. the 21% SALES_ADMINISTRATION envelope routes to OWNER with absent-role reason codes;
7. the 7% discount is recorded separately.

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

The rule also defends against misclassification by treating `DIGITAL_*` roles as digital for financial-benefit enforcement.

A winning sale claim must belong to exactly one `HUMAN + ACTIVE + ELIGIBLE` GENERAL_MANAGER, SECTOR_MANAGER, or MARKETER with deterministic attribution evidence.

Digital actors may analyze, recommend, validate, route, or execute owner-authorized non-beneficiary automation only.

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

## 10. Statutory-tax separation at checkout

The canonical tax boundary is:

`project-control/finance/statutory-tax-boundary.cjs`

It must preserve separate values for:

- final displayed tax-inclusive price;
- actual user charge;
- platform revenue;
- included statutory tax;
- distribution basis;
- tax jurisdiction/evidence;
- additional tax at capture, which must be zero under the current presentation rule.

Required identities:

`userTotal = finalDisplayedPrice`

`platformRevenue = finalDisplayedPrice - includedStatutoryTax`

`distributionBasis = platformRevenue`

`additionalTaxAtCapture = 0`

An unverified, negative, malformed, or internally inconsistent statutory-tax result fails closed. TIGER must not guess a legal tax rate or silently change the final displayed price.

The former cancelled 16% internal allocation is not restored or reclassified as statutory tax.

## 11. Payout and ledger

Eligible external human commission payouts are settled every 14 days.

A successful settlement may reduce payable balance to zero, but it never erases ledger history.

Financial records must preserve separated accounting dimensions for at least:

- OWNER;
- PARTNERS;
- ACTUAL_OPERATIONS;
- SALES_ADMINISTRATION;
- PENDING_OWNER_DECISION;
- STATUTORY_TAX_EXTERNAL;
- ABSENT_SALES_ROLE;
- ACTIVE_USER_DISCOUNT;
- refunds/reversals.

Every movement remains auditable to purchase identity, final displayed price, actual user charge, platform service revenue, included statutory tax where applicable, distribution basis, percentage, allocation, beneficiary/fallback, reason code, status, timestamps, and immutable evidence linkage.

## 12. Security invariants

Financial execution is server-authoritative and fail closed.

Required invariants include:

- the displayed user price is final and tax-inclusive;
- no second statutory-tax surcharge is added at capture;
- statutory tax never enters platform distribution or commissions;
- unverified or inconsistent tax is never guessed;
- included tax cannot exceed the final displayed price;
- no restored TAX_RESERVE;
- no invented reassignment of the unresolved 16%;
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

> **The price shown to the user is the final tax-inclusive price and is the amount charged. Applicable verified statutory tax is separated internally from that price and is never added again at capture. TIGER distribution and commissions are calculated only from platform-service revenue remaining after included statutory tax is removed. Statutory tax never enters OWNER, PARTNER, ACTUAL_OPERATIONS, SALES_ADMINISTRATION, HUMAN commission, or DIGITAL economics. Country activation is an independent owner-governance decision, not a 16% tax threshold. The former internal TAX_RESERVE 16% remains cancelled. The unresolved internal 16 percentage points are not tax and remain pending a separate explicit owner allocation decision, so final distribution remains fail-closed. Current known allocations remain OWNER 5%, three partners 5% each, ACTUAL_OPERATIONS 43%, and SALES_ADMINISTRATION 21%. One sale has at most one ACTIVE, ELIGIBLE HUMAN sales winner. Every DIGITAL actor remains permanently zero-financial-benefit.**

# TIGER FINANCIAL DISTRIBUTION — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK / NO_IN_TREE_ARCHIVE`  
**Effective decision:** 2026-08-28  
**Domain:** distribution of successfully captured TIGER Pulse visibility purchases.

## 1. Allocation basis

All percentages in this authority are calculated from the **actual amount successfully captured from the user after any valid self-service discount** and before TIGER internal allocation.

A refunded, voided, reversed, or charged-back purchase reverses the related allocations atomically and remains traceable in the immutable ledger.

No allocation in this document applies to the underlying buyer/seller or service-provider/beneficiary transaction. It applies only to TIGER-owned paid visibility/service revenue.

## 2. Main 100% distribution

| Allocation | Percentage |
|---|---:|
| `OWNER` | **5%** |
| `PARTNER_1` | **5%** |
| `PARTNER_2` | **5%** |
| `PARTNER_3` | **5%** |
| `ACTUAL_OPERATIONS` | **43%** |
| `TAX_RESERVE` | **16%** |
| `SALES_ADMINISTRATION` | **21%** |
| **TOTAL** | **100%** |

The allocation engine must fail closed if these percentages do not total exactly 100%.

`TAX_RESERVE` is the owner-approved internal 16% tax-reserve envelope inside the purchase distribution. It must not be represented as a universal statutory tax rate where local law requires a different legal treatment; statutory settlement remains subject to the active country contract and law.

## 3. Owner account

`OWNER = 5%` of the actual captured purchase basis.

The platform maintains a separated owner ledger/account dimension. Missing or ineligible partner/sales-role allocations described below route to the owner ledger with the precise reason code and originating allocation.

## 4. Partner accounts

Each partner allocation is independent:

- `PARTNER_1 = 5%`;
- `PARTNER_2 = 5%`;
- `PARTNER_3 = 5%`.

The platform maintains a separated partners ledger/account dimension.

When a partner role is assigned, the assignee must provide a valid payout destination through the dedicated account field. If no acceptable payout destination is provided within **12 hours** of role grant, the role becomes payout-ineligible/suspended for commission purposes and its allocation routes to the owner account. The owner may explicitly extend the grace period.

If a partner position is unassigned, its 5% allocation routes to the owner account with an `UNASSIGNED_PARTNER` reason code.

## 5. Actual operations — 43%

`ACTUAL_OPERATIONS = 43%` of the actual captured purchase basis.

Its internal sub-ledgers are:

| Operations item | Percentage |
|---|---:|
| `RISK_RESERVE` | **8%** |
| `MAINTENANCE` | **8%** |
| `DEVELOPMENT` | **8%** |
| `TECHNICAL_SUPPORT` | **8%** |
| `ADVERTISING` | **8%** |
| `CSR` | **3%** |
| **TOTAL** | **43%** |

These balances are internal platform operational allocations under owner/delegate control. The sub-allocation engine must fail closed if the operations total is not exactly 43%.

## 6. Tax reserve — 16%

`TAX_RESERVE = 16%` of the actual captured purchase basis.

The platform maintains a separated tax-reserve ledger/account dimension. Movements must remain fully traceable. Legal tax reporting/settlement is handled under the active country/payment profile and applicable law without changing this owner-approved internal allocation unless a later explicit owner decision changes it.

## 7. Sales administration — 21%

The sales-administration envelope is:

| Role | Reserved percentage |
|---|---:|
| `GENERAL_MANAGER` | **7%** |
| `SECTOR_MANAGER` | **7%** |
| `MARKETER` | **7%** |
| **TOTAL** | **21%** |

### One sale — one commission winner

For each purchase, at most one of these roles may own the winning sale claim.

- If `GENERAL_MANAGER` owns the sale: GENERAL_MANAGER receives 7%; SECTOR_MANAGER = 0%; MARKETER = 0%.
- If `SECTOR_MANAGER` owns the sale: SECTOR_MANAGER receives 7%; GENERAL_MANAGER = 0%; MARKETER = 0%.
- If `MARKETER` owns the sale: MARKETER receives 7%; GENERAL_MANAGER = 0%; SECTOR_MANAGER = 0%.

The two non-winning reserved 7% shares route to the owner account and retain their original role labels plus a `NON_WINNING_SALES_ROLE` reason code.

There is no hierarchical cascade commission and no automatic sharing of one sale across the three roles.

### No sales claimant / self-service purchase

If the user completes the Pulse purchase without an attributed GENERAL_MANAGER, SECTOR_MANAGER, or MARKETER:

1. the user receives a visible **7% active-user self-service discount** before payment;
2. the captured amount after this discount becomes the allocation basis;
3. no sales role receives commission;
4. the entire 21% SALES_ADMINISTRATION envelope on the captured amount routes to the owner account with explicit absent-role reason codes;
5. the 7% discount itself is recorded in a separated `ACTIVE_USER_DISCOUNT` ledger/reporting dimension.

If a valid sales claimant exists, the self-service 7% discount does not apply.

## 8. Sales role activation and payout destination

When GENERAL_MANAGER, SECTOR_MANAGER, or MARKETER is granted to a user by the owner or an authorized delegate, the platform must request the payout destination in the dedicated role/account field.

If a valid payout destination is not provided within **12 hours** of role grant:

- commission payout eligibility is suspended for that role;
- the owner may extend the grace period;
- allocations that cannot be paid to that role route to the owner account with a precise reason code;
- no hidden balance may accumulate for an ineligible role.

Role authorization and payout destination must be independently auditable.

## 9. Settlement cadence — every 14 days

Owner, partner, operations, tax-reserve, and sales-role accounting dimensions are reconciled continuously.

Eligible external commission payouts are settled every **14 days**.

"Account reset to zero" means the **payable balance becomes zero after a successful settlement/reconciliation**. It never means erasing transaction history. The immutable ledger, allocation records, reversals, payout evidence, and audit trail remain permanently available under current evidence policy.

Failed or blocked payouts remain explicitly classified; they are never silently deleted.

## 10. Deterministic attribution at global scale

The system must support very large independent populations of GENERAL_MANAGER, SECTOR_MANAGER, and MARKETER roles without assuming they belong to one hierarchy.

Every eligible sale creates exactly one deterministic `SALE_OWNERSHIP_CLAIM` containing at minimum:

- purchase/quote identity;
- winning role type;
- winning user identity;
- country/sector/scope context where applicable;
- assignment epoch/version;
- source/referral evidence;
- timestamp;
- deduplication key;
- integrity hash.

The allocation engine rejects ambiguous, duplicate, expired/invalid, or multi-winner claims fail closed.

## 11. Separate ledger dimensions

At minimum, the platform exposes separate accounting dimensions for:

- `OWNER`;
- `PARTNERS`;
- `ACTUAL_OPERATIONS`;
- `TAX_RESERVE`;
- `SALES_ADMINISTRATION`;
- `ABSENT_SALES_ROLE`;
- `ACTIVE_USER_DISCOUNT`;
- individual partner/role payable balances;
- refunds/chargebacks/reversals.

Every movement records purchase identity, gross reference amount, discount, actual captured amount, percentage, allocated amount, beneficiary or owner fallback, reason code, status, timestamps, and immutable audit linkage.

## 12. Reports and permissions

The owner and explicitly authorized delegates have full financial reporting authority.

Partners may receive read-only financial reports according to current owner-granted partner permissions. Reports may be detailed, summarized, filtered by role, purchase, country, sector, period, payout state, discount state, or exception reason.

No sales role obtains owner-level reporting merely because it receives commission.

## 13. Security invariants

Financial distribution is server-authoritative and fail closed.

Required controls include:

- immutable/double-entry or equivalently auditable financial ledger;
- idempotent allocation and payout processing;
- exact 100% allocation invariant;
- one-sale/one-winner invariant;
- least-privilege role access;
- verified payout destination changes;
- replay/deduplication protection;
- atomic reversal for refunds/chargebacks;
- no client-authoritative commission calculation;
- no hidden/manual balance edits without audit evidence.

## 14. Supersession

Any prior commission model, split, hierarchy, percentage, partner treatment, sales cascade, payment-timing rule, or conflicting financial fallback is removed from current authority when it conflicts with this document.

Conflicting old material must be deleted from the current repository tree and may not be moved to an in-tree archive/trash/legacy folder. Git history is the only provenance mechanism for removed source material.

## 15. Owner acceptance statement

> **Every successfully captured Pulse purchase is allocated 100% as OWNER 5%, PARTNER_1 5%, PARTNER_2 5%, PARTNER_3 5%, ACTUAL_OPERATIONS 43%, TAX_RESERVE 16%, and SALES_ADMINISTRATION 21%. Operations is 8+8+8+8+8+3. Sales administration is 7+7+7 but only the one role that owns the sale receives its 7%; non-winning or absent sales shares route to the owner. A self-service buyer with no sales claimant receives a visible 7% discount before payment, and no sales role receives commission. Eligible commissions settle every 14 days; missing payout destination after 12 hours suspends payout eligibility unless the owner extends it. Ledger history is never erased.**

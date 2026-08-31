# TIGER PULSE RING 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**Effective decision:** 2026-09-01
**Domain:** paid visibility only.

## 1. Current product rule

TIGER has one paid-visibility product family:

> **TIGER PULSE RING — purchased visibility after an ordinary eligible Living Sector Object is publishable under NEXUS.**

Ordinary eligible sector publication is free and never requires Pulse, a publishing card, subscription, purchased slot, plan, entitlement receipt, or payment gate.

## 2. Global reference purchase levels and country-tax rebasing

The only current Pulse **reference** purchase levels are:

| Level | Reference price containing the approved 16% pricing baseline |
|---|---:|
| `PULSE_2` | **2 JOD** |
| `PULSE_10` | **10 JOD** |
| `PULSE_20` | **20 JOD** |
| `PULSE_45` | **45 JOD** |

No other current Pulse purchase-level set is authorized.

These four values are **reference prices containing a 16% pricing baseline**. They are not fixed final prices for every country.

For every country-specific payment quote, TIGER must:

1. recover the untaxed reference base using `REFERENCE PRICE / 1.16`;
2. obtain the verified statutory tax rate applicable to the user's jurisdiction/transaction;
3. calculate the statutory tax on the untaxed base;
4. calculate `FINAL COUNTRY PRICE = UNTAXED BASE + VERIFIED COUNTRY TAX`;
5. display that country-specific total as the final user price before payment;
6. add **no second tax surcharge** at capture.

Therefore:

- a verified `0%` country tax produces the untaxed base;
- a verified `12%` country tax produces a price below the 16%-baseline reference price;
- a verified `16%` country tax returns the approved reference price;
- a verified `20%` country tax produces a price above the 16%-baseline reference price.

The 16% used here is a **pricing baseline only**. It is separate from the cancelled former internal `TAX_RESERVE 16%`, which remains a different financial-distribution matter.

TIGER does not invent statutory tax rates. Unverified tax evidence fails closed.

The canonical tax authority is:

`docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`

The canonical calculation module is:

`project-control/finance/statutory-tax-boundary.cjs`

A lawful local payment rail may display the final equivalent local-currency amount where required, but the underlying TIGER reference level remains one of 2/10/20/45 JOD and country tax rebasing remains server-authoritative.

## 3. Visibility is quantity/strength, never days

TIGER does not sell days, months, an expiry period, a publishing lifetime, guaranteed first position, or permanent ranking dominance.

Each 2/10/20/45 reference purchase level maps through the server-authoritative visibility engine to a distinct visibility allocation. Before payment the user must see the selected reference level, the final country-specific price after verified tax rebasing, and the resulting visibility information, including the exact server quote available for that scope.

The UI may describe delivery rhythm when supported by the quote, but the authoritative value is the server-side visibility allocation and verified delivery evidence—not a timer.

Purchased Pulse value has **no product-time expiry**. It remains available until consumed by eligible delivery, refunded/voided under current payment policy, or the underlying content becomes ineligible under safety/legal/policy controls.

Technical/security expirations such as short-lived payment quotes, OTPs, sessions, signed URLs, replay windows, delivery reservations, and caches are allowed and are not product-duration rules.

## 4. Targeting scope

A Pulse purchase may target the current supported scope selected by the user, including:

- exactly one sector, or all eligible sectors where the product surface permits it;
- neighborhood;
- area;
- governorate;
- district / liwa;
- country.

Targeting must be server-validated against current sector and geographic registries. A payment cannot bypass safety, policy, identity, country activation, relevance, quality, trust, or inventory eligibility.

## 5. Organic publication separation

Current new publication is governed by `TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md` and requires an activated sector plus an approved Living Sector Object intent.

Pulse begins only after the content is eligible for paid visibility. Pulse never:

- grants publication permission;
- buys a publishing slot;
- bypasses review or policy eligibility;
- creates a paid posting quota;
- changes organic content lifetime;
- creates a second paid-post object or duplicate creation workflow.

## 6. Self-service incentive

If a user purchases Pulse without an attributed `GENERAL_MANAGER`, `SECTOR_MANAGER`, or `MARKETER` sale claim, the platform applies a **7% active-user self-service discount** before the country-specific payment quote is finalized.

After the discount is resolved, the server-authoritative country-tax quote is calculated from the resulting reference-price basis according to the current pricing/tax authority.

The discount must be visible to the user before payment and recorded in its own immutable ledger/accounting dimension.

If the purchase is attributed to one valid sales role, the 7% self-service discount does not apply.

## 7. One sale — one sales claimant

A Pulse purchase may have at most one winning sales claimant from:

- `GENERAL_MANAGER`;
- `SECTOR_MANAGER`;
- `MARKETER`.

Only the role that actually owns the sale claim receives its 7% sales commission. The other sales roles receive 0 for that purchase. No hierarchy automatically shares one sale among several roles.

Attribution must be deterministic, auditable, deduplicated, and locked before final financial distribution.

## 8. Financial distribution authority

Financial handling follows:

`docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`

Statutory tax calculated for the country-specific Pulse price is outside TIGER distributions and commissions.

The latest owner decision cancels the former internal `TAX_RESERVE` 16% allocation. No replacement recipient or percentage has been invented. Until the owner explicitly reallocates that cancelled 16%, the financial distribution remains incomplete and distribution execution is fail-closed.

The cancelled internal 16% must never be confused with or used as the 16% Pulse reference-pricing baseline.

## 9. Verified delivery

Billable/consumable delivery requires server-verifiable eligible visibility evidence. Client telemetry alone is never authoritative for charging or consuming purchased visibility.

Consumption follows the NEXUS verified-delivery sequence:

`RESERVE → SERVE → VERIFY → CONSUME`

Fast scroll, rejected automation/bots, invalid placements, suppressed duplicates, hidden/background surfaces, policy-ineligible content, failed delivery reservations, and other unqualified delivery consume zero purchased visibility.

Current delivery modes are `NOW`, `SMART`, and `PRECISE`. They change delivery strategy only; they do not change purchased quantity or bypass eligibility.

## 10. Payment boundary

Pulse purchase is a platform-owned advertising/visibility service transaction only.

It does not create buyer/seller checkout, escrow, custody, delivery, settlement, item warranty, transaction guarantee, marketplace transaction commission, or payment intermediation between marketplace parties.

Payment requires a server-authoritative country-specific quote built from the approved reference level, the 16% pricing-baseline removal, verified statutory country tax, provider-authoritative payment result, idempotency, replay protection, and immutable accounting/audit evidence.

The country-specific displayed price is the final amount charged. `ADDITIONAL TAX AT CAPTURE = 0`.

There is no general-purpose transferable user money wallet. Pulse balances are platform-service visibility allocations.

## 11. Superseded material disposal

Conflicting publishing cards, subscriptions, paid publishing slots, timed activation cards, superseded price tiers, fixed-global-price interpretations that bypass country-tax rebasing, product-duration fields, duplicate paid-post creation paths, and paid-publication entitlement gates must be removed from the current repository tree and active schema/runtime through protected forward migration where necessary.

They must not be moved to an in-tree archive, trash folder, hidden compatibility layer, test fixture, fallback, generated copy, current documentation, or launch gate.

Already-applied historical database migration files are not rewritten to fake history; their obsolete effects are neutralized by forward migrations. Git history is the sole provenance mechanism for removed conflicting source material.

## 12. Owner acceptance statement

> **The only current Pulse reference purchase levels are 2, 10, 20, and 45 JOD, and each contains the approved 16% pricing baseline. For each country-specific quote, TIGER removes that baseline by dividing the reference price by 1.16, then applies the verified statutory tax rate for the user's jurisdiction/transaction to the untaxed base. The resulting country-specific price is the final price shown and charged, with no second tax surcharge at capture. A 16% country returns the reference price; lower tax lowers the country price; higher tax raises it. Statutory tax remains outside TIGER distributions and commissions. The pricing baseline 16% is separate from the cancelled former internal TAX_RESERVE 16%. Each purchase buys a distinct server-authoritative visibility allocation, not days. Ordinary eligible NEXUS sector publication remains free. Self-service without a sales claimant receives the approved visible 7% discount before the final country-specific quote. Only the one HUMAN role that owns the sale receives its 7% commission.**

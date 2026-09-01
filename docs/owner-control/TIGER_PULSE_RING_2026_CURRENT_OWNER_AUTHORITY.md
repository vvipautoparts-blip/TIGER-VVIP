# TIGER PULSE RING 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**Effective decision:** 2026-09-01
**Domain:** paid visibility only.

## 1. Current product rule

TIGER has one paid-visibility product family:

> **TIGER PULSE RING — purchased visibility after an ordinary eligible Living Sector Object is publishable under NEXUS.**

Ordinary eligible sector publication is free and never requires Pulse, a publishing card, subscription, purchased slot, plan, entitlement receipt, or payment gate.

## 2. Global platform base purchase levels + statutory tax

The only current Pulse platform **base** purchase levels are:

| Level | TIGER platform base price |
|---|---:|
| `PULSE_2` | **2 JOD** |
| `PULSE_10` | **10 JOD** |
| `PULSE_20` | **20 JOD** |
| `PULSE_45` | **45 JOD** |

No other current Pulse purchase-level set is authorized.

These four values are TIGER platform service base prices. They do **not** contain a universal 16% tax baseline.

For every country-specific payment quote TIGER must:

1. start from the approved platform base price;
2. obtain the verified statutory tax result applicable to the user's jurisdiction/transaction;
3. calculate statutory tax on the legally applicable taxable base;
4. calculate `FINAL USER TOTAL = PLATFORM BASE PRICE + VERIFIED STATUTORY TAX`;
5. expose base price, tax, and final total before payment;
6. add no hidden second statutory-tax surcharge after the final quote is sealed.

Examples for a 10 JOD base price:

- 0% tax → 10.00 JOD total;
- 12% tax → 11.20 JOD total;
- 16% tax → 11.60 JOD total;
- 20% tax → 12.00 JOD total;
- 25% tax → 12.50 JOD total.

There is no 16% tax ceiling. TIGER does not invent statutory tax rates. Unverified tax evidence fails closed.

Canonical tax authority:

`docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`

Canonical calculation module:

`project-control/finance/statutory-tax-boundary.cjs`

A lawful local payment rail may display the final equivalent local-currency amount where required, but the TIGER base service level remains one of 2/10/20/45 JOD unless a later owner decision changes it.

## 3. Visibility is quantity/strength, never days

TIGER does not sell days, months, an expiry period, a publishing lifetime, guaranteed first position, or permanent ranking dominance.

Each 2/10/20/45 purchase level maps through the server-authoritative visibility engine to a distinct visibility allocation. Before payment the user must see the selected platform base level, applicable statutory tax, final user total, and resulting visibility information, including the exact server quote available for that scope.

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

If a user purchases Pulse without an attributed `GENERAL_MANAGER`, `SECTOR_MANAGER`, or `MARKETER` sale claim, the platform applies a **7% active-user self-service discount** to the platform service price before the final taxable quote is sealed, subject to verified applicable legal tax treatment.

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

Statutory tax calculated for a Pulse purchase is outside TIGER distributions and commissions.

The latest owner decision cancels the former internal `TAX_RESERVE` 16% allocation. No replacement recipient or percentage has been invented. Until the owner explicitly reallocates that cancelled 16%, the financial distribution remains incomplete and distribution execution is fail-closed.

The cancelled internal 16% is not statutory tax and not a Pulse pricing baseline.

## 9. Verified delivery

Billable/consumable delivery requires server-verifiable eligible visibility evidence. Client telemetry alone is never authoritative for charging or consuming purchased visibility.

Consumption follows the NEXUS verified-delivery sequence:

`RESERVE → SERVE → VERIFY → CONSUME`

Fast scroll, rejected automation/bots, invalid placements, suppressed duplicates, hidden/background surfaces, policy-ineligible content, failed delivery reservations, and other unqualified delivery consume zero purchased visibility.

Current delivery modes are `NOW`, `SMART`, and `PRECISE`. They change delivery strategy only; they do not change purchased quantity or bypass eligibility.

## 10. Payment boundary

Pulse purchase is a platform-owned advertising/visibility service transaction only.

It does not create buyer/seller checkout, escrow, custody, delivery, settlement, item warranty, transaction guarantee, marketplace transaction commission, or payment intermediation between marketplace parties.

Any future lawful Pulse real-money path must use a server-authoritative quote containing the approved platform base price, verified statutory tax, final user total, provider-authoritative payment result, idempotency, replay protection, and immutable accounting/audit evidence.

There is no general-purpose transferable user money wallet. Pulse balances are platform-service visibility allocations.

## 11. Superseded material disposal

Conflicting publishing cards, subscriptions, paid publishing slots, timed activation cards, superseded price tiers, 16%-baseline rebasing, product-duration fields, duplicate paid-post creation paths, and paid-publication entitlement gates must be removed from the current repository tree and active schema/runtime through protected forward migration where necessary.

They must not be moved to an in-tree archive, trash folder, hidden compatibility layer, test fixture, fallback, generated copy, current documentation, or launch gate.

Already-applied historical database migration files are not rewritten to fake history; their obsolete effects are neutralized by forward migrations. Git history is the sole provenance mechanism for removed conflicting source material.

## 12. Owner acceptance statement

> **The only current Pulse platform base purchase levels are 2, 10, 20, and 45 JOD. Applicable verified statutory tax is added to the platform base price according to law; there is no 16% pricing baseline and no 16% tax ceiling. Statutory tax remains outside TIGER distributions and commissions. The former internal TAX_RESERVE 16% remains cancelled and separate. Each Pulse purchase buys a distinct server-authoritative visibility allocation, not days. Ordinary eligible NEXUS sector publication remains free. Self-service without a sales claimant receives the approved visible 7% discount before the final taxable quote is sealed. Only the one eligible HUMAN role that owns the sale receives its 7% commission.**

# TIGER PULSE RING 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / OWNER_BINDING / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**Effective decision:** 2026-08-29
**Domain:** paid visibility only.

## 1. Current product rule

TIGER has one paid-visibility product family:

> **TIGER PULSE RING — purchased visibility after an ordinary post/listing is eligible.**

Ordinary publishing is free and never requires Pulse, a publishing card, subscription, purchased slot, plan, entitlement receipt, or payment gate.

Sovereign pricing/proof follows:

`docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`

## 2. Global product levels — market-sovereign price

The current global **product-level identifiers** are:

- `PULSE_2`
- `PULSE_10`
- `PULSE_25`
- `PULSE_45`

These identifiers define product/visibility levels. They do **not** define a universal amount or currency.

There is no global/default Pulse currency and no globally authoritative JOD price table.

A sovereign price exists only through an explicitly authorized **Signed Market Pricing Contract** that binds at least the relevant market, product level, amount, currency, policy version, exact applicable release/proof context, and validity/evidence.

The earlier global `2/10/25/45 JOD` pricing authority is superseded wherever it implied Jordan/JOD was the global/default pricing jurisdiction. It must not return as a compatibility fallback.

## 3. Visibility is quantity/strength, never days

TIGER does not sell days, months, an expiry period, a publishing lifetime, guaranteed first position, or permanent ranking dominance.

Each Pulse product level maps through the server-authoritative visibility engine to its defined visibility allocation under the applicable signed market contract. Before payment the user must see the actual market-authorized amount/currency and resulting visibility information, including the exact server quote available for that scope.

The UI may describe delivery rhythm such as slow/good/fast when supported by the quote, but the authoritative value is the server-side visibility allocation and verified delivery evidence—not a timer.

Purchased Pulse value has **no product-time expiry**. It remains available until consumed by eligible delivery, refunded/voided under current payment policy, or the underlying content becomes ineligible under safety/legal/policy controls.

Technical/security expirations such as short-lived payment quotes, OTPs, sessions, signed URLs, replay windows, caches, owner execution leases, evidence freshness windows, Proof Capsules, and execution seals are allowed and are not product-duration rules.

## 4. Targeting scope

A Pulse purchase may target a scope supported by the applicable authorized market capability, including where permitted:

- exactly one sector, or all eligible sectors where the product surface permits it;
- neighborhood;
- area;
- governorate/state-equivalent;
- district / liwa or local equivalent;
- country/market.

Targeting must be server-validated against current sector/geographic registries and the applicable SPGF market Genome/Passport/Proof context. Payment cannot bypass safety, policy, identity, market activation, relevance, quality, trust, inventory, privacy, legal eligibility, exact-release binding, or revocation.

## 5. Organic publication separation

Current ordinary publication contract:

`Create/Complete → Preview → Submit for Review → Trusted Review → Publish`

Pulse begins only after the content is eligible for paid visibility. Pulse never:

- grants publication permission;
- buys a publishing slot;
- bypasses review;
- creates a paid posting quota;
- changes the organic content lifetime;
- calls a legacy paid `requestPublication(...)` path.

## 6. Self-service incentive

If a user purchases Pulse without an attributed `GENERAL_MANAGER`, `SECTOR_MANAGER`, or `MARKETER` sale claim, the platform applies a **7% active-user self-service discount** before payment authorization.

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

Every successfully captured Pulse purchase is distributed according to:

`docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`

The financial basis is the amount actually captured from the user in the explicit market currency after any valid self-service discount and before internal allocation. Refunds/chargebacks reverse the corresponding allocations atomically.

The distribution percentages do not create a global/default currency.

## 9. Verified delivery

Billable/consumable delivery requires server-verifiable eligible visibility evidence. Client telemetry alone is never authoritative for charging or consuming purchased visibility.

Fast scroll, rejected automation/bots, invalid placements, suppressed duplicates, hidden/background surfaces, policy-ineligible content, and failed delivery reservations consume zero purchased visibility.

## 10. Payment boundary

Pulse purchase is a platform-owned advertising/visibility service transaction only.

It does not create buyer/seller checkout, escrow, custody, delivery, settlement, item warranty, transaction guarantee, marketplace transaction commission, or payment intermediation between marketplace parties.

Payment requires a Signed Market Pricing Contract, server-authoritative quote verification, an authorized market payment profile, provider-authoritative result, idempotency, replay protection, current SPGF proof/evidence, and immutable accounting/audit evidence.

There is no global default payment provider and no general-purpose transferable user money wallet. Pulse balances are platform-service visibility credits/allocations.

## 11. Fail-closed sovereign pricing

If any required market, price, currency, payment profile, legal/tax policy, SPGF capability authority, exact release, or critical proof is missing/invalid/expired/stale/unverified/revoked:

`DENY / FAIL_CLOSED`

Never:

- substitute JOD or USD as a global fallback;
- route to another country/market;
- infer market from IP, locale, hosting region, phone prefix, or provider location;
- activate another payment provider unless the same market policy explicitly authorizes that failover and current proof validates it.

## 12. Superseded material disposal

Conflicting publishing cards, subscriptions, paid publishing slots, timed activation cards, global JOD price authority, product-duration fields, paid-publication entitlement gates, and prior parallel sovereign architecture authority must be removed from the current repository tree and active schema/runtime through protected forward migration where necessary.

They must not be moved to an in-tree archive, trash folder, hidden compatibility layer, test fixture, fallback, generated copy, current documentation, or launch gate.

Already-applied historical database migration files are not rewritten to fake history; their obsolete effects are neutralized by forward migrations. Git history is the sole provenance mechanism for removed conflicting source material.

## 13. Owner acceptance statement

> **The current global Pulse product-level identifiers are PULSE_2, PULSE_10, PULSE_25, and PULSE_45. They define visibility product levels, not a universal amount or currency. TIGER has no global/default Pulse currency and no global JOD price authority. Actual amount and currency exist only through an authorized Signed Market Pricing Contract under SPGF. Each level buys a server-authoritative visibility allocation, not days, and purchased value has no product-time expiry. Ordinary publication remains free. Self-service purchase without a sales claimant receives a visible 7% discount; an attributed sale does not. Only the one role that owns the sale receives the 7% sales commission. All financial allocation follows the current 100% distribution authority. Missing/stale/unverified/revoked sovereign pricing/payment/market/proof authority fails closed with no country, currency, provider, release, or proof fallback.**

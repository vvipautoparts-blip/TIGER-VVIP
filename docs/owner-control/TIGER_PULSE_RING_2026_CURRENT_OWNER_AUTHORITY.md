# TIGER PULSE RING 2026 — CURRENT OWNER AUTHORITY

**Status:** CURRENT_ONLY — BINDING OWNER AUTHORITY
**Effective date:** 2026-08-18
**Domain:** TIGER monetization, paid visibility, publishing access, Pulse pricing, Pulse delivery, Pulse payment UX, impression accounting, and conflicting commercial product authority.

## 1. Binding product rule

TIGER has exactly one current advertiser-paid product family for ordinary listings:

> **Paid verified visibility through TIGER PULSE RING.**

Ordinary listing publication is not a paid subscription product. A compliant advertiser may publish subject to current content, safety, anti-abuse, sector, country, identity, and policy controls without purchasing a publishing subscription or publishing card.

## 2. Absolute commercial cap

The only current Pulse Ring purchase levels are:

| Tier | Price |
|---|---:|
| `SPARK` / شرارة | 3 JOD |
| `PULSE` / نبض | 10 JOD |
| `SURGE` / اندفاع | 20 JOD |

There is no fourth tier.

**No single TIGER platform charge authorization may use a reference price above 20 JOD under this authority.** A payment provider may present the lawful local-currency equivalent for the active market, but the authoritative TIGER reference price for the operation remains at or below 20 JOD.

The former 45 JOD and 120 JOD visibility concepts are abolished from CURRENT product authority.

## 3. Publishing-subscription model is abolished

The following concepts are `SUPERSEDED / HISTORICAL ONLY` and must not remain operative current authority:

- publishing subscriptions;
- paid publishing entitlement as a prerequisite to ordinary listing creation;
- publishing-card catalogs at 10 / 35 / 80 / 120 JOD;
- monthly posting quotas purchased through those cards;
- subscription cycles, renewals, subscription expiry, and publishing-slot purchase;
- `Publishing Access` as a paid product;
- paid-post quota wallets or equivalent monetized publishing counters.

Historical files may remain only as provenance/audit evidence and must be clearly non-operative. They may not feed runtime, current configuration, generated copy, tests, launch criteria, or current owner indexes.

## 4. What TIGER sells

TIGER does not sell days, calendar duration, guaranteed first position, absolute dominance, or a fixed placement monopoly.

TIGER sells a server-quoted quantity of **verified eligible impressions** for an eligible listing.

Before payment, TIGER calculates the impression quantity for the selected 3/10/20 JOD level from current active-market delivery economics and eligibility. The exact quantity is displayed to the buyer and locked into the server-issued purchase quote before payment authorization.

A purchased verified-impression grant does not expire because time passed. It remains until consumed, refunded/voided according to payment policy, or the underlying listing becomes permanently ineligible under policy/legal rules.

## 5. No ranking purchase

Payment cannot bypass or weaken:

`Relevance → Quality → Trust → Policy Eligibility`

Pulse delivery is evaluated only after the listing is eligible. A paid listing that fails safety, policy, relevance, or trust requirements cannot buy its way to the top.

Pulse may increase eligible sponsored-delivery opportunities, but organic relevance and user trust remain protected.

## 6. No tier stacking bypass

Repeated purchases may add verified-impression fuel, but they may not combine into a stronger instantaneous tier.

At any moment, one listing's maximum paid delivery intensity is capped at the `SURGE` / 20 JOD level.

If multiple active grants exist, balance consumption may proceed through them deterministically, but delivery weighting is normalized to the single maximum allowed tier. There is no effective 40/60/100 JOD super-tier.

## 7. Verified impression invariant

A billable Pulse impression requires all of the following:

- at least 50% of the listing's qualifying sponsored surface is continuously visible for at least 2,000 ms;
- the document/app surface is foreground-active;
- the placement and listing are eligible;
- the viewer/session is not rejected as automation/bot/abuse;
- the event is not a suppressed duplicate within the active deduplication window;
- the server-side delivery reservation can be reconciled to a valid active Pulse grant.

Fast scroll, rejected bots, background-tab exposure, refresh abuse, invalid placements, and suppressed duplicate exposure consume zero purchased impressions.

Client telemetry alone is never authoritative for billing.

## 8. Pulse Ring experience

The current purchase UX is an in-context `⚡ نبّض` action on an eligible listing.

It opens TIGER Pulse Ring inside the Living Surface and presents only the three current levels: 3 / 10 / 20 JOD.

For the selected level the server quote shows, before payment:

- exact verified impressions granted by this purchase;
- current market activity descriptor;
- expected delivery rhythm descriptor;
- eligible high-opportunity contexts when safely explainable;
- payment methods actually available for the active market/account/device;
- the exact payable reference price.

The UI must not advertise a payment method that the selected provider/session cannot actually offer.

## 9. In-situ controls

After purchase, the listing owns the compact Pulse state. No giant central recharge dashboard is required for ordinary use.

Current controls:

- **Pulse Halo:** compact remaining-balance state such as `⚡ 3.2K`;
- **Pulse Rhythm:** `CALM`, `SMART` (default), `FAST`; changing rhythm changes pacing, never price or ranking eligibility;
- **Pulse Pause Intelligence:** the engine may pause consumption when qualified demand is insufficient and resume when eligible demand returns.

Pause must preserve purchased balance. TIGER must not consume impressions merely to satisfy a time target.

## 10. Payment and ledger boundary

Pulse purchase is a platform-owned advertising/visibility service transaction only.

It does not create buyer/seller checkout, escrow, delivery, settlement, item warranty, transaction commission, or marketplace payment intermediation.

Pulse payment requires server-authoritative quote verification, provider-authoritative payment result, signed webhook/event verification where supported, idempotency, replay protection, and immutable financial/audit evidence.

There is no general-purpose user money wallet. Purchased Pulse grants are service entitlements/credits, not stored monetary value transferable between users.

## 11. Schema and migration supersession

Conflicting CURRENT schema concepts such as `subscription_tiers`, `posting_quotas`, subscription expiry fields, paid publishing-entitlement tables, and equivalent operational constructs must be inventoried and retired.

Historical migration files are not rewritten to fake history. Removal from a deployed schema must occur through reviewable forward migrations after dependency analysis, data-retention/legal review, rollback/recovery design, and exact-head tests.

For Pulse grants, calendar expiry fields such as `duration_days` or service `expires_at` are not authoritative for consumption. Short-lived server purchase-quote expiry is allowed and is not a Pulse-credit expiration.

## 12. Supersession scope

This authority supersedes every conflicting CURRENT requirement, spec, PR description, code path, schema field, configuration, UI copy, mock, test, launch criterion, and owner index—including the former publishing-card model and any 45/120 JOD Pulse tier.

Where historical evidence is retained, it must be labeled `SUPERSEDED / HISTORICAL ONLY` and isolated from runtime authority.

## 13. Safety-preserving migration

Deprecation is not satisfied by hiding old UI.

Each conflicting feature must be traced through:

1. owner/current requirements;
2. UI and routes;
3. backend services;
4. database/schema/RLS;
5. payment/provider configuration;
6. scheduled jobs/webhooks;
7. analytics/telemetry;
8. tests/fixtures;
9. launch/readiness documentation.

Removal occurs only with dependency evidence and tests proving no dual commercial authority remains.

## 14. Owner acceptance statement

The binding decision is:

> **TIGER has no paid publishing subscription. Ordinary compliant publishing is free. The only paid visibility model is Pulse Ring at 3, 10, or 20 JOD, with no fourth tier and no effective stacked tier above 20 JOD. Purchased value is verified eligible visibility, not time or guaranteed rank. Conflicting publishing-subscription, 45 JOD, 120 JOD, expiry-by-days, paid-slot, and oversized recharge-dashboard authority is retired from CURRENT use across the platform.**

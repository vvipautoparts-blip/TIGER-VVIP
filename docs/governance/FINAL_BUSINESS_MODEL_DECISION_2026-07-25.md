# VVIP TIGER — Final Business Model Decision

**Decision ID:** VVIP-TIGER-BM-2026-07-25
**Status:** FINAL AND AUTHORITATIVE
**Baseline:** f917ca5d653fbc859d04fe9e9fa52f63e68ac722
**Owner:** Platform Management and Founding Partner
**Effective date:** 25 July 2026

## 1. Final platform role

VVIP TIGER / JO-AutoParts is a digital discovery, publishing, search, and
communication platform.

The platform:

- helps buyers discover sellers;
- helps sellers publish listings;
- reduces the distance between buyer and seller;
- enables direct communication between the parties.

The platform is not:

- the seller;
- the buyer;
- a commercial broker;
- a payment intermediary for vehicle parts;
- an escrow provider;
- a shipping provider;
- a guarantor of the item or transaction.

No commission or percentage is charged on a transaction between buyer and seller.

## 2. Free users

Users may browse, search, view listings, and use permitted communication features
without purchasing a publishing subscription.

A user who does not publish a post or advertisement owes no publishing subscription.

## 3. Publishing cards

The final reference prices are:

| Card | Reference price | Included publishing entitlement |
|---|---:|---|
| Card 10 | 10 JOD monthly | One post per subscription month |
| Card 35 | 35 JOD monthly | Four posts per subscription month |
| Card 80 | 80 JOD monthly | Advanced benefits to be approved later |
| Card 120 | 120 JOD monthly | Highest benefits to be approved later |

The system must not invent benefits, interactions, quotas, priority, or reach for
the 80 JOD and 120 JOD cards before an explicit owner decision.

## 4. Currency decision

JOD is the authoritative reference currency for publishing cards.

When the platform is activated in another country:

- the payment provider may present and collect the local currency equivalent;
- the platform records the original JOD reference price;
- the platform records the actual collected amount and currency returned by the provider;
- the provider exchange result is not rewritten by an internal general currency engine.

Example only: a 10 JOD card may be displayed by the provider as approximately
14.10 USD in the United States, subject to the provider's actual checkout value.

## 5. Removed currency scope

The following are not part of the platform:

- a general-purpose currency conversion engine;
- conversion of seller listing prices;
- forced conversion of vehicle-part prices;
- internal commercial rounding rules;
- psychological price endings such as 0.99;
- silent currency conversion.

A seller enters the listing price and currency relevant to the listing. The platform
does not become a party to that sale.

## 6. Payment scope

Payment functionality is limited to purchasing or renewing publishing cards and
their approved entitlements.

The platform must not implement checkout for buying vehicle parts.

Publishing-card payment must use:

- provider-hosted checkout;
- signed webhooks;
- idempotency;
- replay protection;
- payment and entitlement ledgers;
- failure, cancellation, expiry, and refund handling;
- disabled-by-default feature flags until real provider activation.

## 7. Supersession

This decision supersedes every earlier document, requirement, design, database
concept, code path, test, mock, or placeholder that conflicts with it.

Conflicting implementation must first be inventoried and proven unused or safely
replaceable before deletion.

No destructive deletion is authorized without dependency analysis, test evidence,
a deletion manifest, and Git-based recovery.

# VVIP TIGER — Campaign Intelligence 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY — BINDING OWNER AUTHORITY`
**Effective date:** `2026-08-18`
**Owner:** Platform Owner
**Scope:** advertising campaigns, verified distribution, campaign payment UX, delivery accounting, campaign controls, owner campaign command view
**Machine contract:** `project-control/advertising/campaign-intelligence-current-authority.v1.json`

## 1. Single current advertising product

VVIP TIGER has one sellable advertising value: **Verified Distribution Credit**, measured through the active versioned Qualified Verified Impression / Verified Viewability policy.

There is no second commercial catalog or parallel advertising authority in the current tree.

Ordinary social posting and ordinary marketplace publication do not require a paid advertising purchase. Promotion is a separate optional action after eligible content exists.

## 2. Simple surface, private core

The ordinary advertiser flow is:

1. **Goal**
2. **Budget / trusted quote**
3. **Review + payment**
4. **Verified activation**

The user sees only the facts needed to make the purchase decision. Internal pricing economics, fraud thresholds, capacity reserve math, security controls and margin calculations remain protected server-side.

## 3. Trusted quote boundary

Campaign economics are server-authoritative. The browser may display a trusted quote but may not manufacture or alter one.

A public quote binds at least:

- `quoteId`
- `productType = distribution-credit`
- `marketCountry`
- `currency`
- `priceMinor`
- `committedImpressions`
- `pricingVersion`
- `lifecyclePolicyId`
- `deliveryPolicyId`
- expiry when applicable

Missing, expired, inconsistent or unverifiable quote facts fail closed.

## 4. Country-specific economics

Every active market requires a versioned country campaign/payment contract that controls at least:

- currency;
- purchase minimum/maximum rules;
- pricing certificate/version;
- lifecycle policy;
- delivery policy;
- payment methods/providers actually active in that country;
- tax/legal wording when applicable;
- refund and chargeback handling;
- capacity constraints;
- fraud/risk references;
- activation state.

No global hard-coded provider, payment method, price or impression quantity is authoritative.

For Jordan, real-money campaign activation remains fail-closed until the applicable provider, settlement, financial-control, webhook, refund and chargeback gates are verified and approved.

## 5. Verified delivery and Fair Spend

Billable delivery must satisfy the active versioned delivery policy. The baseline requires:

- qualifying visibility;
- continuous qualifying visibility time;
- foreground/active surface;
- eligible content and placement;
- anti-bot and invalid-traffic checks;
- duplicate suppression;
- trusted server reservation/reconciliation.

Rejected bots, background exposure, invalid placements, suppressed duplicates and failed measurement do not consume purchased verified distribution. Client telemetry alone is never financial authority.

## 6. Payment activation

Browser success is not campaign success.

A campaign becomes successfully paid and active only when all authoritative states agree:

```text
Provider-authenticated payment = CONFIRMED
AND TigerPay accounting/ledger = POSTED/VALID
AND Campaign server state = ACTIVE
```

Redirect pages, query strings, browser storage, unsigned callbacks and client-generated receipts cannot activate a campaign.

Every financial transition requires idempotency, replay protection, reconciliation and append-only evidence.

## 7. Revenue recognition

Payment receipt is not automatically earned revenue.

```text
User Payment
-> Paid / Unearned Campaign Balance
-> Eligible Verified Delivery Consumption
-> Recognized Revenue
```

The owner financial view must distinguish cash received, undelivered liability, recognized revenue, refunds/chargebacks and remaining verified-distribution obligation.

## 8. Campaign Passport

Every paid campaign has a durable auditable identity binding at least:

- campaign ID;
- listing/ad ID;
- canonical actor/account reference;
- market country;
- quote ID;
- pricing version;
- lifecycle policy;
- delivery policy;
- committed distribution;
- payment ID;
- ledger/journal reference;
- activation state and timestamp.

## 9. Controlled intelligence

Smart Budget, pacing/autopilot, fatigue protection, Smart Pause and campaign-memory recommendations may operate only inside the purchased entitlement and current policy. They cannot authorize money movement, create authority, invent pricing evidence or silently spend additional money.

## 10. Product fairness

Payment buys additional policy-eligible verified distribution only. It does not buy truth, trust status, visual size, verification, eligibility bypass, guaranteed sales, guaranteed engagement or unrestricted organic ranking control.

## 11. Release boundary

This authority approves repository implementation of the QVI advertising model. It does not by itself authorize:

- real-money Production activation;
- provider-secret changes;
- country activation;
- Production database mutation;
- bypass of financial/security/review gates;
- fabricated payment, delivery or CI evidence.

## 12. Current-only rule

This document and its machine contract are the only current advertising-commercial authority in the repository. Current runtime, tests, configuration and user-facing product behavior must conform to them. No competing advertising pricing/catalog/publication authority may operate or be treated as a source of truth.
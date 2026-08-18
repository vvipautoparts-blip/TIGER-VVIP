# VVIP TIGER — TIGER Campaign Intelligence 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY — BINDING OWNER AUTHORITY`  
**Effective date:** `2026-08-18`  
**Owner:** Platform Owner  
**Scope:** advertising campaigns, verified distribution, campaign payment UX, delivery accounting, campaign controls, owner campaign command view  
**Machine contract:** `project-control/advertising/campaign-intelligence-current-authority.v1.json`

## 1. Final owner decision

This is the current owner authority for VVIP TIGER advertising campaigns. Any older current document, UI, runtime, pricing model, test, mock, schema interpretation, or launch criterion that conflicts with this authority is superseded and must not operate in parallel.

Historical evidence may remain only as explicitly non-operative provenance. It must not feed runtime or current product authority.

The governing product rule is:

> **Tell TIGER the goal and budget; TIGER protects the budget and delivers only policy-eligible verified distribution.**

The user experience must remain low-clutter. Internal financial, delivery, risk, fraud, accounting, capacity, and pricing complexity stays behind the surface.

## 2. One sellable advertising product

The only current sellable campaign value is **verified distribution credit**, measured through the current versioned Qualified Verified Impression / Verified Viewability policy.

The user does **not** buy:

- calendar days as the product;
- a social/commercial Tier;
- a larger card or stronger visual styling;
- a trust badge because of payment;
- hidden rank priority;
- guaranteed sale or engagement;
- a claim that a human eye certainly viewed the screen.

A higher payment may buy more deliverable verified distribution, subject to the active market contract, capacity, eligibility, and policy. It must not buy truth, trust status, or visual privilege.

## 3. Simple campaign surface

The ordinary user campaign flow is exactly four logical stages:

1. **Goal** — choose what the advertiser wants to achieve.
2. **Budget / trusted quote** — show the local payable amount and the committed verified distribution returned by trusted server quote authority.
3. **Review + payment** — show only country/session payment methods that are actually active and verified.
4. **Verified activation** — show success only after trusted payment confirmation, ledger posting, and server campaign activation all agree.

The surface must use progressive disclosure and must not expose internal engine names unless an owner/admin audit view requires them.

## 4. TIGER Campaign Intelligence components

The following are the approved internal capability families. They are architecture/operation concepts, not mandatory user-facing menus:

- **Smart Budget** — recommends efficient spend based on the trusted market quote and refuses to present invented economics.
- **Autopilot** — manages pacing/strategy within the paid entitlement and policy limits; it cannot authorize money movement.
- **Fair Spend** — invalid/bot/duplicate/background/ineligible delivery does not consume purchased verified distribution.
- **Margin / No-Loss Guard** — the platform must not sell a quote whose cost/capacity/risk evidence fails the current country economics policy. This is a fail-closed margin-protection control, not an absolute guarantee that business loss is mathematically impossible.
- **Campaign Passport** — a versioned, auditable campaign identity binding campaign, quote, market, pricing, delivery policy, payment, and ledger references.
- **Country Brain** — country contract for currency, payment methods, tax/legal wording, pricing floors, lifecycle, refund/chargeback rules, capacity and local policy.
- **Verified Delivery** — server-authoritative delivery accounting and de-duplication.
- **Smart Pause** — preserves remaining distribution when qualified demand or eligibility is insufficient.
- **Audience Fatigue Protection** — limits wasteful repeat exposure according to the active delivery policy.
- **Campaign Memory** — may recommend reusing prior successful configuration from permitted campaign history; it cannot silently spend money.
- **One-Tap Reboost** — may request a new quote using prior settings, but the new purchase uses current market/pricing/payment policy and requires explicit payment authorization.
- **Zero-Surprise Billing** — no additional charge or automatic recharge without explicit opt-in and current payment authorization.
- **Owner Sovereign Dashboard** — owner-only protected projection of money, liabilities, delivery, margin, risk, country state and reconciliation.
- **Simple / Pro modes** — the same authoritative backend; Simple minimizes choices, Pro exposes only legitimate advanced campaign controls.

## 5. Campaign goals and strategies

The public goal set may remain intentionally small. Current baseline goals:

- sell faster;
- increase reach;
- local reach;
- launch/new listing visibility;
- increase qualified engagement.

Current baseline delivery strategy labels:

- `ECONOMY`;
- `BALANCED` — default/recommended when supported by the quote;
- `BOOST`.

A strategy changes pacing/distribution behavior only within the purchased entitlement and eligibility rules. It does not create a hidden rank or trust bypass.

## 6. Trusted quote boundary

Authoritative campaign economics are server-side. The browser may display a trusted quote but may not manufacture one.

A public quote projection requires at least:

- `quoteId`;
- `productType = distribution-credit`;
- `marketCountry`;
- `currency`;
- `priceMinor`;
- `committedImpressions`;
- `pricingVersion`;
- `lifecyclePolicyId`;
- `deliveryPolicyId`;
- quote expiry when applicable.

The user-facing quote must not expose:

- DIDE formula;
- raw eCPM/economics;
- internal margin;
- operational cost per impression;
- fraud thresholds;
- capacity reserve math;
- security-control internals.

Missing or inconsistent quote facts fail closed.

## 7. Delivery and Fair Spend

Billable delivery must satisfy the current versioned delivery policy. The current baseline owner model remains:

- at least 50% qualifying visibility;
- at least 2.0 seconds continuous qualifying visibility;
- foreground/active surface;
- eligible listing and placement;
- anti-bot/invalid-traffic checks;
- duplicate suppression according to the active privacy/delivery policy;
- trusted reservation/reconciliation path.

Rejected bots, hidden/background exposure, invalid placements, suppressed duplicates, and failed measurement do not silently become billable success.

Client telemetry alone is never financial authority.

## 8. Smart Budget and spend protection

TIGER may recommend a lower budget when a higher amount would exceed safe deliverable demand/capacity for the current market and objective.

The platform must not pressure a user to spend more merely because a higher amount can be charged. A recommendation must remain explainable in simple user language without exposing confidential economics.

If cost, capacity, legal, payment, policy, or margin evidence is insufficient, new sale of that quote is blocked fail-closed.

## 9. Payment activation rule

Browser success is not campaign success.

The user may see **“تم الدفع وتفعيل الحملة”** only when all authoritative states agree:

```text
Provider-authenticated payment = CONFIRMED
AND TigerPay accounting/ledger = POSTED/VALID
AND Campaign server state = ACTIVE
```

A redirect page, query string, localStorage value, client callback, or unsigned provider payload cannot activate a campaign.

The trusted lifecycle is conceptually:

```text
Payment Intent
-> Provider Processing
-> Provider-authenticated Confirmation
-> TigerPay Ledger Posting
-> Campaign Funding/Entitlement Binding
-> Campaign Activation
```

Every financial step remains subject to idempotency, replay protection, reconciliation, and append-only evidence.

## 10. Revenue recognition

Payment receipt is not automatically earned campaign revenue.

The governing flow is:

```text
User Payment
-> Paid / Unearned Campaign Balance
-> Eligible Verified Delivery Consumption
-> Recognized Revenue
```

Accounting truth remains separate from provider state, settlement truth, authorization and audit in accordance with TigerPay.

## 11. Country Brain

Every active market uses a versioned country campaign/payment contract controlling at least:

- active market country;
- currency;
- minimum/maximum campaign purchase rules;
- pricing certificate/version;
- lifecycle policy;
- delivery policy;
- active payment methods/providers;
- tax/legal copy when applicable;
- refund and chargeback handling;
- capacity constraints;
- fraud/risk policy references;
- country activation state.

No global hard-coded provider, payment method, fixed price or fixed impression quantity is authority.

## 12. Campaign Passport

Every paid campaign must have a durable campaign identity. The internal passport binds at least:

- campaign ID;
- listing/ad ID;
- actor/account reference;
- active market country;
- quote ID;
- pricing version;
- lifecycle policy ID;
- delivery policy ID;
- committed distribution;
- payment ID;
- ledger/journal reference;
- activation timestamp/state;
- policy version/evidence references.

The ordinary user sees only a safe public projection. Owner/audit views may receive protected additional facts according to authorization and purpose.

## 13. Owner Sovereign Dashboard

The owner view must distinguish, not blur:

- payments received;
- unearned/undelivered campaign liability;
- recognized advertising revenue;
- remaining verified distribution liability;
- active/paused/completed campaigns;
- delivery quality and invalid traffic suppression;
- payment failures/refunds/chargebacks;
- profitability/margin state by country/sector where authorized;
- country activation state;
- reconciliation or risk alerts.

The dashboard must not report undelivered prepaid campaign balance as earned profit.

## 14. Superseded current concepts

The following are forbidden as current campaign authority when they conflict with this document:

- fixed global 3/10/20 or other Tier catalog as the only commercial model;
- fixed global 7/30/60-day campaign product;
- BASIC/GOLD/ROYAL/SPARK/PULSE/SURGE as price-authority tiers;
- fixed global impressions per currency unit;
- paid card-size/visual-priority advantage;
- hidden paid search rank dominance;
- paid trust/verification badge;
- browser-minted payment receipt or entitlement;
- automatic recharge by default;
- general-purpose user money wallet for advertising;
- platform buyer/seller transaction checkout or escrow;
- DIDE/eCPM/margin/op-cost disclosure to ordinary users;
- “human proof” or guaranteed-human-view wording.

Historical immutable evidence may retain old wording only when clearly marked historical/non-operative.

## 15. No-clutter rule

Do not create a separate visible menu for every internal component name. The ordinary advertiser should normally see only:

- **روّج إعلانك**;
- goal;
- budget/trusted quote;
- strategy when useful;
- payment;
- campaign status/performance.

Everything else remains internal or appears only through protected advanced/owner drill-down.

## 16. Release boundary

This owner decision authorizes repository implementation of the campaign intelligence layer and retirement of conflicting current source authority.

It does **not** by itself authorize:

- real-money Production activation;
- provider secret changes;
- country activation;
- Production database mutation;
- bypass of financial/security/review gates;
- fabricated delivery/payment/CI evidence.

Real-money activation requires the applicable Country Payment Package, provider contract, financial gates, webhook/refund/chargeback tests, reconciliation evidence, and protected Production release approval.

## 17. Owner acceptance statement

> **VVIP TIGER has one campaign experience: a simple goal-and-budget surface backed by server-authoritative verified distribution, country-specific economics, TigerPay accounting, and fail-closed activation. Conflicting fixed-tier, fixed-duration, paid-visual-privilege, browser-payment-success, and duplicate commercial models are retired from CURRENT authority.**

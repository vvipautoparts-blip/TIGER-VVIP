# VVIP TIGER — Official Product Blueprint

**Status:** `CURRENT_ONLY`  
**Purpose:** stable top-level product constitution. Domain details live only in their current binding authority and machine contract; this file does not duplicate commercial catalogs or historical decisions.

## 1. Source-of-truth rule

The current repository tree is governed by one current authority per responsibility.

- This blueprint defines stable platform boundaries.
- `IMPLEMENTATION_CHECKLIST.md` is execution tracking only, not product authority.
- Advertising and campaign economics are governed only by [`TIGER_CAMPAIGN_INTELLIGENCE_2026_CURRENT_OWNER_AUTHORITY.md`](./owner-control/TIGER_CAMPAIGN_INTELLIGENCE_2026_CURRENT_OWNER_AUTHORITY.md) and its machine contract.
- A document, test, runtime path or configuration that conflicts with a current binding authority must be corrected or removed; it must not operate as a parallel source of truth.

## 2. Product boundary

VVIP TIGER is a premium global discovery, social, advertising and direct-contact platform.

The platform may help users discover and contact each other, but it does not become the buyer, seller, broker, escrow agent, transaction guarantor or settlement intermediary for external goods/services transactions.

Platform payments are limited to approved VVIP TIGER services such as advertising/verified distribution under the active country contract.

## 3. Publishing and advertising separation

Ordinary eligible social posting and marketplace publication are not conditioned on purchasing advertising.

The governing flow is:

```text
Create content
-> Preview / validate
-> Publish or submit through the applicable ordinary content workflow
-> Optional promotion after eligible content exists
```

Advertising is a separate optional service. Its single current sellable value is Verified Distribution Credit under the current QVI authority.

## 4. Country contracts

Country-specific payment methods, pricing, taxes, legal wording, lifecycle, refunds/chargebacks and capacity are versioned and fail closed until approved and verified.

No global hard-coded provider, payment method, fixed advertising price or fixed distribution quantity is authoritative.

## 5. Identity and data authority

- Clerk is the identity/authentication authority.
- Supabase is the application data/RLS layer unless a later current binding infrastructure decision explicitly changes that responsibility.
- Browser-supplied identity or financial state is never sufficient authority for a protected operation.
- Secrets, privileged credentials and unrestricted financial mutation authority must not be exposed to browsers or AI contexts.

## 6. Financial integrity

Financial state is server-authoritative, idempotent, auditable and reconciled.

Payment receipt is not automatically earned advertising revenue. Unearned campaign balance remains a liability until eligible verified distribution is consumed according to the active policy.

AI may detect, explain, forecast and recommend. It may not independently create financial authority, move real money, erase ledger evidence or bypass approval gates.

## 7. Security and release integrity

Sensitive operations are least-privilege, fail-closed and auditable. Production activation requires the applicable security, financial, provider, country, CI and release gates on the exact reviewed source/artifact.

No document may fabricate Production deployment, payment activation, delivery evidence or CI success.

## 8. Current-only documentation discipline

The current tree must not contain competing product/commercial authorities for the same responsibility. Execution evidence may exist only as evidence and must not be presented as a current product authority.

When an authority changes, the active runtime, tests, configuration and current documentation are converged to the new authority rather than leaving a fallback commercial model in parallel.
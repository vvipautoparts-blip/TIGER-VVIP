# TIGER OWNER BINDING CURRENT — LATEST ONLY

**Status:** `CURRENT_ONLY / OWNER_BINDING / FIRST_REFERENCE / NO_FALLBACK / NO_IN_TREE_ARCHIVE`  
**Effective owner decision:** 2026-08-28  
**Scope:** the entire current VVIP TIGER platform: product, UI/UX, runtime, APIs, database current state, configuration, tests, CI/release gates, current documentation, launch criteria, cleanup and operational authority.

## 0. Mandatory first reference — before every action

`TIGER_OWNER_BINDING_CURRENT.md` is the **first mandatory reference before any action, modification, cleanup, feature, refactor, migration, test change, UI change, policy change, release action, operational action, or architectural decision** in VVIP TIGER.

The mandatory sequence is:

`READ CURRENT OWNER AUTHORITY → IDENTIFY DOMAIN → COMPARE WITH EXISTING STATE → APPLY NEWEST APPROVED RULE → REMOVE CONFLICTING OLD RULE → TEST → REVIEW → MERGE`

No implementation work may intentionally begin from an older specification when a newer approved owner rule exists.

If a proposed action conflicts with this file or another newer `CURRENT_ONLY` authority, the action must stop until it is rewritten to match the newest authority. A conflicting older item is not a fallback and is not preserved inside the current tree.

This preflight is required continuously: if a newer owner decision is issued while work is in progress, the in-progress work must be re-evaluated before continuing.

## 1. Constitution — newest approved decision wins

The newest explicit owner-approved decision is the only operative truth inside its domain.

If an older requirement, document, code path, test, configuration value, schema behavior, route, mock, feature flag, fallback, launch criterion or generated copy conflicts with the newest owner decision, the older item is immediately `SUPERSEDED / NON_OPERATIVE` and must be removed from the current repository tree and every active platform surface.

No active fallback, compatibility layer, hidden copy, trash folder, archive folder, renamed legacy copy, duplicate reference, test fixture or generated artifact may preserve a conflicting older owner rule inside the current platform tree.

**Immediate-disposal rule:** once supersession is proven, the old conflicting item is deleted from the working tree in the same cleanup change. It is not moved to another repository folder and no in-repository recycle bin is retained.

Historical provenance is Git history only. Git history is not an active platform surface and must never feed runtime, tests, current owner indexes, current configuration, release gates or generated product copy. Rewriting Git history is a separate destructive repository-forensics operation and is not required for normal platform cleanup.

## 2. Product timing — no commercial/content lifetime

There is **no owner-approved time lifetime for ordinary posts/listings, publishing access, visibility cards, Pulse grants or purchased visibility balances**.

Therefore the current platform must not enforce or advertise any product rule such as:

- 120-day post/listing lifetime;
- 40-day listing deletion;
- 30-day publishing card;
- monthly publishing subscription cycle;
- activation-card duration controlling organic publication;
- time expiry of purchased Pulse verified-impression value;
- any equivalent days/months timer inherited from superseded product designs.

Organic content remains available according to current status, owner action, moderation, legal/safety policy and explicit archive/delete decisions—not merely because a commercial/content timer elapsed.

**Security/technical TTL exception:** short-lived OTPs, authentication/session tokens, signed URLs, anti-replay windows, caches, temporary quotes and similar security/technical expirations are permitted when they protect the system. They are not product/content lifetimes and must not be presented as such.

## 3. Ordinary publication — one free path

Ordinary compliant publication is not a paid product and has one current path:

`Create/Complete → Preview → Submit for Review → Trusted Review → Publish`

Current rules:

- no publishing subscription;
- no publishing card/catalog;
- no purchased publishing slot;
- no `planId` / `plan_id` prerequisite to ordinary review submission;
- no `entitlementReceipt` / `entitlement_receipt` prerequisite to ordinary review submission;
- no payment/checkout prerequisite to create or submit ordinary content;
- no `requestPublication(...)` contract that binds ordinary publication to a paid visibility entitlement;
- no fixed commercial or weekly posting quota is current authority;
- anti-spam, anti-abuse and safety rate controls may exist as technical/policy protections but must not become a sold publishing quota;
- the current ordinary Marketplace listing media allowance remains a maximum of **7 images** unless a newer explicit owner decision changes it.

## 4. Paid visibility — TIGER Pulse Ring only

The current advertiser-paid product family is **TIGER PULSE RING**.

Current purchasable reference levels:

- `SPARK` — 3 JOD;
- `PULSE` — 10 JOD;
- `SURGE` — 20 JOD.

There is no fourth tier and no effective stacked tier above 20 JOD.

Purchased value is a server-quoted quantity of verified eligible impressions. It is not a publishing permission, publishing slot, organic-post lifetime, guaranteed rank or time-duration product.

Purchased Pulse verified-impression balance has no product-time expiry. It remains until consumed or otherwise lawfully voided/refunded under the current payment policy, or the underlying content becomes ineligible under safety/legal/policy rules.

## 5. Platform transaction boundary

VVIP TIGER connects parties; it is not a party to the underlying buyer/seller or service-provider/beneficiary transaction.

The platform does not provide buyer/seller checkout, escrow, custody, settlement, delivery, warranty execution, transaction guarantee or marketplace transaction commission flow.

Platform-owned financial scope is limited to explicitly approved platform services such as advertising/visibility billing, applicable platform taxes/fees, platform accounting and reconciliation.

## 6. Product identity

The current primary product identity is `SOCIAL_NETWORK_FIRST`.

Marketplace is a module inside the social platform. Pulse is the paid-visibility service. Neither replaces Home/Social Core as the platform's primary identity.

## 7. Current operational authorities

The current operational authorities remain:

- `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — social product authority;
- `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — paid visibility authority;
- `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — cleanup governance;
- `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — protected destructive-disposal/post-launch autonomy gate;
- `TIGER_OWNER_CURRENT_REFERENCE_AR.md` — owner routing page;
- `project-control/authority/authority-registry.v1.json` — machine-readable domain authority graph;
- exact-head repository bytes + matching CI evidence — implementation truth.

## 8. Global anti-legacy rule

The current platform is blocked from release when any active surface restores a superseded owner rule.

At minimum, current runtime/tests/config/current docs must reject:

- legacy fixed four-posts-per-week product quota;
- universal 120-day content lifetime;
- publishing cards/subscriptions/paid slots;
- payment-gated ordinary publication;
- legacy publication entitlement/plan gate;
- timed activation-card control of organic content;
- legacy 45/80/120 JOD current Pulse/product tiers;
- marketplace transaction payment/intermediation;
- duplicate current owner authorities in the same domain;
- any in-tree trash/archive/legacy copy created merely to preserve a superseded conflicting rule.

## 9. Migration and deletion safety

Historical migration files already used to build database state are not rewritten to fake history. Their obsolete effect is neutralized by forward migrations and current-schema verification.

For all other superseded conflicting current-tree material, the default is direct deletion from the current tree after Proof-of-Reclamation. No in-tree trash or archive copy is created.

Destructive deletion remains governed by PHOENIX Proof-of-Reclamation and the AION disposal chain. This safety rule protects data/evidence; it does not authorize keeping a superseded rule active or hidden inside the platform tree.

## 10. Owner acceptance statement

> **This file is the first mandatory reference before every action or modification in VVIP TIGER. Keep only the newest approved owner truth in the active platform. When a newer approved rule supersedes an older conflicting rule, remove the older rule completely from the current tree and every active surface in the same cleanup change. Do not hide it, rename it, move it to an archive/trash folder, or keep it as fallback. Historical provenance is Git history only. There is no product/content duration for posts, listings, publishing access, visibility cards or Pulse verified-impression balances. Ordinary publication is not payment-gated and has no fixed commercial/weekly posting quota. Pulse is separate paid visibility at 3/10/20 JOD.**

# VVIP TIGER Official Product Blueprint

## Current Authority / السلطة الحالية

This document is an important historical/product blueprint, but it is **not the highest authority where later owner decisions exist**. Issue #312 and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` control the current user-to-user/user-to-provider commerce boundary.

Current invariant:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

For advertised goods/services, TIGER does not create orders, run checkout, take buyer/seller/provider payment, hold escrow, negotiate, close, fulfill, settle, or take a transaction-value commission. Historical commission concepts are `HISTORICAL_EVIDENCE_ONLY` with `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`.

Active finance may exist only as `KEEP_PLATFORM_FINANCE` for platform-owned advertising, ad credits/packages, approved platform-owned advertising services, and their own refunds/adjustments/taxes/treasury/accounting, subject to separate gates.

The later owner prohibition on commercial-register/business-registration fields also supersedes any older future-roadmap wording in this blueprint.

## Official Documentation Hierarchy / هرمية التوثيق الرسمية

- Issue #312 + `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` control later discovery/commerce conflicts.
- Current exact repository refs and verified implementation evidence control implementation truth.
- This blueprint remains a product-history/reference source for non-conflicting requirements.
- The Memory Map preserves approved memory, decisions, and execution context.
- The Implementation Checklist is a phased execution plan and cannot override later owner authority.
- Any future change must be documented clearly.

References:
- [Official Product Blueprint](./VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md)
- [Memory Map](./VVIP_TIGER_MEMORY_MAP.md)
- [Implementation Checklist](../IMPLEMENTATION_CHECKLIST.md)
- [Owner Authority Registry](./architecture/OWNER_AUTHORITY_REGISTRY.md)

## Purpose

This document records the official product blueprint that fixed the platform direction before later owner architecture amendments. Non-conflicting product decisions remain useful; conflicting commerce/registration language is superseded as stated above.

## Product Identity

- VVIP TIGER is Jordan-first, Arab-first, premium, and highly organized.
- The experience should be inspired by familiar social product patterns, especially Facebook-style clarity, without copying Facebook brand identity.
- The product should feel formal, trusted, polished, and commercially useful.
- Brand/public naming is presentation metadata and may change without migrating stable core identities.

## Platform Boundaries

- No groups.
- No group chat.
- No broadcast model.
- Sharing and invitations are one-to-one only.
- Each session supports up to 20 invitations.
- External commerce stops at contact handoff; TIGER is not a broker/intermediary.

## Core Technical Decisions

- Clerk is the only authentication system.
- Supabase is the platform database, storage, and operational data layer.
- User linkage across systems must happen through `clerk_user_id`.
- No `service_role` or secret keys may appear in the frontend.
- Any future AI capability must run through backend-only paths such as Backend services or Edge Functions, never through frontend-exposed keys.
- A delayed but mandatory security review is required before production.

## Core Sectors

Historical launch filters included:

- Auto parts and services.
- Materials and supplies.
- Real estate.

These are not a closed permanent ontology. Later sectors/views are additive through shared core/registry contracts and do not replace existing capabilities.

## Sector Governance

Historical sector-governance assignments are provenance only unless a current trusted role/identity contract independently confirms them. No personal or sector label grants authority by itself.

## Posting Rules

Historical launch-content constraints in this blueprint include:

- Each account can publish 4 posts per week.
- Each listing supports 7 images only.
- Video is fully cancelled for this scope.
- Listing lifetime is 120 days.

Later owner/product decisions may supersede these through tested current contracts; this blueprint alone is not runtime evidence.

## Search And Discovery

- Search must support name.
- Search must support price.
- Search must support location/region.
- Search must support sector/view projection.
- Search must support category/facet projections where useful.
- Region and location are core discovery fields.
- Categories are projections and must not become the only source of semantic truth.

## Business Structure Roadmap — Current Interpretation

- User-product commercial-register/business-registration collection is superseded/prohibited by later owner authority and is **not** a future platform field.
- Merchant contracts, buyer/seller checkout, external-deal payments, escrow, settlement, fulfillment, transaction receipts, and transaction-value commissions are **not** future execution phases under Issue #312.
- External negotiation/agreement/payment/delivery occur outside TIGER after contact handoff.
- Platform-owned advertising-service billing, ad credits/packages, advertising campaign services, and their own accounting/refunds may be implemented only through separately approved finance/security/legal/country/Production gates.
- Campaign/discovery intelligence may evolve without converting TIGER into a broker or payment intermediary.

## Tiger Care

- Tiger Care is a core unit for support, tickets, reports, and requests to communicate with management.
- Management phone numbers must never be shown to users.
- Official Tiger Care message: "تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة."

## Delivery Discipline

- Implementation must happen in clear phases.
- Backup before sensitive work is required.
- `git status` must be checked before execution where a local worktree is used.
- Work must happen on a proper branch.
- Changes must be committed in an orderly way.
- No chaotic implementation process is acceptable.
- No blueprint wording may bypass Issue #312, security gates, tests, RLS, or exact-SHA verification.

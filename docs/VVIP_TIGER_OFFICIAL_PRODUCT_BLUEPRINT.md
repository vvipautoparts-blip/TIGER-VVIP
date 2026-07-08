# VVIP TIGER Official Product Blueprint

## Official Documentation Hierarchy / هرمية التوثيق الرسمية

- This file is the highest product reference and the official product constitution.
- The Memory Map is the approved map of memory and decisions.
- The Implementation Checklist is the phased execution plan.
- In case of conflict, priority is: Official Product Blueprint, then Memory Map, then Implementation Checklist.
- Any future change must be documented clearly.

References:
- [Official Product Blueprint](./VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md)
- [Memory Map](./VVIP_TIGER_MEMORY_MAP.md)
- [Implementation Checklist](../IMPLEMENTATION_CHECKLIST.md)

## Purpose

This document defines the official product blueprint for VVIP TIGER and fixes the platform direction before production-scale implementation.

## Product Identity

- VVIP TIGER is Jordan-first, Arab-first, premium, and highly organized.
- The experience should be inspired by familiar social product patterns, especially Facebook-style clarity, without copying Facebook brand identity.
- The product should feel formal, trusted, polished, and commercially useful.

## Platform Boundaries

- No groups.
- No group chat.
- No broadcast model.
- Sharing and invitations are one-to-one only.
- Each session supports up to 20 invitations.

## Core Technical Decisions

- Clerk is the only authentication system.
- Supabase is the platform database, storage, and operational data layer.
- User linkage across systems must happen through `clerk_user_id`.
- No `service_role` or secret keys may appear in the frontend.
- Any future AI capability must run through backend-only paths such as Backend services or Edge Functions, never through frontend-exposed keys.
- A delayed but mandatory security review is required before production.

## Core Sectors

- Auto parts and services.
- Materials and supplies.
- Real estate.

## Sector Governance

- Abdulrahman manages materials.
- Moataz manages auto parts and services with market experts.
- The user and Areen manage real estate.

## Posting Rules

- Each account can publish 4 posts per week.
- Each listing supports 7 images only.
- Video is fully cancelled.
- Listing lifetime is 120 days.

## Search And Discovery

- Search must support name.
- Search must support price.
- Search must support location/region.
- Search must support sector.
- Search must support category.
- Region and location are core discovery fields, not optional metadata.

## Business Structure Roadmap

- Separate companies and commercial registration should be introduced as an organized future phase.
- Merchant contract flows are a future phase and require legal review before activation.
- Payments, verification, and receipts are future phases and require secure backend implementation plus financial and legal review.
- Commissions, campaigns, call center operations, and sales operations are future organized phases.

## Tiger Care

- Tiger Care is a core unit for support, tickets, reports, and requests to communicate with management.
- Management phone numbers must never be shown to users.
- Official Tiger Care message: "تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة."

## Delivery Discipline

- Implementation must happen in clear phases.
- Backup before sensitive work is required.
- `git status` must be checked before execution.
- Work must happen on a proper branch.
- Changes must be committed in an orderly way.
- No chaotic implementation process is acceptable.
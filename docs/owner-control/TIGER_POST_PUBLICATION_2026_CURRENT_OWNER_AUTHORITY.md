# TIGER POST PUBLICATION 2026 — CURRENT OWNER AUTHORITY

**Status:** CURRENT_ONLY — BINDING OWNER PRODUCT AUTHORITY  
**Effective date:** 2026-08-28  
**Domain:** ordinary post/listing creation, review, publication, visibility lifecycle, post limits, media limits, and separation from paid Pulse visibility.

## 1. Single current publication path

TIGER has exactly one current ordinary publication path:

`Create Draft → Select Sector In Post → Complete Post + Images → Preview → Submit for Review → Trusted Review → Published → Browse/Search → Expire after 120 days`

No second publication route, paid publication route, publishing-card route, or fallback publication route is current authority.

## 2. Ordinary publication is not a paid product

Ordinary compliant publishing is free subject to identity, country, sector, content, safety, anti-abuse, media, weekly-limit, and review controls.

The following concepts are **SUPERSEDED / HISTORICAL ONLY** for ordinary publication and must not feed runtime, current tests, UI, generated copy, launch criteria, or current owner indexes:

- publishing cards or purchased publishing slots;
- publishing subscriptions;
- `planId` / `plan_id` as a publication prerequisite;
- `entitlementReceipt` / `entitlement_receipt` as a publication prerequisite;
- visibility-plan entitlement as a gate to `PENDING_REVIEW`;
- payment or checkout as a prerequisite to ordinary post creation or review submission;
- paid posting-quota wallets;
- `requestPublication(...)` semantics that bind ordinary publication to paid visibility.

Historical migrations and Git history may remain as provenance only. Deployed schema retirement must be forward-only and reviewable.

## 3. Current post limits

The binding ordinary-post limits are:

- maximum **4 successfully published posts in a rolling 7-day window per account**;
- maximum **7 images per post**;
- **video is not allowed** in the current ordinary-post contract;
- each successfully published post has a visibility lifetime of **120 days from its trusted publication timestamp**;
- editing does not reset or extend the 120-day lifetime unless a later explicit owner authority changes that rule.

Rejected drafts do not consume the weekly publication limit because the limit is counted from successful trusted publication time.

## 4. Post creation contract

Each post owns its own sector selection and structured data. The creation experience must keep the current product rule of predominantly structured choices with a bounded free-text description.

A draft remains private until submitted and approved. Submission for review must not purchase visibility or reserve a Pulse grant.

Current media processing remains fail-closed: only supported trusted image derivatives may reach canonical publication media; a post cannot bypass media finalization or trusted review.

## 5. Review and visibility lifecycle

Trusted review is the only transition that may make an ordinary post publicly active.

On approval:

- `published_at` is set by the trusted server/database path;
- `expires_at` is set to `published_at + 120 days`;
- the weekly publication limit is enforced server-side atomically before activation;
- public discovery may expose the post only while it is active and not expired.

Expiration must remove the post from public Feed/Search/Discovery visibility even if a background archival job has not yet changed the stored status.

## 6. Pulse separation

TIGER Pulse Ring is a separate paid visibility service for an already eligible listing/post.

Pulse may purchase verified eligible impressions according to `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`, but Pulse:

- does not grant permission to create a post;
- does not buy a publishing slot;
- does not bypass review, safety, relevance, trust, weekly limits, sector rules, or the ordinary 120-day post lifecycle;
- must not be called from the ordinary `Submit for Review` contract.

## 7. Communication and sharing boundary

Post communication remains individual and controlled. No group rooms, broadcast publication, or group-share authority is introduced by this document.

## 8. Implementation supersession rule

Any active code, test, fixture, smoke check, current document, or schema function that requires a paid publication plan/entitlement for ordinary publication is conflicting current authority and must be retired or rewritten through the normal protected migration process.

Historical design documents may remain only as historical evidence and must not be treated as current product truth.

## 9. Non-negotiable implementation invariants

- no direct write to `main`;
- no Production mutation merely to satisfy this document;
- no destructive rewrite of historical migrations;
- use forward migrations for deployed-schema changes;
- preserve Clerk/RLS/authorization/media-security/fail-closed controls;
- preserve Pulse paid-visibility infrastructure where it belongs to Pulse rather than ordinary publication;
- exact-head tests must prove the old publication gate is absent from active runtime authority.

## 10. Owner acceptance statement

> **Use only the latest TIGER post rules. Ordinary publication follows one free review-controlled path, with 4 successfully published posts per rolling 7 days per account, up to 7 images, no video, and 120 days of public lifetime. Paid cards, paid publishing slots, plan/entitlement publication gates, payment-gated review submission, and the old requestPublication path are abolished from current ordinary-publication authority. Pulse remains separate paid visibility and never becomes a publication prerequisite.**

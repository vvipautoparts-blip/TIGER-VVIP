# PR35 Security Threat Model

## Overview

PR35 adds authorization and operational support surfaces to a static browser application authenticated by Clerk with future Supabase trusted enforcement. High-value assets are owner authority, permission assignments, private profiles, user-isolated tickets, internal notes, immutable audit history, routing/SLA integrity, and credentials. Browser policy is never authoritative.

## Threat Model, Trust Boundaries, and Assumptions

Trust boundaries are: user/browser to Clerk identity; browser to future Supabase/RPC/RLS; normal user to staff; staff to higher authority; one operational scope to another; online trusted operations to offline local state; and runtime source to review-only SQL. Inputs from DOM, URL, storage, network responses, ticket text, actor claims, clock values, and IDs are attacker-controlled until validated. Owner-approved configuration and reviewed SQL are operator-controlled; source and tests are developer-controlled.

Invariants: default deny; no self-elevation; only owner can manage owner role; no grant beyond held permission or scope; inactive assignments grant nothing; protected writes require trusted online enforcement and reasons where sensitive; internal notes never reach users; tickets are requester-isolated; audit events cannot be updated/deleted; missing configuration fails closed; no secret or token enters logs/cache.

## Attack Surface, Mitigations, and Attacker Stories

- A user edits local role state: ignored by trusted decisions; local policy is UX only.
- Staff crafts broader sector/region/team scope: normalized containment and trusted recheck deny it.
- A manager delegates equal/higher authority: delegation ceiling and owner-only invariant deny it.
- A user requests another ticket ID: RLS/RPC requester isolation is required; UI filtering is insufficient.
- Ticket text carries HTML or `__proto__`: text-only rendering, bounded normalization, and dangerous-key rejection prevent XSS/prototype pollution.
- Offline replay duplicates a request: idempotency/deduplication bounds normal-user submissions; privileged operations are not queued.
- Audit history is altered: append-only SQL privileges/RLS, chained event hashes, and verification expose mutation.
- Sensitive diagnostics are smuggled under variant field names: audit metadata rejects token, secret, password, authorization, cookie, JWT, session, and API-key name variants; runtime PR35 modules contain no console logging sink.
- Internal notes leak through cache or response mapping: separate repository method/projection, forbidden caches, and contract tests.
- Missing transport silently uses local storage: production adapter returns `CONFIGURATION_REQUIRED`.
- Timing/retry storms amplify load: cancellation, pagination, timeout, capped attempts, jitter, and dedupe.

Out of scope for this PR: compromise of Clerk or Supabase infrastructure, production deployment, email provider delivery, payments, and physical insider coercion. These do not relax application controls.

## Severity Calibration

- Critical: owner-role takeover, cross-tenant ticket/internal-note extraction at scale, service-role exposure, or bypass enabling arbitrary permission grants.
- High: cross-scope staff actions, audit deletion/rewriting, unauthorized escalation or account-sensitive operation, stored XSS in operational views.
- Medium: bounded same-user ticket duplication, SLA manipulation without authority gain, limited operational metadata exposure, denial of one queue.
- Low: non-sensitive UI-state inconsistency, inaccessible focus with no confidentiality/integrity impact, or public-cache staleness within bounds.

Repository: TIGER-VVIP-PR35-OWNER-CONTROL
Version: c71ecbddd00d91f5ee5414e86e74cbbbdb168d84

Residual boundary: browser assignments, preview data, and client policy never establish production authority. The current production adapters are deliberately unconfigured and deny protected operations.

# VVIP TIGER COST-02 — Static/CDN Optimization Design

## Status

Approved for implementation under the standing owner authorization to continue VVIP TIGER Global Launch Finalization without routine approval round-trips. This design is non-production and does not authorize deployment, paid infrastructure, provider purchases, Production database mutation, or Production Edge changes.

## Goal

Reduce repeated static-asset origin/CDN requests and preserve a fast global browser shell without allowing cached content to cross authentication, navigation, API, data, or security boundaries.

## Core Architecture — Dual-Lane Static Delivery

VVIP TIGER uses two explicit delivery lanes:

1. **STATIC SHELL lane** — same-origin, GET-only, non-navigation files from allowlisted static directories and safe static extensions may use a bounded browser service-worker cache.
2. **LIVE / TRUSTED lane** — HTML navigations, Clerk, cross-origin dependencies, APIs, JSON/data, authentication, database traffic, mutations, and any non-GET request are never intercepted or cached by COST-02.

The service worker is therefore a static delivery accelerator, not an offline application runtime and not an authority layer.

## Runtime Contract

### Cacheable request requirements

A request is eligible only when all conditions hold:

- method is `GET`;
- URL origin exactly matches the current application origin;
- request is not a navigation and destination is not `document`;
- pathname is inside the active Service Worker scope and then under one of: `/styles/`, `/scripts/`, `/workers/`, `/icons/`;
- extension is one of: `.css`, `.js`, `.mjs`, `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.woff2`;
- request URL contains no credential-bearing username/password component.

The scope-relative rule supports both root deployments and subpath deployments such as GitHub Pages without accidentally caching files outside the application scope.

### Never-cache classes

COST-02 must fail closed for:

- `.html`, `.json`, `.webmanifest` and document navigations;
- Clerk and every other cross-origin request;
- Supabase/API/auth/payment/AI routes;
- requests escaping the current Service Worker scope;
- `POST`, `PUT`, `PATCH`, `DELETE`, and other non-GET methods;
- responses with `Cache-Control: no-store`, `private`, or `no-cache`;
- partial responses (`206`) and non-success responses;
- opaque/cross-origin responses.

## Bounded Freshness

Static responses are cached with a VVIP-owned timestamp header added only to the cached copy. A cached response is considered fresh for a bounded TTL of **60 minutes**.

Behavior:

- fresh cached static asset -> return cache immediately without an origin request;
- stale/missing cached static asset -> fetch network, validate response, refresh cache, return network response;
- network failure with stale cached static asset -> return the stale static asset as a resilience fallback;
- network failure without cached asset -> propagate the fetch failure.

This avoids unbounded stale code while still suppressing repeated static traffic during active sessions and repeat visits.

## Security Boundary

The worker must never become a session/auth proxy. It does not inspect tokens, does not read cookies, does not modify authorization headers, does not cache HTML, does not cache API responses, and does not synthesize successful responses for trusted/data routes.

Security evidence always overrides cost optimization.

## Registration Boundary

A small browser runtime module registers `sw-vvip-static.js` only when Service Worker is supported. Registration failure is non-fatal and produces only the generic diagnostic marker `VVIP_STATIC_DELIVERY_REGISTRATION_FAILED`; no URL, token, credential, or raw error object is logged.

The existing shared `scripts/vvip-pr30-resilience.js` layer bootstraps this runtime exactly once. Both primary entry pages already load PR30 Resilience, so COST-02 avoids duplicate HTML edits and keeps one registration path for marketplace and private-profile entry. The registration runtime handles both pre-load and already-loaded document states.

## Cache Lifecycle

Cache namespace: `vvip-static-v1`.

Activation deletes only older caches whose names start with the VVIP static-cache prefix. It must not delete unrelated browser caches.

## Provider Neutrality

COST-02 does not bind VVIP TIGER to Cloudflare, AWS, Netlify, Vercel, Supabase hosting, or another commercial delivery provider. The browser optimization works above any standards-compliant HTTPS static origin.

Provider pricing and provider-specific edge/header configuration remain separate future evidence-driven decisions.

## TDD / Verification

Permanent Node contract tests must prove:

- allowed static request examples are accepted at root and scoped deployments;
- navigation, HTML, API, JSON, auth, scope-escape, cross-origin, credentialed URL and non-GET requests are rejected;
- response cacheability is fail-closed;
- cache freshness is bounded to 60 minutes;
- the registration runtime is Node-testable and handles an already-loaded page;
- shared PR30 Resilience bootstraps the registration runtime exactly once;
- both primary entry HTML files load PR30 Resilience exactly once;
- VVIP Quality Gate executes the contract automatically because it runs all `tests/*.test.cjs` tests.

## Files

Implementation scope:

- `sw-vvip-static.js` — service-worker policy and runtime;
- `scripts/runtime/vvip-static-delivery.js` — resilient registration boundary;
- `scripts/vvip-pr30-resilience.js` — one shared bootstrap insertion point;
- `tests/lean-static-delivery.test.cjs` — TDD contract;
- `.github/workflows/vvip-quality-gate.yml` — exact branch CI trigger only;
- this design and its implementation plan.

No entry HTML file needs a COST-02-specific edit because both required entry pages already load the shared PR30 Resilience layer.

## Hard Boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `PRODUCTION_DEPLOY=NOT_AUTHORIZED`
- `REAL_CHARGES=NOT_AUTHORIZED`
- `PROVIDER_PURCHASES=NOT_AUTHORIZED`
- no secrets or provider credentials
- no weakening of security/quality gates
- no claim of global Production readiness solely from COST-02

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
- pathname is under one of: `/styles/`, `/scripts/`, `/workers/`, `/icons/`;
- extension is one of: `.css`, `.js`, `.mjs`, `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.woff2`;
- pathname is not under an explicit deny prefix;
- request URL contains no credential-bearing username/password component.

### Never-cache classes

COST-02 must fail closed for:

- `.html`, `.json`, `.webmanifest` and document navigations;
- Clerk and every other cross-origin request;
- Supabase/API/auth/payment/AI routes;
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

A small browser runtime module registers `/sw-vvip-static.js` only when Service Worker is supported. Registration failure is non-fatal and produces only a generic diagnostic marker. Application behavior must remain functional without Service Worker support.

The registration module is loaded by the primary marketplace entry points so direct entry to the public marketplace or private profile can establish the same static acceleration scope.

## Cache Lifecycle

Cache namespace: `vvip-static-v1`.

Activation deletes only older caches whose names start with the VVIP static-cache prefix. It must not delete unrelated browser caches.

## Provider Neutrality

COST-02 does not bind VVIP TIGER to Cloudflare, AWS, Netlify, Vercel, Supabase hosting, or another commercial delivery provider. The browser optimization works above any standards-compliant HTTPS static origin.

Provider pricing and provider-specific edge/header configuration remain separate future evidence-driven decisions.

## TDD / Verification

Permanent Node contract tests must prove:

- allowed static request examples are accepted;
- navigation, HTML, API, JSON, auth, cross-origin, credentialed URL and non-GET requests are rejected;
- response cacheability is fail-closed;
- cache freshness is bounded;
- both required entry HTML files load the registration runtime;
- VVIP Quality Gate executes the contract automatically because it runs all `tests/*.test.cjs` tests.

## Files

Expected implementation scope:

- `sw-vvip-static.js` — service-worker policy and runtime;
- `scripts/runtime/vvip-static-delivery.js` — resilient registration boundary;
- `tests/lean-static-delivery.test.cjs` — TDD contract;
- `index.html` — register static-delivery runtime;
- `private-profile-p03.html` — register static-delivery runtime;
- `.github/workflows/vvip-quality-gate.yml` — exact branch CI trigger only;
- this design and its implementation plan.

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

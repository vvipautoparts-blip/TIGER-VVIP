# PR35 Architecture and Data Flow

## Runtime boundary

`index.html` remains the canonical marketplace entry and is unchanged by the current PR35 implementation. `private-profile-p03.html` is the integrated account entry and lazily boots Tiger Care and owner actions. `owner-control.html` is a new protected view. Redirect shims and archived files remain unchanged.

## Layers

1. Views emit typed intents and render inert state.
2. Controllers validate identity/context and call pure domain policy.
3. Domain modules return deterministic results without storage or DOM access.
4. Operational adapters enforce environment behavior.
5. The future trusted Supabase/RPC/RLS boundary re-evaluates every protected decision.

```text
listing/account/owner view
        | bounded intent
        v
controller -> sanitize -> policy/scope/ticket/routing/SLA
        |                         |
        | denied                  +-> audit input
        v
adapter(mode=local|production) -> configured trusted transport (future)
        |
        +-> explicit pending/sent/failed UI
```

Production missing config returns `CONFIGURATION_REQUIRED`. Privileged writes fail offline. The queue primitive accepts only sanitized normal-user ticket submissions in session storage; the current UI does not silently queue them. User ticket reads exclude internal notes and filter by requester at both the local projection and future trusted boundary.

## Sensitive action flow

Identity -> active assignment resolution -> permission match -> scope containment -> delegation ceiling -> reason validation -> trusted write -> immutable audit append -> confirmed result. Failure at any stage denies the operation; the UI never advances optimistically.

## Tiger Care flow

Input -> normalize/sanitize -> validate category/priority/body -> idempotency -> adapter submission -> receipt. Confirmation copy appears after accepted local modeling or a confirmed remote receipt. Email state is independent and is never inferred.

## Caching

Allowed: translation assets and session-scoped sanitized user drafts. Forbidden: tokens, secrets, internal notes, permission payloads, privileged ticket projections, audit metadata, and owner console data. The current service worker does not precache `owner-control.html` or PR35 operational payloads.

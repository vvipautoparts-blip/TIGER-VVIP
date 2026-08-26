# TIGER P0 Operational Feed Resilience Plan

## Goal

Close the combined offline/retry and keyset pagination/infinite-scroll delivery gap without introducing a browser mutation queue or weakening database authorization.

## Contract

- Feed reads detect an explicitly offline browser before any transport call.
- Initial and subsequent transient reads use the same bounded 250/500 ms retry schedule and the same request/cursor.
- Rate limits, stale cursors, inactive sessions, and offline state are never auto-retried as generic transport failures.
- Existing posts remain visible when a later page fails; the keyboard load-more fallback becomes an accessible retry control.
- The mounted controller observes `offline` and `online`: offline pauses transport, online performs one clean first-page reconnect.
- Pagination remains server-authoritative keyset pagination; IntersectionObserver is enhancement-only and the explicit button remains available.
- No post/comment/reaction mutation is queued in localStorage, IndexedDB, or a service worker.

## Verification

1. RED controller tests for initial offline denial, initial bounded retry, preserved pagination state, and online reconnect.
2. Existing feed/controller/read-model tests remain GREEN.
3. Full isolated VVIP Quality Gate passes.
4. Exact-head TIGER Social DB Rehearsal remains GREEN on the same SHA.

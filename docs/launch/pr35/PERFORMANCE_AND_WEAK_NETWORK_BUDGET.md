# PR35 Performance and Weak-Network Budget

| Budget | Limit |
|---|---:|
| Immediate pressed/pending feedback | within next animation frame |
| Search debounce | 250 ms |
| Default/max page size | 20 / 50 records |
| Operational request timeout | 8,000 ms |
| Retry attempts | max 3 total |
| Backoff cap | 2,000 ms with full jitter |
| Cached operational pages | 0 privileged pages |
| Queued privileged commands | 0 |
| Queued normal-user submissions | max 20/session, max 64 KiB total |
| Ticket subject/body | 120 / 2,000 Unicode characters |
| Layout shift target | CLS <= 0.10 in manual Lighthouse evidence |
| Initial PR35 bootstrap on private profile | 2.2 KiB source; controllers load on matching surfaces |
| Complete PR35 source foundation | 87,326 bytes including HTML and CSS; not all loaded per route |

All searches cancel superseded work. Pagination is cursor-based at the adapter contract. Dedupe uses a session-bound idempotency key. Retries apply only to idempotent reads or confirmed idempotent submissions and never to authorization/admin writes. Safe public reads may cache with an explicit TTL; secrets, notes, permissions, tickets, and owner projections may not. Owner/Care controllers load only when their matching DOM surface exists. Reduced motion collapses non-essential animation durations. Stable skeleton dimensions prevent avoidable layout shift. No Lighthouse or real-device CLS measurement is claimed in this preliminary pass.

Weak-network UX provides app shell, clear state, cancellation, preserved safe draft input, and bounded recovery. It does not claim to make a disconnected network fast.

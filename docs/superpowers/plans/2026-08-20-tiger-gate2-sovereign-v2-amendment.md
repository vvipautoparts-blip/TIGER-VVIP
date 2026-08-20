# Gate 2 Sovereign v2 Amendment

**Authority:** TIGER SOVEREIGN RELEASE CONSTITUTION 2026 — Master Standard v2.0.

This amendment supersedes weaker Gate 2 plan/spec details wherever they conflict.

## Mandatory invariants

1. `reserve_upload` accepts only `post_id + idempotency_key`; browser metadata is never canonical authority.
2. Reservation creates an opaque `quarantine/{owner}/{media}.blob` path and a TIGER acceptance lease of 300 seconds. Provider token expiry is not claimed as 300 seconds unless independently rehearsed.
3. Source envelope: actual downloaded bytes `1..15 MiB`; JPEG/WebP must be identified from magic bytes before decode. Resource limits include width/height and a maximum decoded pixel count.
4. Trusted processing runs server-side with ImageMagick WASM supported by Supabase Edge Functions. It auto-orients, removes embedded profiles, normalizes/crops/resizes, and writes a new JPEG artifact exactly `1600x1200`.
5. SHA-256 is computed independently for source bytes and the newly encoded canonical bytes.
6. Canonical storage uses `canonical/media/<digest-prefix>/<media-id>.jpg`, `upsert=false`, and a DB-derived/verified expected path.
7. Canonical READY transition atomically inserts an immutable Media Passport containing source/canonical digests, canonical MIME/bytes/dimensions, verifier identity/version, post/owner binding, and verification timestamp.
8. Quarantine is deleted only after canonical upload + DB finalization succeed. Canonical upload is compensating-deleted when DB finalization fails, preventing orphan promotion.
9. Upload-completion ingress is idempotent. Claim uses `FOR UPDATE SKIP LOCKED`. Retry uses exponential backoff with bounded random jitter; fifth failed attempt becomes `DEAD_LETTER`.
10. Expired leases fail closed and quarantine is purgeable. No public storage authority is introduced.
11. Browser roles have no direct INSERT/UPDATE/DELETE authority on assets, passports, read grants, or webhook inbox.
12. Gate closure requires static contracts, local DB/Edge rehearsal, security review, exact-SHA workflow evidence, P0=0, P1=0, and zero unresolved review threads.

## Execution order

`RED contracts -> DB authority -> upload-ticket -> trusted byte finalizer -> local functional fixtures -> DB/Edge rehearsal -> security review -> Exact-SHA evidence -> parent-branch merge only`

No Production, `main`, remote Production database, or real-user storage mutation is authorized by this amendment.

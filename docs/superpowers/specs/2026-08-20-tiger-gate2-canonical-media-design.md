# TIGER Gate 2 Canonical Social Media Authority Design

**Status:** Owner-approved implementation specification for Gate 2.

**Base exact SHA:** `8470d34a1f4d593daef1b75ed7f906d829cd4307`

## Objective

Close Media & Social Boundary Security without touching `main`, Production, remote databases, or real-user storage. The gate is complete only when requirement, code, tests, local DB rehearsal, evidence, exact SHA, and sign-off agree.

## Security invariants

1. The browser is never canonical authority for MIME type, byte size, image dimensions, SHA-256, canonical path, or verifier identity.
2. Upload reservation accepts only `post_id` and an idempotency key. It derives the current actor server-side and binds the reservation to a post owned by that actor.
3. The browser receives a signed upload capability for exactly one server-derived private source path. It does not receive table write privileges.
4. The source object path is opaque and extension-neutral. Any client-supplied `Content-Type`, filename, extension, dimensions, digest, or size is advisory/untrusted and never copied into canonical fields.
5. A trusted finalizer fetches the uploaded bytes using service authority, enforces the 5 MiB limit from the actual byte stream, recognizes JPEG/WebP from magic bytes, parses actual dimensions, computes SHA-256, and only then calls the service-role finalization RPC.
6. Canonical facts are append/transition controlled: browser roles cannot insert/update/delete media rows or finalization events directly.
7. Social read authorization delegates to the existing `vvip_social_can_view_post` block/privacy authority and yields only short-lived signed read capability.
8. External/finalizer event ingress is idempotent. Same key + same payload is a replay; same key + different payload is a hard conflict.
9. Work claiming uses `FOR UPDATE SKIP LOCKED`; failures use bounded exponential backoff and transition to `DEAD_LETTER` after the configured maximum.
10. All service-role functions use explicit `SECURITY DEFINER` search paths and are revoked from `public`, `anon`, and `authenticated` unless intentionally exposed.
11. Migration filenames are forward-only and unique; no timestamp collision with PR #286/#287 migrations.

## Components

### Database authority

Create `supabase/migrations/20260820002000_social_media_canonical_authority.sql` with:

- private bucket `social-private-media`, 5 MiB object limit, JPEG/WebP allow-list as storage-envelope defense only;
- `vvip_social_media_assets` containing ownership, post binding, idempotency key, opaque source path, state, canonical evidence, retry state, and error evidence;
- `vvip_social_media_read_grants` for hashed, one-time, short-lived read grants;
- `vvip_social_media_webhook_inbox` for idempotency, claiming, retry schedule, completion, and dead-letter state;
- authenticated RPC `vvip_social_media_reserve_upload(uuid,text)` with no metadata parameters;
- authenticated RPC `vvip_social_media_request_read(uuid)`;
- service-only RPCs for signed-upload ticket lookup/transition, canonical finalization, webhook accept/claim/complete/fail, and read-grant consumption.

The DB never trusts a browser-provided media fact. It only records canonical facts through service-only finalization.

### Signed upload function

Create `supabase/functions/social-media-upload-ticket/index.ts`.

- keep platform JWT verification enabled;
- construct a caller-scoped Supabase client from the incoming `Authorization` header;
- call `vvip_social_media_reserve_upload(post_id,idempotency_key)` so RLS/actor identity remains authoritative;
- use a service-role storage client only after the RPC returns a server-derived path;
- call `createSignedUploadUrl(path, { upsert: false })` for the private bucket;
- return `media_id`, `path`, and the signed upload token/URL only; never accept or echo canonical metadata.

### Trusted finalizer

Create `supabase/functions/social-media-finalizer/index.ts` as service-to-service only.

- authenticate with a dedicated service secret; do not accept a user JWT as privileged authority;
- claim one due event/work item at a time using a service-only RPC with `SKIP LOCKED`;
- download the source object with service authority;
- enforce actual length `1..5 MiB`;
- identify JPEG/WebP using magic bytes, not request headers or filename;
- parse dimensions from the actual JPEG/WebP structure and enforce width `320..4096`, height `240..4096`;
- compute SHA-256 with Web Crypto;
- derive canonical path from owner/post/media/type server-side;
- persist canonical evidence only through the service-only finalization RPC;
- on transient failure, schedule exponential retry; on exhaustion, dead-letter with bounded error code.

No remote deployment is part of Gate 2; CI/local rehearsal proves the repository artifact first.

## Retry policy

Maximum attempts: 5. Backoff from the persisted attempt count: 30s, 2m, 8m, 32m; attempt 5 transitions to `DEAD_LETTER`. The DB computes `next_attempt_at`, so worker clocks cannot choose an arbitrary retry schedule.

## Tests and evidence

1. Static Node contracts prove signatures, revokes/grants, no browser metadata parameters, private paths, magic-byte inspection, hashing, dimension parsing, and bounded retry/DLQ.
2. Local Supabase SQL rehearsal resets the database from repository migrations and proves owner binding, direct-table denial, idempotency replay/conflict, current privacy checks, work claiming, backoff, canonical finalization, and dead-letter behavior.
3. Dedicated GitHub Action checks out the exact PR head SHA, rejects remote Supabase credentials, runs static contracts, resets an isolated local stack, runs SQL behavior proof, uploads evidence, and verifies source immutability.
4. Existing `VVIP Quality Gate`, CleanGuard, zero-residue, project-control, social privacy rehearsal, and exact-SHA evidence must remain green on the same head SHA.
5. Gate 2 sign-off requires no unresolved P0/P1 security review finding.

## PR convergence policy

PR #286 and PR #287 are design inputs only. The unified Gate 2 branch is based on the current verified Privacy Proof SHA, uses a new migration timestamp, keeps #286's stronger trust boundary, imports #287's queue/idempotency/retry concepts, and removes all client-authoritative media metadata.

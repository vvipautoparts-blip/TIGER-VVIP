# PR34 Hour 1 — Listing Contract Implementation Plan

Date: 2026-07-14
Scope lock: contract, local adapter, remote-ready interface, tests, gate, and evidence only

## Execution sequence

1. Read repository instructions, owner-control references, roadmap, and merged PR29–PR33 artifacts.
2. Add failing/behavioral tests for numeric normalization, validation, sanitization, deterministic errors, images, idempotency, ownership, and pagination.
3. Implement a focused canonical contract in `scripts/listing/listing-contract.js`.
4. Implement the repository boundary and volatile local adapter in `scripts/listing/listing-repository.js`.
5. Add `scripts/qa-pr34-hour1.sh` with syntax, behavior, security, scope, whitespace, and PR33 regression checks.
6. Run the PR34 gate, PR33 smoke/accessibility checks, and `git diff --check`.
7. Review the final diff for scope, secrets, persistence, remote commands, and accidental production integration.
8. Record executed commands and exact outcomes in Hour 1 QA evidence and final report.

## TDD cases

- Arabic-Indic, Eastern Arabic/Persian, and English price input normalize consistently.
- Empty, malformed, zero, negative, exponent, and excessive-precision prices fail.
- Invalid sectors, cross-sector categories, and unknown statuses fail.
- HTML, script, style, SVG, event-handler, control-character, and nested-attribute payloads cannot survive as executable markup.
- Error arrays are deterministic and use canonical field ordering.
- Image metadata is capped, uniquely identified, contiguous, ordered, and cover-referenced.
- Repeated create and update keys return the original result without duplicate mutation.
- Repository access is owner-scoped and pagination remains in bounds.
- The future remote adapter remains fail closed and performs no network work.

## Out of scope

- UI wiring or changes to PR29–PR33 runtime behavior.
- Image selection, upload, crop, compression, thumbnails, storage, or seven-photo processing.
- SQL, migrations, policies, storage buckets, RPC, edge functions, or remote commands.
- Production Supabase or Clerk configuration.
- Publishing entitlement, weekly quota enforcement, expiration jobs, moderation, search indexing, or payment.

## Exit gate

PASS requires every invoked syntax check, focused test, PR33 regression check, static security guard, and whitespace check to exit zero. Any failure produces FAIL with the exact command and blocker; no success is inferred from unexecuted checks.

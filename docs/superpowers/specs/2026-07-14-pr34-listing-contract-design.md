# PR34 Hour 1 — Canonical Listing Contract Design

Date: 2026-07-14
Branch: `feat/pr34-listing-persistence-runtime`
Status: implementation specification for owner review

## Goal

Define a small, deterministic Listing domain boundary that can serve the existing static create-listing experience now and a separately approved Supabase adapter later. This hour does not connect the UI or any remote system.

## Approved product rules preserved

- Arabic-first, mobile-first VVIP TIGER remains a listing-centered marketplace.
- Canonical sectors are `automotive`, `materials`, and `real-estate`.
- Every listing has a sector category, positive price, location, concise description, and structured sector attributes.
- The lifecycle is `draft`, `ready`, `published`, `paused`, `expired`, or `deleted`.
- A listing may describe at most seven ordered images. This contract stores metadata only.
- Publishing permissions remain outside this contract and must be enforced by an authenticated server boundary in a future phase.
- No payment, upload, image processing, SQL, migration, Clerk mutation, or production Supabase operation is included.

## Canonical record

The schema version 1 record contains:

- Identity: `listingId`, `ownerClerkUserId`, `idempotencyKey`, `schemaVersion`.
- Classification: `sector`, `category`.
- Content: `title`, derived `normalizedTitle`, sanitized `description`.
- Price: positive `numericPrice` with up to two decimal places and an ISO-style three-letter `currency`.
- Location: `country`, `city`, `area`.
- Sector data: a bounded flat `sectorAttributes` object containing only string, finite number, or boolean values.
- Lifecycle: `status`, `createdAt`, `updatedAt`, nullable `publishedAt`, nullable `expiresAt`.
- Media metadata: ordered `images` and nullable `coverImageId` referencing an image in that array.

Each image metadata entry has `imageId`, zero-based `position`, sanitized `altText`, `mimeType`, and optional integer `width`, `height`, and `sizeBytes`. URLs, blobs, data URLs, object URLs, processing state, and upload credentials are deliberately excluded.

## Validation and normalization

- Arabic-Indic and Eastern Arabic/Persian digits normalize to ASCII digits.
- Arabic decimal and thousands separators normalize with English separators.
- Price accepts plain decimal notation only, is greater than zero, has at most two fractional digits, and stays within a safe bounded maximum.
- Sector and category use fixed allowlists derived from the owner product taxonomy.
- Text is Unicode-normalized; dangerous element blocks, tags, angle brackets, control characters, and surplus whitespace are removed.
- Structured attribute keys and values are bounded and nested values are discarded.
- Validation errors are stable objects ordered by canonical field order: `{ field, code, message }`.
- Image IDs are unique, positions must be contiguous from zero, image count is capped at seven, and the cover must belong to the image set.

## Repository boundary

`ListingRepository` defines asynchronous `create`, `update`, `getById`, and `list` operations. `SupabaseListingRepository` is intentionally a fail-closed interface placeholder with no client, URL, query, credential, or network command.

`LocalListingRepository` is a volatile in-memory development adapter. It does not use browser storage, files, cookies, logs, or network access. Reads and updates require the matching Clerk owner ID. Returned values are cloned to prevent callers mutating repository state.

Create idempotency is scoped by owner and idempotency key. Update idempotency is scoped by owner, listing, and idempotency key. A repeated operation returns the first completed result. Listing identity, owner identity, and creation time are immutable during update.

Pagination accepts a nullable opaque cursor and a requested limit. Limits default to 20, clamp to 1–50, and return `{ items, nextCursor, limit }`. The local cursor is the last listing ID; a remote implementation may use an opaque server cursor without changing the interface.

## Security and fallback

- The local adapter is explicitly development-only and volatile.
- Owner filtering fails closed.
- No authorization claim is made for the future remote adapter; server-side identity, ownership, policies, and rate limits remain required.
- No secret-like value or authentication material is persisted or logged.
- Invalid data fails with deterministic validation details; an unconfigured remote adapter fails explicitly.

## Rollback

Remove only the new PR34 contract, repository, tests, gate, and PR34 documents. No existing runtime or data files require reversal.

# V13.1 Media-First Payload Foundation Design

## Status

Owner-delegated approved architecture for the first media control-plane slice stacked above PR #126.

This design is implementation-authoritative for the pure-contract foundation only. It does not create or alter a Supabase bucket, apply a migration, deploy an endpoint, introduce credentials, connect to a remote database, generate a production signed URL, or activate production media delivery.

## Executive Decision

TIGER-VVIP will not extend the legacy `vvip_listings.images` JSONB field into a production media backend.

Media becomes an independent control plane with immutable asset and derivative manifests, explicit listing bindings, private-by-default storage, trusted upload orchestration, country-sealed placement, and bounded media-first read payloads.

The existing PR36 browser processor remains the trusted client-side preprocessing boundary. The original user-selected camera or filesystem file does not leave the browser in this architecture. PR36 produces a validated JPEG or WebP 4:3 ingress artifact, and only that bounded artifact may enter private quarantine.

## Problem Statement

The current repository contains useful but incomplete foundations:

- PR36 validates JPEG, PNG, and WebP sources locally, limits a listing to seven photos, and produces bounded 4:3 JPEG or WebP derivatives.
- PR32 persists sanitized image metadata locally.
- PR34 models listing image metadata inside the listing aggregate and exposes a local repository with a visible listing-ID cursor.
- Global V1 stores listing images in a JSONB column and historically gives `country_code` an implicit Jordan default.
- P08 defines six private-by-default storage buckets, but the package remains design-only.

These foundations are not sufficient for a global multi-tenant media runtime because they do not establish:

- immutable media identity;
- content hashes;
- server-authored object references;
- quarantine and promotion states;
- derivative purpose and revision;
- transactional listing-media bindings;
- country-sealed storage placement;
- role-aware media disclosure;
- bounded media-first feed payloads;
- opaque delivery references;
- storage compensation and orphan cleanup semantics.

## Goals

1. Preserve the exact global limit of seven photos per listing.
2. Keep video disabled.
3. Keep original user-selected source files on the user device.
4. Accept only the PR36 validated 4:3 ingress artifact into quarantine.
5. Separate media metadata from listing business data and object bytes.
6. Make every media identity, object reference, country context, and lifecycle state server-authored or server-verified.
7. Make private storage the default for both quarantine and processed media.
8. Prevent storage paths, raw object references, credentials, and reusable signed URLs from entering client-authored payloads.
9. Produce media-first listing cards with one primary visual and minimal semantic text.
10. Enforce a maximum of 50 cards and 128 KiB per page.
11. Keep authorization-sensitive metadata out of unpartitioned shared caches.
12. Preserve accessibility through bounded alt text and semantic title, price, and location fields.
13. Remain fail-closed until a real server adapter, reviewed migration, country seal, and release gate are independently approved.

## Non-Goals for This Slice

The pure-contract foundation does not:

- upload bytes;
- read browser files;
- call Supabase Storage;
- create signed URLs;
- create a CDN configuration;
- create database tables;
- apply RLS policies;
- migrate legacy JSONB rows;
- deploy an image-processing worker;
- publish a listing;
- implement video;
- infer legal entity, tax, residency, or country values;
- activate any production path.

## Architectural Invariants

### Media Limit

A listing contains zero to seven ordered media bindings. Position is an integer from 0 through 6. A non-empty set has exactly one cover binding. No price, package, role, or country may increase the limit.

### No Implicit Country

Country code is never defaulted. Any operation that requires storage placement or publication must receive a trusted country context derived from the active country seal. A missing country context fails closed.

### Private by Default

Both quarantine and processed media remain private. Public listing visibility does not make the underlying bucket public.

### Original Source Stays Local

The user-selected source file is validated and decoded by PR36 locally. Only the safe PR36 ingress derivative may be uploaded. EXIF, original filename, raw metadata, and original bytes do not enter the media control plane.

### Server-Authored Object Identity

The client cannot choose:

- bucket name;
- object path;
- tenant ID;
- listing principal;
- country code;
- residency region;
- asset ID;
- derivative ID;
- content hash;
- derivative purpose;
- lifecycle state;
- storage revision;
- delivery token;
- expiry;
- disclosure class.

### Exact Hashing

Production manifests require an injected exact lowercase SHA-256 digest. There is no FNV or weak fallback.

### No Persisted Delivery URL

Database records store internal object references, never signed URLs. A short-lived delivery reference is generated at the server or edge boundary when a read is authorized.

### Bounded Read Surface

A media-first listing-card page contains at most 50 cards and encodes to at most 128 KiB. Each projected card is limited to 2,048 encoded bytes so the page retains budget for the envelope, cursor, and future compatible fields.

### No Authorization-Sensitive Shared Cache

Authorization envelopes, disclosure projections, signed delivery references, owner views, partner views, and draft media are not placed in an unpartitioned shared cache.

Immutable published derivative bytes may use content-addressed CDN caching only after the delivery gateway has authorized the request. Metadata caches must be partitioned by tenant, country, disclosure class, policy version, listing revision, and query contract version.

## Selected Architecture

```text
user-selected local source
  -> PR36 local validation and 4:3 processing
  -> bounded JPEG/WebP ingress artifact
  -> trusted server upload-intent boundary
       -> session, listing ownership, country seal, quotas
       -> server-authored asset ID and private object reference
       -> one-time bounded upload authorization
  -> temporary-upload-quarantine
  -> trusted finalization worker
       -> re-read bytes from quarantine
       -> signature, dimensions, ratio, byte limit, SHA-256
       -> derivative generation and verification
       -> private processed-object staging
  -> one database transaction
       -> immutable asset manifest
       -> derivative manifests
       -> ordered listing-media bindings
       -> revisions and append-only audit
       -> committed receipt
  -> post-commit quarantine purge and orphan janitor
  -> trusted media delivery gateway
       -> listing visibility and disclosure decision
       -> opaque short-lived delivery reference
  -> media-first listing-card query
       -> one primary visual
       -> minimal semantic commerce fields
       -> <= 50 cards / <= 128 KiB
```

## Domain Model

### Media Asset Manifest

An asset is the server-controlled identity for one PR36 ingress artifact and its derivative family.

```js
{
  contract: {
    name: 'V13.1_MEDIA_ASSET_MANIFEST',
    version: 1
  },
  assetId,
  tenantId,
  listingId,
  listingPrincipalId,
  countryCode,
  countrySealVersion,
  ingress: {
    mimeType,
    width,
    height,
    sizeBytes,
    sha256
  },
  state,
  manifestRevision,
  createdAt,
  verifiedAt,
  revokedAt
}
```

Rules:

- `assetId`, `tenantId`, `listingId`, and `listingPrincipalId` are stable bounded identifiers.
- `countryCode` is an explicit uppercase ISO alpha-2 code supplied by trusted state; it has no default.
- `countrySealVersion` is mandatory for storage placement and attachment.
- Ingress MIME is `image/jpeg` or `image/webp` only.
- Ingress dimensions are positive, at most 1600 × 1200, and exactly 4:3.
- Ingress bytes are positive and at most 15 MiB, preserving PR36's established maximum.
- `sha256` is exactly 64 lowercase hexadecimal characters.
- Manifest revision is a positive safe integer.
- Raw filename, EXIF, local blob URL, browser object, storage path, signed URL, token, session, and secret are forbidden.

### Derivative Manifest

```js
{
  contract: {
    name: 'V13.1_MEDIA_DERIVATIVE_MANIFEST',
    version: 1
  },
  derivativeId,
  assetId,
  purpose,
  mimeType,
  width,
  height,
  sizeBytes,
  sha256,
  objectRef,
  storageRevision,
  state,
  createdAt
}
```

Approved purposes:

- `hero_4x3`: maximum 1600 × 1200;
- `card_4x3`: maximum 800 × 600;
- `thumbnail_4x3`: maximum 400 × 300.

All purposes remain exact 4:3. MIME is JPEG or WebP. `objectRef` is an opaque internal reference and must not contain a URL, bucket credential, query string, or client-selected path.

### Listing-Media Binding

```js
{
  contract: {
    name: 'V13.1_LISTING_MEDIA_BINDING',
    version: 1
  },
  bindingId,
  tenantId,
  listingId,
  assetId,
  position,
  isCover,
  altText,
  state,
  bindingRevision,
  createdAt,
  updatedAt
}
```

Rules:

- Position is 0 through 6.
- Asset IDs are unique within a listing.
- Positions are contiguous and unique.
- A non-empty binding set has exactly one cover.
- Alt text is normalized, non-executable, and at most 140 characters.
- Binding state cannot publish an unverified, unprocessed, revoked, or country-mismatched asset.

## State Machines

### Asset State

```text
reserved
  -> quarantined
  -> verified
  -> processed
  -> attached
  -> published
```

Terminal or exceptional transitions:

```text
reserved | quarantined | verified -> rejected
processed | attached | published  -> revoked
rejected | revoked                -> purged
```

No transition moves backward. `published` does not imply a public bucket; it means that an authorized published listing may receive a delivery reference.

### Derivative State

```text
staged -> verified -> active -> revoked -> purged
```

### Binding State

```text
draft -> ready -> published -> detached
```

## Storage Architecture

### `temporary-upload-quarantine`

- Private.
- Receives only one-time, server-authorized writes.
- No normal browser read.
- Every object is bound to tenant, actor, listing, asset, content limits, and expiry.
- Objects are verified, promoted, rejected, or purged.
- Expired and abandoned objects are removed by a bounded janitor.

### `listing-media-processed`

- Private.
- Trusted workflows write only verified derivatives.
- Listing policy and delivery gateway control reads.
- No direct public listing URL and no blanket anonymous storage policy.
- Object retention follows listing and legal-hold state.

### Internal Object-Key Shape

The trusted adapter may generate an internal key shaped like:

```text
tenant/<tenantId>/country/<countryCode>/listing/<listingId>/asset/<assetId>/r<storageRevision>/<purpose>.<extension>
```

This is an internal adapter convention, not a client contract. The key is never accepted from the browser and never returned in a public card payload.

## Upload Command Pipeline

Subsequent server slices expose only explicit operations:

- `prepareMediaUpload`;
- `finalizeMediaUpload`;
- `bindListingMedia`;
- `reorderListingMedia`;
- `detachListingMedia`;
- `revokeMediaAsset`.

Every write uses:

- authenticated actor;
- trusted listing and tenant context;
- trusted country seal and residency placement;
- semantic idempotency contract and exact SHA-256;
- bounded command allowlist;
- correlation key and reason where governance-sensitive;
- append-only audit;
- confirmed persistence receipt;
- fail-closed remote behavior.

The client never sends a full authorization envelope or storage authority fields.

## Cross-System Consistency

Object storage and PostgreSQL cannot share one native transaction. The selected sequence is:

1. upload the PR36 ingress artifact to private quarantine;
2. verify quarantine bytes and SHA-256;
3. generate and verify processed derivatives into private staged objects;
4. confirm every staged object is readable by trusted infrastructure;
5. commit manifests, bindings, revisions, audit, and outbox record in one database transaction;
6. expose success only after the transaction commits;
7. activate delivery from committed manifests;
8. purge quarantine and asynchronously remove orphan staged objects that lack a committed manifest.

A database failure never reports success. A post-commit cleanup failure does not invalidate the committed manifest; it is recorded for the janitor and audit workflow.

## Media Delivery Gateway

A delivery gateway, not the database and not the browser, resolves a committed derivative into a short-lived delivery reference.

The reference is bound to:

- tenant;
- country;
- listing ID and listing revision;
- asset and derivative IDs;
- derivative storage revision;
- disclosure class;
- audience or authenticated actor context;
- issued and expiry times;
- policy version.

Delivery references expire in at most five minutes. They do not reveal bucket, path, credentials, residency region, or authorization envelope content.

## Media-First Card Payload

The feed card is visual-first but remains semantically accessible and commercially understandable.

```js
{
  contract: {
    name: 'V13.1_MEDIA_FIRST_LISTING_CARD',
    version: 1
  },
  listingId,
  listingRevision,
  countryCode,
  sector,
  title,
  price: {
    amount,
    currency
  },
  locationLabel,
  hero: {
    derivativeId,
    deliveryRef,
    altText,
    mimeType,
    width,
    height,
    aspectRatio: '4:3'
  },
  imageCount,
  state
}
```

Feed exclusions:

- full description;
- raw specification arrays;
- internal attributes;
- owner principal ID;
- storage object reference;
- bucket or path;
- content hash;
- upload intent;
- original filename;
- EXIF;
- event payload;
- idempotency key;
- session or envelope;
- legal entity and residency fields;
- moderation notes;
- audit metadata;
- secret or credential.

The card contains one hero derivative only. Remaining media is represented by `imageCount` and loaded through a separate detail query after explicit user navigation.

## Disclosure Matrix

### Platform Owner Root

- May govern media metadata globally through trusted server operations.
- Does not bypass country seal, storage state, object verification, or audit.
- Does not receive original local source bytes because they never leave the browser.

### Partner Global Admin

- May read global governance metadata allowed by V13.1.
- Cannot mutate owner or peer-partner authority through media operations.
- Does not receive raw storage credentials, reusable signed URLs, original local source, or unrestricted object paths.

### Listing Principal / Provider

- May prepare, finalize, bind, reorder, detach, and revoke media for listings they are authorized to manage.
- Cannot select another tenant, principal, listing, country placement, bucket, path, or lifecycle state.

### Beneficiary / Regular User

- May receive only media belonging to listings visible to them.
- Public or beneficiary delivery is limited to active derivatives bound to published listings.
- No approval is required to view generally available listing media, subject to normal listing visibility and country policy.

### Delegated Operations Staff

- Access is permission- and scope-bound.
- Governance metadata and moderation evidence use separate disclosure classes and storage buckets.
- Listing media access does not imply access to moderation evidence or Tiger Care attachments.

## RLS and Storage Enforcement Design

The future database slice separates:

- media asset manifests;
- derivative manifests;
- listing-media bindings;
- media revisions;
- media audit events;
- upload intents;
- cleanup/outbox records.

RLS and server policy must jointly enforce:

- tenant isolation;
- listing-principal ownership;
- country containment;
- active country seal for operational promotion and publication;
- exact listing visibility for beneficiary reads;
- owner and partner governance without raw credential disclosure;
- append-only audits;
- immutable content hashes and object references after verification;
- no client mutation of server-controlled identity, hash, placement, state, revision, or audit fields.

Storage policies remain private-by-default and derive object access from committed manifest and listing visibility. There is no unconditional anonymous object policy.

## Legacy Compatibility and Migration

The legacy `vvip_listings.images` JSONB field remains read-only compatibility data during migration. It is not the source of truth for new media.

Migration strategy:

1. create empty media control-plane tables and private policy structures;
2. introduce dual-read verification tooling without production activation;
3. backfill only rows that pass the seven-image metadata contract and can be mapped without inventing country, owner, hash, or object reference data;
4. mark unmappable rows for controlled review rather than fabrication;
5. switch trusted reads to bindings after parity evidence;
6. stop new JSONB media writes;
7. retain the legacy field until rollback and retention gates expire.

The historical implicit `JO` default is not copied into new media records unless the listing's trusted country state independently proves Jordan.

## First Controlled Implementation Slice

This PR creates only pure, infrastructure-free modules:

```text
scripts/media/v13-media-contracts.js
scripts/media/v13-media-manifest.js
scripts/media/v13-media-card-projector.js
tests/v13-1-media-contracts.test.cjs
tests/v13-1-media-manifest.test.cjs
tests/v13-1-media-card-projector.test.cjs
```

It may update the quality gate only to register the new focused tests after RED evidence exists.

### `v13-media-contracts.js`

Owns contract names, versions, states, derivative purposes, disclosure classes, limits, error codes, and stable identifier helpers.

### `v13-media-manifest.js`

Validates and creates deeply frozen asset, derivative, and listing-binding manifests. It validates a complete ordered binding set and rejects client-controlled or sensitive fields.

### `v13-media-card-projector.js`

Projects trusted listing, binding, derivative, and delivery-reference inputs into a deeply frozen media-first card. It enforces the exact allowlist and 2,048-byte card limit. It contains no storage, database, environment, browser, network, or signing implementation.

## Subsequent Controlled Slices

### Upload Orchestration Boundary

Adds prepare/finalize/bind commands, semantic idempotency, trusted session/context resolution, and storage ports without live credentials.

### Local Migration, RLS, and Storage Policy Review

Adds an empty local migration, review-only rollback, RLS contract tests, storage policy tests, and local rehearsal. It does not apply remotely.

### Delivery Gateway and Feed Query

Adds opaque short-lived delivery references, media-first card pages, opaque query cursor, disclosure partitioning, and bounded response enforcement.

### Legacy Backfill and Cutover

Adds evidence-producing compatibility tooling and a separately approved rollout plan. It does not fabricate missing hashes, countries, owners, or object references.

## TDD Acceptance Criteria for the First Slice

1. Contract catalogs are exact, unique, and deeply frozen.
2. The maximum listing media count is exactly seven.
3. Video and non-image MIME types are absent.
4. No country default exists.
5. Asset manifests require trusted country code and seal version.
6. Ingress artifacts require JPEG or WebP, exact 4:3, bounded dimensions and bytes, and exact lowercase SHA-256.
7. Asset manifests reject original filename, EXIF, URL, bucket, path, token, session, envelope, secret, and authority fields.
8. Derivatives enforce purpose-specific dimensions, exact 4:3, SHA-256, opaque internal object reference, and immutable revision.
9. Derivative object references reject URLs, query strings, traversal, credentials, and client path syntax.
10. Bindings enforce positions 0 through 6, unique assets, contiguous order, and exactly one cover for non-empty sets.
11. Binding sets reject country, tenant, listing, asset-state, and revision mismatches.
12. Alt text is normalized and limited to 140 characters.
13. A media-first card contains one hero only and excludes descriptions, raw attributes, object references, hashes, upload data, identity secrets, audit data, session, envelope, legal entity, and residency fields.
14. A card requires a verified active derivative and an opaque unexpired delivery reference.
15. A card encodes to at most 2,048 bytes.
16. Every output is deeply frozen.
17. Modules contain no browser, environment, endpoint, credential, network, storage SDK, database driver, queue, weak hash fallback, or production connectivity.
18. Existing PR36, listing-contract, authorization, security, and smoke suites remain green on the exact final SHA.

## Rollback

The first slice is isolated in a stacked branch. Closing its PR without merge removes the entire change. No schema, object, bucket, data, secret, or production restoration is required.

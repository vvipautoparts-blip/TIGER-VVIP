# F05 B+ OWNER Media Decision — 2026

**Status:** ACTIVE OWNER DECISION

**Applies to:** VVIP TIGER advertisement media architecture, F05 and successor media-format adapters.

## Binding decision

F05 uses **TIGER Sovereign Media Fabric (B+)**.

The governing rule is:

> **Privacy on Client + Authority on Server.**

For HEIC/HEIF advertisement images:

1. the original HEIC/HEIF bytes are decoded/transcoded locally when supported by F05;
2. the normal product path never uploads HEIC/HEIF originals to VVIP TIGER for conversion;
3. the browser produces only a sanitized WebP/JPEG candidate derivative;
4. the browser and its Media Passport are not security authority;
5. the server independently verifies and safely rewrites the JPEG/WebP derivative before publication;
6. only the server-rewritten canonical media object may become publishable advertisement media;
7. public media identifiers are platform-generated and are not original filenames or cross-user content hashes;
8. decoder versions are pinned, integrity-checked, revocable and subject to supply-chain/legal compliance gates;
9. PR36 remains the canonical seven-photo crop/encode/session contract and must not be rebuilt merely to add HEIC/HEIF;
10. ordinary users see no technical media controls; the interface remains simple.

## Superseded architecture

The earlier F05A server-quarantine design on branch `feat/f05a-fusion-hybrid-media-intake-20260813` is **SUPERSEDED / HISTORICAL ONLY**.

It must not be merged, cherry-picked, copied into a successor stage, or treated as current authority unless the OWNER explicitly replaces this decision.

## Marketplace boundary

This media decision does not alter the permanent marketplace boundary in `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`.

VVIP TIGER remains an advertising, discovery and direct-contact platform only. Media validation/moderation/storage are platform-side advertisement safety operations; they do not make VVIP TIGER a party to the underlying sale or service relationship.

## Change control

This decision may be replaced only by an explicit OWNER decision. Engineering agents may harden implementation details without weakening the following invariants:

- no normal-path server HEIC conversion;
- no publication of HEIC originals;
- server authority over publishable derivative validation/rewrite;
- no weakening of PR36 limits without separate OWNER approval;
- no transaction intermediation introduced through media features;
- no hidden expansion to video/sequence codecs under F05.

**Canonical detailed design:** `docs/superpowers/specs/2026-08-14-f05-hybrid-heic-heif-local-media-design.md`

# VVIP TIGER Documentation Sovereign Standard

## Purpose

VVIP TIGER treats documentation as an operational control plane, not as optional prose. A change is not complete merely because code exists: the decision, exact source, evidence, environment, and mutation boundary must remain recoverable later without reconstructing history from memory.

## Canonical source

The machine-readable source of truth is:

`project-control/documentation/knowledge-ledger.v1.json`

Human-readable design, security, launch, and review documents may provide deeper context, but they do not replace the canonical ledger record.

## Mandatory record fields

Every material platform change or launch decision must record:

1. **Exact path** — every material file or artifact path used to implement or prove the decision.
2. **Exact SHA** — the exact Git commit SHA under evaluation, and content SHA-256 where a content-addressed review exists.
3. **Environment** — LOCAL, STAGING, PRODUCTION_READ_ONLY, PRODUCTION, REPOSITORY_AUDIT, MOBILE_BUILD, or another explicit environment identifier.
4. **Verification evidence** — tests, workflow runs, artifacts, advisor findings, behavioral checks, or store/build evidence supporting the state.
5. **Mutation boundary** — what was changed and, equally importantly, what was not changed.
6. Decision and reason.
7. Pull request or change-set reference when one exists.
8. Confidentiality and platform visibility classification.

## Security classification

- `PUBLIC`: safe for public disclosure.
- `INTERNAL`: internal operational information without credentials.
- `SECURITY_RESTRICTED`: security architecture, detailed attack-surface or production-drift information that must remain owner-controlled.

`OWNER_CONTROL_ONLY` records must never be published as unauthenticated static web assets.

## Secret handling

**No secrets in documentation.**

Never record passwords, private keys, service-role tokens, signing keys, SMS provider credentials, Apple certificates, Google Play signing material, database passwords, or equivalent credential values. Documentation may record the *name* of a required secret, its purpose, owner, environment, rotation state, and verification status, but never the secret itself.

## Evidence rules

- Evidence must identify the exact source SHA it proves.
- A PASS on an older SHA cannot be reused as proof for a newer SHA unless the gate explicitly proves byte identity for the relevant surface.
- Content-addressed security reviews must record exact path + exact SHA-256. Any byte drift invalidates that review.
- Staging evidence must be distinguished from Production evidence.
- Production read-only inspection is evidence, not authorization to mutate Production.
- Store-readiness documentation is not equivalent to an Android AAB, iOS archive, TestFlight release, or store acceptance.

## Mutation boundaries

Every record must state a **Mutation boundary**. Examples:

- `PRODUCTION_DB_MUTATED=NO`
- `PRODUCTION_EDGE_FUNCTION_MUTATED=NO`
- `MAIN_MUTATED=NO`
- `STAGING_DB_MUTATED=YES`

A missing boundary is treated as incomplete documentation.

## Platform retrieval architecture

The canonical ledger remains internal to the repository/control plane. The VVIP TIGER Owner Control Center may consume a curated, authenticated server-side projection of this ledger. It must not expose restricted records by shipping the raw ledger in the public static artifact.

The protected projection must support retrieval by at least:

- record ID;
- date/time;
- category;
- PR number;
- source SHA;
- environment;
- exact path;
- verification state;
- launch domain (security, database, web, Android, iOS, legal, AI, operations).

## Fail closed

**Fail closed** is mandatory. If required documentation fields, evidence bindings, visibility classification, or exact-source references are missing, release tooling must treat the documentation gate as incomplete rather than inventing or assuming values.

## Documentation lifecycle

1. Record RED/problem discovery when material.
2. Record implementation decision.
3. Record exact files and paths.
4. Record exact source SHA.
5. Record local test evidence.
6. Record Staging evidence when applicable.
7. Record Production read-only findings separately.
8. Record owner promotion authorization separately from technical readiness.
9. Record final Production/store result only after actual execution.

This standard applies to Web, Supabase/database, Edge Functions, AI Control Plane, Android, iPhone/iOS, legal/compliance, release engineering, and operational governance.

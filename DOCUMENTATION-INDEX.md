# Documentation Index

**Status:** CURRENT NAVIGATION INDEX

This file is an index only. It is not an independent owner-decision or readiness authority.

## Start Here — Current Authority

1. `AGENTS.md` — repository working conventions, current code map, and continuity protocol.
2. `docs/MASTER_PROJECT_STATE.md` — current execution-state ledger and continuation cursor.
3. `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` — canonical precedence for Issue #312 commerce/discovery authority.
4. `README.md` — project overview; resolve any conflict through the authorities above.

## Canonical Runtime Entry Points

- `index.html` — unified marketplace/authentication entry page.
- `auth-clerk-index.js` — canonical Clerk authentication gate.
- `scripts/runtime/vvip-runtime-loader.js` — Clerk session + Supabase data-layer runtime bridge.
- `scripts/vvip-pr29-home-marketplace.js` — canonical marketplace feed/interactions.
- `private-profile-p03.html` — canonical private account center.
- `scripts/vvip-p03-profile.js` — private account-center interactions.
- `scripts/vvip-p03-profile-identity.js` — authenticated profile resolver bridge.
- `reset-password.html` — compatibility redirect to external-provider recovery only.

## Validation

- `scripts/quality-gate.sh` — full repository quality gate.
- GitHub protected workflows must be evaluated on the exact reviewed head SHA.
- A historical document containing PASS/100%/production-ready wording is not current evidence.

## Legacy Documentation Tombstones

The following root documents preserve only historical provenance and must not be used as current runtime/readiness authority:

- `PROJECT-SUMMARY.md`
- `FINAL-VERIFICATION.md`
- `USER-GUIDE.md`
- `UNIFIED-PLATFORM-STATUS.md`

Their earlier detailed content remains available through Git history. Historical test credentials must never be provisioned or reused from documentation.

## Conflict Rule

Use this precedence:

1. current repository bytes/refs;
2. exact-head CI/test/security evidence;
3. current PR/commit metadata;
4. `docs/MASTER_PROJECT_STATE.md` and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` for their governed scopes;
5. historical snapshots/prose.

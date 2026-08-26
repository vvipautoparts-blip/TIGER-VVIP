# VVIP TIGER FUSION 2026 — Auth Runtime Authority Addendum

**Status:** BINDING INTEGRATION CORRECTION

**Date:** 2026-08-15

**Applies to:** `docs/superpowers/specs/2026-08-15-fusion-single-surface-runtime-integration-design.md` and its implementation plan.

## Evidence that triggered this correction

The existing repository contract `tests/auth-clerk-index.test.cjs` explicitly proves that an unsigned visitor may keep the public Home surface visible and that Clerk is mounted only when a protected intent such as `CREATE_LISTING` or `OPEN_ACCOUNT` is requested. Recovery also keeps the public discovery surface visible while failing protected actions safely.

This is consistent with the product role of VVIP TIGER as a global advertising/discovery/direct-contact platform: public discovery should not be silently converted into an account wall merely by integrating the FUSION presentation layer.

## Binding correction

Where the parent integration design uses wording such as “authenticated `/` entrypoint” or says the marketplace shell is inaccessible while unauthenticated, read it as follows for this implementation:

1. `/` is the **authoritative FUSION Single Surface** for public discovery.
2. Public-safe feed/search/listing discovery may remain visible without signing in, subject to server visibility/policy rules.
3. Clerk remains the sole browser authentication authority for protected intents/actions.
4. `CREATE_LISTING`, account/profile actions, favorite/contact actions where policy requires identity, privileged capability actions, publication, and other protected mutations must pass through the existing bounded `VVIP_AUTH.requireAuth(...)` flow or a later explicitly approved successor with equivalent or stronger contracts.
5. The FUSION presentation controller must not inspect Clerk directly, infer identity from browser flags, mount Clerk, or decide whether a user is authenticated.
6. `auth-clerk-index.js` owns gate visibility/auth intent/resume behavior. It may delegate **public-home presentation** to the FUSION surface after its existing startup decision, but this does not grant protected authority.
7. Capability absence or authentication absence never creates privileged UI authority.
8. Existing auth tests remain regression authority and must continue passing.

## Non-change

This addendum does not weaken authentication. It prevents the presentation integration from accidentally replacing the existing explicit protected-action boundary with either a universal login wall or a client-inferred identity mechanism.

All other FUSION, F04, PR36/F05, marketplace-boundary, branch-protection, Production, device, legal and F16 Launch Passport requirements remain unchanged.

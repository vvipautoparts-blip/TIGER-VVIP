# TIGER SOVEREIGN AI-18 — Owner Step-Up Migration Security Review

## Review status

- `AI18_REPOSITORY_SECURITY_REVIEW=PASS_WITH_STAGING_EXECUTION_REQUIRED`
- `AI18_PRODUCTION_DB_APPROVAL=NOT_GRANTED`
- Migration: `supabase/migrations/20260807173000_tiger_sovereign_owner_stepup_authorization.sql`
- Exact SHA-256: `4f5b7622ba45d26c5dc4151b5f2a307de178e9cd3cd8dc7e186997d0d0f3f16b`
- Scope: repository/static security review only.
- Preview/Staging apply: **NOT PERFORMED by this review**.
- Production apply: **NOT AUTHORIZED / NOT PERFORMED**.

Any one-byte change invalidates this review automatically. The Steel Shield exemption is permitted only for the exact SHA-256 above and must fail closed after any migration edit.

## Security objective

AI-18 persists short-lived, phishing-resistant owner step-up authorization metadata so a critical TIGER SOVEREIGN action cannot rely on a prompt, a browser boolean, a static passcode, or an in-memory-only authorization. The database record is bound to the exact owner, action, release, payload, scope, environment, challenge, nonce, authenticator reference hash, verification digest, and expiry.

The migration intentionally stores **no password, static PIN, passcode, raw WebAuthn credential, private key, authentication assertion, or reusable authentication secret**.

## Steel Shield evidence

The temporary CI review probe calculated the exact migration SHA-256 and classified the line-oriented Steel Shield findings for this file:

- `CRITICAL=0`
- `NOT_NULL_RISK=20`
- `UPDATE_WITHOUT_WHERE=2`
- `OTHER_HIGH=0`

The scanner exited non-zero because all unreviewed HIGH findings are fail-closed by policy.

### `NOT_NULL_RISK` — 20 findings

Classification: **reviewed schema-invariant declarations / lexical matches, not destructive existing-data mutations**.

The migration creates a new authorization table. Its required identity, binding, assurance, digest, status, and timestamp fields are declared `NOT NULL` at table creation so incomplete security-authority records cannot exist. The scanner also matches `IS NOT NULL` text inside status/timestamp CHECK constraints. The migration does **not** alter an existing populated column to add `NOT NULL`, does not perform a backfill, and does not weaken an existing invariant.

### `UPDATE_WITHOUT_WHERE` — 2 findings

Classification: **line-oriented lexical false positives, not unrestricted data updates**.

The two matches arise from SQL lines containing the word `update` in non-destructive declarations:

1. `grant select, insert, update ... to service_role`
2. `before update or delete ...` trigger declaration

Actual row mutations inside `consume_ai_owner_stepup_authorization(...)` are bounded by `authorization_id`, active status, exact owner/action/release/payload/scope/environment binding, and expiry. Consumption occurs after `SELECT ... FOR UPDATE` and validates `row_count = 1` to reject replay or concurrency conflicts.

## Browser and role isolation

The migration:

- enables Row Level Security on `public.ai_owner_stepup_authorizations`;
- revokes all direct table authority from `anon` and `authenticated`;
- grants only the required `select, insert, update` operations to `service_role`;
- grants execution of guard/consumption functions only to `service_role`;
- does not use `SECURITY DEFINER` for this authority boundary.

This means a browser-supplied `authenticated=true`, prompt text, or forged client field cannot become database step-up authority through direct browser table access.

## Immutable binding and state machine

The mutation guard rejects deletion and prevents changes to:

- challenge ID;
- owner subject;
- action;
- release digest;
- payload digest;
- scope digest;
- environment;
- verifier ID;
- authentication method;
- assurance level;
- authenticator-reference hash;
- nonce hash;
- verification digest;
- creation/verification/expiry timestamps.

The only allowed state transition from `verified` is to `consumed`, `revoked`, or `expired`. A consumed authorization cannot return to an executable state.

## Phishing-resistant method policy

Database constraints accept only:

- `WEBAUTHN_PASSKEY`
- `IDP_PHISHING_RESISTANT_MFA`

and require assurance exactly equal to `PHISHING_RESISTANT`.

Static passcodes, password-only authentication, SMS-only authentication, prompt-supplied secrets, and client-side authentication flags are not valid sovereign step-up methods in AI-18.

## Replay and concurrency protection

`consume_ai_owner_stepup_authorization(...)`:

1. locks the target authorization row with `FOR UPDATE`;
2. requires status `verified`;
3. matches owner subject;
4. matches protected action;
5. matches exact Release DNA digest;
6. matches exact payload digest;
7. matches exact execution-scope digest;
8. matches the action environment;
9. rejects expiry;
10. atomically changes status to `consumed` with `consumed_at`;
11. validates exactly one row changed;
12. returns `STEPUP_REPLAY_OR_CONFLICT` on race/replay conflict.

Unique constraints on `challenge_id`, `nonce_hash`, and `verification_digest` add independent duplicate prevention.

## Defense-in-depth relationship

AI-18 is an additional identity/transaction authorization layer. It does **not** replace:

- TIGER Constitution / Policy Gate;
- AI-15 Ed25519 Owner Decision Receipts;
- existing persistent L4 owner approval consumption;
- Release DNA / AI-17 trusted release provenance;
- audit/Black Box evidence;
- the three sovereign owner decisions: Merge, DB Promotion, Production Activation.

The intended critical path remains:

`Policy -> Step-Up Re-authentication -> One-Time Step-Up Authorization -> Owner Decision Receipt -> Persistent L4 Approval -> Controlled Executor -> Audit/Proof`

## Residual work before runtime VERIFIED

Repository review is not runtime proof. The following remain required before any production-readiness claim:

- trusted WebAuthn/passkey or equivalent phishing-resistant IdP adapter configured server-side;
- staging migration apply and SQL behavior probes;
- forged-client, replay, expiry, race/concurrency, and cross-scope runtime tests;
- live owner-identity binding;
- audit-event integration;
- controlled executor integration proving a critical action fails without step-up consumption;
- staging manual acceptance;
- protected owner DB Promotion and Production Activation decisions when their time arrives.

No production deployment, database promotion, owner approval, or production activation is granted by this review.

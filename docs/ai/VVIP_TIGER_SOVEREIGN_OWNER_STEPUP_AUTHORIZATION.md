# VVIP TIGER SOVEREIGN — Owner Step-Up Authorization

## Status

AI-18 implements a repository-level, fail-closed security architecture for critical owner actions. It does **not** claim a live passkey enrollment, a configured production identity provider, a staging database application, or a production activation.

The purpose of AI-18 is to ensure that prompt text, ordinary login state, a browser-provided flag, or an old owner approval cannot by itself authorize a sovereign critical mutation.

## Core rule

For a protected L4 operation, the required execution chain is:

`Policy / Tool Validation -> Existing Owner Approval Receipt -> Fresh Phishing-Resistant Step-Up -> In-Process One-Time Consumption -> Persistent One-Time Consumption -> Bounded Tool Executor`

If any link is absent, stale, forged, mismatched, replayed, unavailable, or untrusted, execution fails closed.

## Why no fixed owner passcode exists in the system

A static passcode placed in a system prompt, source file, SQL function, repository secret, browser bundle, audit log, or deterministic source-code hash is not treated as an authentication boundary. Prompt injection or source disclosure must not be able to reveal the credential that grants owner authority.

AI-18 therefore accepts only a trusted server-side verification result from an approved phishing-resistant authenticator path. The current repository policy accepts:

- `WEBAUTHN_PASSKEY`
- `IDP_PHISHING_RESISTANT_MFA`

with assurance exactly:

- `PHISHING_RESISTANT`

The implementation stores only non-secret references/digests after verification.

## Protected actions

The initial sovereign action bindings are:

| Tool / Operation | Step-Up Action | Environment |
| --- | --- | --- |
| `engineering.merge_pr` | `MERGE_RELEASE` | `REPOSITORY` |
| `engineering.deploy_production` | `ACTIVATE_PRODUCTION` | `PRODUCTION` |
| `finance.change_prices` | `CHANGE_PRICES` | `PRODUCTION` |

The persistence policy also reserves protected action identifiers for database promotion and owner/security-policy changes so later execution adapters cannot silently downgrade them.

## Transaction binding

A verified step-up is bound to:

- owner subject;
- action;
- Release DNA digest;
- exact normalized tool-request payload digest;
- execution-scope digest;
- target environment;
- challenge ID;
- nonce hash;
- verification timestamp;
- expiry timestamp.

Changing any bound value invalidates the authorization.

## Trusted verifier boundary

`scripts/ai/sovereign-owner-stepup-authorization.js` provides an in-process branded verifier abstraction. The verification callback is retained in a `WeakMap`, while the public verifier object is branded with a `WeakSet`.

Consequences:

- JSON-copying the verifier does not preserve trust;
- browser-generated `authenticated=true` or `verified=true` objects do not preserve trust;
- raw authentication assertions are not copied into the trusted verification output;
- only a server adapter that actually performed provider/WebAuthn verification can create the accepted result.

## One-time verification

The in-process step-up verification is one-time consumable. This prevents accidental reuse within one process and provides an additional guard before the persistent database boundary.

In-process consumption alone is intentionally marked insufficient for production authority. AI-18 additionally requires persistent consumption.

## Persistent authorization table

Migration:

`supabase/migrations/20260807173000_tiger_sovereign_owner_stepup_authorization.sql`

Table:

`public.ai_owner_stepup_authorizations`

The table persists non-secret transaction and assurance metadata only. It includes unique challenge, nonce and verification digests, exact transaction-binding fields, status, verification/expiry timestamps, and consumption/revocation timestamps.

Browser roles have no direct table authority. The service boundary owns creation and state transition.

## Persistent replay protection

`public.consume_ai_owner_stepup_authorization(...)`:

- locks one authorization with `FOR UPDATE`;
- requires active `verified` status;
- verifies exact owner/action/release/payload/scope/environment;
- verifies expiry;
- changes the state atomically to `consumed`;
- verifies exactly one row changed;
- returns deterministic failure codes for mismatch, expiry, replay or conflict.

A database mutation guard prevents deletion, mutation of transaction-binding fields, or transition back from a terminal state.

## Supabase persistence adapter

`scripts/ai/sovereign-stepup-supabase-consumer.js` provides the bounded server adapter for the persistent consumption RPC.

It:

- accepts only exact non-secret transaction fields;
- validates authorization ID, owner, action, Release DNA, payload, scope, environment and time before any RPC;
- calls only `consume_ai_owner_stepup_authorization`;
- does not send raw credentials, passcodes, WebAuthn assertions, secrets, or private keys;
- deliberately does not use a caller-provided verification digest as database execution authority;
- fails closed on network/database errors or malformed RPC responses.

The adapter is repository-implemented, but it still requires a real server-side Supabase client and approved staging migration application before runtime verification.

## Protected Tool Executor

`scripts/ai/sovereign-protected-tool-executor.js` is the final L4 execution gate.

For L4 tools it performs the following order:

1. validate and normalize the registered tool request;
2. verify ordinary runtime, scope, kill-switch, level and owner-approval gates;
3. require a trusted Step-Up verification;
4. require exact Release DNA and scope binding;
5. consume the Step-Up in-process;
6. require a trusted persistent Step-Up consumer;
7. consume the exact persistent authorization;
8. only then call the bounded low-level registered executor.

Failure at steps 1-7 means the tool executor is not invoked.

## Bypass Sentinel

`tests/ai18-l4-executor-bypass-sentinel.test.cjs` scans production AI/function source paths and fails CI if `executeRegisteredTool` is used directly outside:

- the low-level registry implementation itself; or
- `sovereign-protected-tool-executor.js`.

This turns the routing rule into a repository invariant rather than a documentation convention.

## Relationship to existing sovereign controls

AI-18 supplements, rather than replaces:

- TIGER Constitution;
- Policy Gate;
- kill switches;
- agent/tool allowlists;
- idempotency controls;
- rate and budget gates;
- AI-15 cryptographic Owner Decision Receipts;
- persistent L4 approval consumption;
- AI-17 trusted Release Provenance;
- audit/Black Box evidence;
- separate Merge, DB Promotion and Production Activation owner authority.

## Security review

The AI-18 migration is pinned to an exact SHA-256 after repository security review. The review is recorded in:

`docs/ai/TIGER_SOVEREIGN_AI18_OWNER_STEPUP_SECURITY_REVIEW.md`

Any migration byte change invalidates that review and sends the file back through normal fail-closed Steel Shield analysis.

## Runtime work still required

The repository implementation is not equivalent to a live authentication deployment. Before AI-18 can be marked runtime `VERIFIED`, the following still require real evidence:

- configure a trusted WebAuthn/passkey or equivalent phishing-resistant IdP server adapter;
- enroll and verify the real owner identity through that provider;
- apply the migration in an approved non-production environment;
- wire the implemented Supabase persistence adapter to the real server-only Supabase client;
- wire all live L4 executor call sites through the protected executor and prove the bypass sentinel covers the deployed source tree;
- verify replay, concurrency, expiry, scope mismatch and forged-client scenarios against the live staging database;
- verify audit events for successful and denied step-up actions;
- perform manual owner step-up acceptance in staging;
- collect release-bound Evidence Capsules;
- obtain each protected owner decision at its actual release gate.

Until these are complete, documentation must distinguish `REPOSITORY_IMPLEMENTED` from `RUNTIME_VERIFIED`.

## Non-claims

AI-18 does not claim:

- that a production passkey exists;
- that a production identity provider is configured;
- that the new migration is applied remotely;
- that an L4 action has been executed;
- that a Merge, DB Promotion, or Production Activation decision has been granted;
- that the platform is 100% production ready.

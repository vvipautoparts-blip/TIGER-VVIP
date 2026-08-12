# VVIP TIGER — Owner Global Launch Execution Directive

## Status

**OWNER AUTHORIZATION: ACTIVE**

This directive records the owner's explicit instruction that VVIP TIGER work must continue autonomously from the latest verified repository state until the platform reaches global-launch readiness and, when all required technical and safety gates are satisfied and the necessary tooling is available, through the authorized launch actions themselves.

## Owner instruction

The owner explicitly authorizes the execution agent to continue without routine reconfirmation between normal project phases.

This authorization includes, when technically necessary and supported by the available tools and accounts:

- creating and updating branches, commits, tests, documentation, workflows, and pull requests;
- resolving defects and security gaps;
- progressing through repository, staging, release-candidate, and launch-readiness work;
- merging approved dependency chains when the applicable repository gates are satisfied;
- applying required remote migrations and production configuration only after their safety prerequisites and rollback evidence are satisfied;
- performing production deployment and release actions after exact-release evidence is green;
- configuring providers and enabling required services;
- making necessary provider purchases or real charges for launch when the amount is bounded, necessary, and supported by the active cost-control policy and available payment/account tooling.

Routine confirmation is **not required** merely because a new phase begins or because a new chat/session is opened.

## Execution rule

The operating sequence remains:

`READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT -> CONTINUE`

After a successful checkpoint, the next safe phase begins automatically. Do not stop solely to repeat status or request approval already granted by this directive.

## Technical and safety gates remain binding

Owner authorization does not convert an unsafe or unverified action into a safe one. The following remain mandatory execution conditions:

1. exact-source verification before merge or deployment;
2. dependency-order correctness for stacked PRs/migrations;
3. fail-closed identity and authorization behavior;
4. least-privilege credentials and no secrets in browser code, repository text, or logs;
5. backup/rollback or equivalent recovery evidence before irreversible production mutation;
6. migration compatibility and data-integrity checks before remote database changes;
7. bounded cost controls before real charges or provider scaling;
8. no fabricated test, staging, production, billing, or launch evidence;
9. no bypass or weakening of Quality Gate, Project Control, security scans, RLS, identity invariants, or owner-protection mechanisms merely to make a release pass;
10. stop only when an external dependency cannot be completed with available tools/accounts, a material safety prerequisite fails, or an action requires information that cannot be safely inferred.

## Financial authorization boundary

The owner has granted authority to incur costs necessary for launch. This is **authorization**, not an unlimited spending ceiling.

- Prefer free/existing capacity first.
- Use the smallest sufficient paid tier or charge supported by measured need.
- Existing hard budget limits remain enforcement controls until deliberately changed with measurable provider-specific evidence.
- Do not invent a monetary ceiling or payment method.
- Do not treat optional high-cost services as required merely because spending authority exists.

## Architecture invariants not overridden

The following are product/security decisions rather than approval gates and remain binding unless separately redesigned with evidence:

- federated identity remains authoritative;
- automatic account ownership transfer solely by email remains forbidden;
- first-party/local password authority remains forbidden;
- secrets/private signing keys remain forbidden in browser code;
- private-storage publication is not permitted merely as a cost shortcut;
- identity/session/private-read caching remains subject to the existing security architecture;
- evidence must remain truthful and exact-head scoped.

## Continuity meaning

For future sessions, the phrase **OWNER GLOBAL LAUNCH AUTHORIZATION = ACTIVE** means:

- continue autonomously;
- do not restart completed work;
- do not ask for repeated routine approvals;
- cross previously owner-gated merge/deploy/migration/provider actions when their technical prerequisites are actually satisfied and the required tools are available;
- preserve all safety, quality, evidence, rollback, and bounded-cost controls;
- continue until Global Launch Ready / launch completion or a genuine external blocker is reached.

## Effective date

2026-08-08, Asia/Amman.

# VVIP TIGER All-Sector Commission & Role Policy Design

**Authority status:** `HISTORICAL_EVIDENCE_ONLY` — transaction/deal commission portions are **SUPERSEDED by Issue #312**.

**Historical status:** OWNER APPROVED — 2026-08-11. This status records the decision that existed on that date; it is not current runtime authority for transaction-value commissions.

## Current authority boundary

`NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`

Transaction-value commission for advertised goods, services, or user-to-user/user-to-provider deals is retired. The current binding commercial boundary is:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

TIGER does not create or close the parties' deal, collect buyer/seller payment, run escrow between the parties, fulfill the advertised good/service, or take a percentage of that deal. Financial infrastructure is allowed only for TIGER's own platform-owned advertising and approved platform advertising services, including their credits/packages, adjustments/refunds, taxes/fees, treasury/accounting, and provider settlement for those platform-owned flows.

The remainder of this file is retained as historical evidence and dependency context. Its transaction-commission percentages, redistribution rules, payout-engine requirements, and sector-wide transaction-commission instructions must not drive new runtime implementation. Non-conflicting identity-binding or historical role-cleanup material may be reused only when it is independently consistent with the active owner authorities and current repository contracts.

## Purpose

This specification historically froze the then-owner-approved commission redistribution, institutional role cleanup, and trusted worker-identity binding across every current and future sector. The historical rules were central and global; they must not be treated as current transaction-commission authority.

## Roles removed from the commission path

The following roles/keys were removed from transaction commission distribution under the historical design:

- `SECONDARY_MARKETER`: 4.30% / 430 units;
- `SUPERVISOR`: 3.12% / 312 units;
- `AREA_MANAGER`: 3.51% / 351 units.

Total removed share: **10.93% / 1093 units**.

## Redistribution

Historical design only: the removed 10.93% was redistributed completely among exactly three destinations:

- `SECTOR_MANAGER`;
- `COUNTRY_EXECUTIVE_COMMISSIONER`;
- `MARKETING`.

Conceptual equal addition per destination was `10.93 / 3 = 3.643333...%`.

Nominal historical resulting shares were:

- `SECTOR_MANAGER`: 4.30% + 3.643333...% = 7.943333...%;
- `COUNTRY_EXECUTIVE_COMMISSIONER`: 5.47% + 3.643333...% = 9.113333...%;
- `MARKETING`: 7.37% + 3.643333...% = 11.013333...%.

These values are historical evidence only and are not payout instructions for advertised-goods/services transactions.

## Exact money rule

The following rules describe the historical transaction-commission design and have no current runtime authority for advertised-goods/services deals.

For every historical payout amount the design required:

1. calculate using integer minor units or an exact fixed-point/rational representation;
2. allocate the exact distributable amount to the approved destinations;
3. resolve any indivisible remainder deterministically using a documented largest-remainder or equivalent deterministic method;
4. assert that the sum of destination allocations equals the exact source distributable amount;
5. persist the allocation basis and rounding adjustment in audit evidence where the financial model stores payout detail.

The historical engine design did not use binary floating-point money arithmetic as the source of truth.

## Remaining marketer rule

Historical design only: `PRIMARY_MARKETER` remained unchanged at 4.30% / 430 units unless a separate owner decision changed it. This is not current transaction-value commission authority.

## All-sector scope

The historical policy applied identically to every current sector and every future sector. Issue #312 supersedes that transaction-commission scope. No sector may use this historical document to reactivate a commission or percentage tied to the value of an advertised-goods/services deal.

No sector may retain the cancelled roles as hidden commission recipients.

## Trusted identity binding for every worker role

Every person who receives a new operational/staff role in VVIP TIGER must have a trusted identity reference attached to the assignment. This applies to every surviving role and every sector where the active role architecture still recognizes the assignment.

The role-assignment surface must ask for exactly one of:

- `ACCOUNT_ID`: the existing canonical VVIP internal `accountId`;
- `CLERK_USER_ID`: the existing Clerk user subject that bridges through `profiles.clerk_user_id`.

The assignment command contract is:

`identityBinding: { type: "ACCOUNT_ID" | "CLERK_USER_ID", value: string }`

Rules:

- the field is mandatory for every new operational role assignment;
- the UI must expose a compact type selector and required identifier field;
- Clerk identity must not be replaced by a second authentication authority;
- a value typed in the browser is only a reference, never proof of ownership;
- trusted server resolution must verify the reference before Production activation;
- the resolved identity/account must match the assignment subject and must not redirect authority to another account;
- missing, malformed, unknown, ambiguous or mismatched binding fails closed;
- the normalized binding must remain part of semantic idempotency/persistence evidence so it cannot disappear between UI, authorization and audit layers;
- historical assignments that predate this rule remain historical facts and are not silently rewritten with fabricated identifiers.

If the repository's canonical account identifier has a different presentation label, the implementation still uses the existing `accountId` authority rather than inventing a parallel account-number database.

## Institutional role cleanup

The historical owner decision was broader than removing three percentages. Role cleanup that remains non-conflicting may continue only under current active role/authorization authorities; nothing in this section restores transaction-value commission authority.

### `AREA_MANAGER`

Where `area_manager` is an actual platform role and active current authority retires it, cleanup includes, where present:

- role catalogs and constants;
- authority rank/hierarchy;
- permission matrices;
- assignment UI and APIs;
- scope definitions that exist only for the retired role;
- dashboards, reports, filters and exports;
- notification/escalation routing;
- tests and fixtures;
- database role/assignment records through a safe forward migration where applicable;
- compatibility handling for historical audit records without falsifying history.

Historical records must not be destructively rewritten merely to erase the old name. Historical audit/event facts remain immutable and are marked legacy/retired where necessary.

### `SUPERVISOR`

Any active commission, order-visibility or assignment authority tied to the retired transaction supervisor role must not be inferred from this historical document. Legacy RLS/policies using `supervisor` must be audited against current authority and replaced safely rather than simply hidden in UI.

### `SECONDARY_MARKETER`

No active secondary-marketer recipient, referral slot, payout branch, or other transaction-value commission path may be recreated from this historical design. Historical financial/audit records remain readable as historical facts.

## Alias and semantic-equivalent audit

The implementation must search not only the exact historical keys but also semantic equivalents, including casing, snake/camel variants and Arabic labels such as:

- مدير المنطقة;
- مشرف;
- المسوق الثاني;
- secondary marketer;
- supervisor;
- area manager.

An equivalent transaction-commission role may not survive merely because it has a different identifier.

## Required central destinations

The historical commission destinations above are not current payout destinations for advertised-goods/services transactions. If a similarly named role exists for a non-brokerage operational purpose, implementation must reconcile it with the repository's actual current authority model rather than infer financial rights from this file.

In particular, `COUNTRY_EXECUTIVE_COMMISSIONER` must not be fabricated as a production transaction-payout role from this historical design.

## Database and migration behavior

Any database change must be forward-only and fail closed.

Before dropping/retiring a role or constraint, the migration must account for existing assignments safely. It must not orphan users, historical payout/audit references or foreign keys.

Production data mutation is not authorized by this historical design document. Repository migration preparation, tests and local/rehearsal evidence may proceed; applying a Production migration remains a separate protected gate.

## Historical payout engine contract

The transaction-value payout engine described by this design is retired for advertised-goods/services transactions. No current runtime may use this file as a canonical commission-policy source.

Historical requirements included rejecting:

- unknown recipients;
- retired recipients in new transactions;
- sector-local overrides of the cancelled roles;
- totals that do not reconcile exactly;
- negative allocation;
- duplicate recipient allocation where uniqueness is required;
- silent rounding loss.

These bullets are retained only to explain historical behavior and aid safe retirement/audit.

## UI / reporting contract

Current-operation screens must not offer historical transaction-commission recipients or percentages as active deal-payment behavior. Every current role-assignment form must follow the active authorization/identity contracts. Historical reports may show retired roles only when clearly identified as historical/legacy data.

Any historical percentage display is evidence, not an instruction to calculate or pay a transaction-value commission.

## Testing and evidence

Current implementation evidence must prove, at minimum:

- transaction-value commission runtime for advertised goods/services remains retired and fail closed;
- semantic aliases cannot reintroduce retired brokerage roles or payout paths;
- historical rows remain readable and unchanged where retention is required;
- RLS/authorization tests remain fail closed;
- same-head quality/security checks pass;
- platform-owned advertising finance remains separated from organic relevance/fit and from buyer/seller/provider deal settlement;
- no old percentage or payout instruction in this historical file can become active authority.

Historical tests that asserted redistribution or transaction-payout behavior are not current acceptance criteria unless rewritten for an explicitly allowed platform-owned advertising flow.

## Zero-brokerage acceptance rule

No implementation is accepted if any active code path, database policy, role assignment path, payout path, report, dashboard or sector-local configuration can use this historical design to create transaction-value commission, buyer/seller payout, escrow, settlement, or percentage-of-deal behavior for advertised goods/services.

For user-to-user/user-to-provider commerce, TIGER finds, explains, and hands off contact; the parties handle negotiation, agreement, payment, delivery/service, and completion outside TIGER.

## Safety boundaries

This historical design does not authorize direct Production database mutation, real-money movement, payout execution, payment-provider changes, secret changes, DNS changes, Clerk configuration changes, country activation or owner seeding. Implementation proceeds through isolated branch/PR, TDD, local/rehearsal evidence and protected gates.

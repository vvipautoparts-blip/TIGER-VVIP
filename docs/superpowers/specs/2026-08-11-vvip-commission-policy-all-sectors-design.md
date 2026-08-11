# VVIP TIGER All-Sector Commission & Role Policy Design

**Status:** OWNER APPROVED — 2026-08-11

## Purpose

This specification freezes the owner-approved commission redistribution and institutional role cleanup across every current and future sector. The rule is central and global; it must not be copied manually per sector.

## Roles removed from the commission path

The following roles/keys are removed from transaction commission distribution:

- `SECONDARY_MARKETER`: 4.30% / 430 units;
- `SUPERVISOR`: 3.12% / 312 units;
- `AREA_MANAGER`: 3.51% / 351 units.

Total removed share: **10.93% / 1093 units**.

## Redistribution

The removed 10.93% is redistributed completely among exactly three destinations:

- `SECTOR_MANAGER`;
- `COUNTRY_EXECUTIVE_COMMISSIONER`;
- `MARKETING`.

Conceptual equal addition per destination is `10.93 / 3 = 3.643333...%`.

Nominal resulting shares are:

- `SECTOR_MANAGER`: 4.30% + 3.643333...% = 7.943333...%;
- `COUNTRY_EXECUTIVE_COMMISSIONER`: 5.47% + 3.643333...% = 9.113333...%;
- `MARKETING`: 7.37% + 3.643333...% = 11.013333...%.

Display values may be rounded to 7.94%, 9.11% and 11.01%, but the payout engine must never calculate by multiplying rounded display percentages.

## Exact money rule

No monetary unit may be lost, duplicated or left suspended due to decimal rounding.

For every payout amount:

1. calculate using integer minor units or an exact fixed-point/rational representation;
2. allocate the exact distributable amount to the approved destinations;
3. resolve any indivisible remainder deterministically using a documented largest-remainder or equivalent deterministic method;
4. assert that the sum of destination allocations equals the exact source distributable amount;
5. persist the allocation basis and rounding adjustment in audit evidence where the financial model stores payout detail.

The engine must not use binary floating-point money arithmetic as the source of truth.

## Remaining marketer rule

`PRIMARY_MARKETER` remains unchanged at 4.30% / 430 units unless a separate owner decision changes it.

## All-sector scope

This policy applies identically to every current sector and every future sector. A sector must inherit the central policy rather than define a private copy of commission percentages.

No sector may retain the cancelled roles as hidden commission recipients.

## Institutional role cleanup

The owner decision is broader than removing three percentages.

### `AREA_MANAGER`

Where `area_manager` is an actual platform role, it is to be retired as a current operational/financial level. Cleanup must include, where present:

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

Any active commission, order-visibility or assignment authority tied to the retired transaction supervisor role must be removed or migrated. Legacy RLS/policies using `supervisor` must be audited and replaced safely rather than simply hidden in UI.

### `SECONDARY_MARKETER`

Any active secondary-marketer recipient, referral slot, assignment column, payout branch, UI selector, report column, notification route or API key must be removed from current behavior. Historical financial/audit records remain readable as historical facts.

## Alias and semantic-equivalent audit

The implementation must search not only the exact requested keys but also semantic equivalents, including casing, snake/camel variants and Arabic labels such as:

- مدير المنطقة;
- مشرف;
- المسوق الثاني;
- secondary marketer;
- supervisor;
- area manager.

An equivalent role may not survive merely because it has a different identifier.

## Required central destinations

If the current repository uses a different canonical identifier for a requested destination, implementation must map it explicitly rather than inventing a second authority system.

In particular, `COUNTRY_EXECUTIVE_COMMISSIONER` must be reconciled with the repository's actual country-level authority model before production activation. No unsupported production role is to be fabricated silently.

## Database and migration behavior

Any database change must be forward-only and fail closed.

Before dropping/retiring a role or constraint, the migration must account for existing assignments safely. It must not orphan users, payouts, audit references or foreign keys.

Production data mutation is not authorized by this design document alone. Repository migration preparation, tests and local/staging rehearsal may proceed; applying a Production migration remains a separate protected gate.

## Payout engine contract

There must be one canonical commission-policy source of truth consumed by all sectors. The payout engine must reject:

- unknown recipients;
- retired recipients in new transactions;
- sector-local overrides of the cancelled roles;
- totals that do not reconcile exactly;
- negative allocation;
- duplicate recipient allocation where uniqueness is required;
- silent rounding loss.

## UI / reporting contract

Current-operation screens must not offer or display retired roles as selectable/current recipients. Historical reports may show them only when clearly identified as historical/legacy data.

Displayed percentages are presentation values; financial calculations use exact policy values and minor units.

## Testing and evidence

Implementation requires tests covering at minimum:

- exact retired-role absence from new payout calculation;
- semantic aliases do not reintroduce retired roles;
- the redistribution reaches exactly the three approved destinations;
- `PRIMARY_MARKETER` remains 4.30%;
- the policy applies to every sector through one central source;
- future/unknown sector inherits the same policy if otherwise valid;
- exact-sum invariant for many payout sizes including values that produce remainders;
- deterministic remainder allocation;
- retired role cannot be newly assigned through active role APIs/UI;
- legacy historical rows remain readable and unchanged;
- RLS/authorization tests remain fail closed;
- same-head quality/security checks pass.

## Zero-loss acceptance rule

No implementation is accepted if any active code path, database policy, role assignment path, payout path, report, dashboard or sector-local configuration can still create a new `SECONDARY_MARKETER`, `SUPERVISOR` or `AREA_MANAGER` financial/operational role contrary to this decision.

No implementation is accepted if any financial allocation fails exact reconciliation.

## Safety boundaries

This design does not authorize direct Production database mutation, real money movement, payout execution, payment-provider changes, secret changes, DNS changes, Clerk configuration changes, country activation or owner seeding. Implementation proceeds through isolated branch/PR, TDD, local/rehearsal evidence and protected gates.

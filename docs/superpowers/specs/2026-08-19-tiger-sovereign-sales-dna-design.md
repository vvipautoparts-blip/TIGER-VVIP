# TIGER Sovereign Sales DNA Design

## Status

Owner-approved architecture for VVIP TIGER financial attribution. This specification is subordinate only to the owner authority at `docs/owner-control/VVIP_TIGER_OWNER_SALES_DNA_AUTHORITY_2026-08-19.md` and the machine contract at `project-control/commission-policy/v2/owner-decision.json`.

## Goal

Replace the prior active commission-attribution mechanism with deterministic per-sale lineage that scales to any number of sector managers and marketers while preserving one fixed 100% financial allocation.

## Financial invariant

The only active allocation is:

- OWNER 500 bps
- PARTNER_1 500 bps
- PARTNER_2 500 bps
- PARTNER_3 500 bps
- GENERAL_MANAGER 500 bps
- SECTOR_MANAGER 500 bps
- MARKETER 500 bps
- CUSTOMER_SUPPORT_POOL 150 bps
- TECH_CONTENT_OPS_POOL 150 bps
- PLATFORM_TREASURY_RESERVE 6200 bps

Total = 10000 bps. Manager or marketer population size never changes the per-sale 500 bps manager and 500 bps marketer allocations.

## Core model

A sale is financially attributable only through a `SalesDnaSnapshot`. The snapshot binds country, sector, responsibility cell, manager assignment epoch, marketer assignment epoch, financial policy version, and lock timestamp. Responsibility cells are routing objects only.

The standard zero-overlap invariant allows at most one sector-manager beneficiary and at most one primary marketer beneficiary for a sale. Collaborative-marketer splitting is not part of this implementation.

## Five-lock protocol

1. Identity Lock validates sale, manager, marketer, and assignment identifiers.
2. Sector Lock binds country, sector, and responsibility cell.
3. Lineage Lock binds manager and marketer assignment epochs.
4. Time Lock binds the assignment-effective instant and prevents retroactive hijacking.
5. Financial Lock binds policy version, beneficiary set, basis points, and canonical snapshot seal.

The implementation creates one canonical SHA-256 seal from stable ordered fields. Any mutation after lock changes the seal and fails verification.

## Sale ownership claim

A `SaleOwnershipClaim` binds one marketer to one customer/opportunity/sector context before the financial lock. The claim has a unique claim id, source, created timestamp, optional expiration, and status. Only an eligible, unexpired claim may become the primary marketer lineage.

## Assignment epochs

Manager and marketer assignment epochs are immutable records with explicit `validFrom`, optional `validUntil`, status, sector, and responsibility-cell scope. Marketer assignment includes the manager-assignment id. A new assignment creates a new epoch; it never rewrites an old epoch.

## Revenue address

The engine derives a non-PII `revenueAddress` from the locked lineage and policy. It is an opaque deterministic identifier and must not expose raw user ids.

## Missing attribution

Missing eligible manager attribution routes the 500 bps management share to `MANAGEMENT_UNATTRIBUTED_RESERVE`. Missing eligible marketer attribution routes the 500 bps marketing share to `MARKETING_UNATTRIBUTED_RESERVE`. Neither share silently goes to another beneficiary or increases the ordinary 6200 bps treasury share.

## Allocation

Allocation uses integer minor units and basis points only. The allocator must produce exactly the input `baseDistributableMinorUnits` across all buckets. Remainders are deterministically assigned to a dedicated `ROUNDING_ADJUSTMENT_ACCOUNT` so no beneficiary receives a silent rounding preference.

## Ledger contract

The engine emits immutable allocation instructions with a unique `financialEventId`, `saleDnaId`, `policyVersion`, `revenueAddress`, `snapshotSeal`, beneficiary role, beneficiary id or reserve account, amount in minor units, and basis points. Real ledger persistence remains a separate Production-controlled action.

## Security and isolation

Financial attribution is server-authoritative. Browser-provided manager, marketer, claim, assignment, percentage, or payout values are untrusted inputs. Runtime authorization must use RLS/ABAC or equivalent server-side scope enforcement.

## Deletion of prior active authority

The repository must remove the old commission-policy runtime module, its old policy contract, and its old policy-specific tests/spec/plan from active repository paths. Current project-state finance text must point only to this Sales DNA authority.

## Tests

Tests must prove:

- total bps is exactly 10000;
- manager population and marketer population do not alter per-sale bps;
- one standard sale cannot resolve two manager beneficiaries;
- one standard sale cannot resolve two primary marketer beneficiaries;
- assignment changes after lock cannot mutate an existing snapshot;
- the canonical seal changes if locked lineage fields are modified;
- missing manager/marketer routes to distinct unattributed reserves;
- allocation reconciles every minor unit exactly;
- duplicate financial event ids are rejected by the pure allocation contract;
- invalid identifiers and ambiguous assignment epochs fail closed.

## Non-goals in this repository phase

- Production database migration apply;
- real money movement;
- payout-provider activation;
- Production deployment;
- collaborative multi-marketer split;
- automatic treasury investment or yield.

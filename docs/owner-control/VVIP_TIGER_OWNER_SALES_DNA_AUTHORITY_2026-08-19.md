# VVIP TIGER — OWNER SALES DNA AUTHORITY

**Authority date:** 2026-08-19  
**Status:** CURRENT OWNER AUTHORITY  
**Machine contract:** `project-control/commission-policy/v2/owner-decision.json`

## Binding rule

This is the sole current financial-attribution authority for VVIP TIGER. Any earlier financial-attribution model has no active authority, no fallback path, and no right to re-enter runtime behavior.

## Fixed financial allocation

- OWNER: 5%
- PARTNER_1: 5%
- PARTNER_2: 5%
- PARTNER_3: 5%
- GENERAL_MANAGER — **مدير عام**: 5%
- SECTOR_MANAGER — **مدير القطاع**: 5%
- MARKETER — **المسوّق**: 5%
- CUSTOMER_SUPPORT_POOL: 1.5%
- TECH_CONTENT_OPS_POOL: 1.5%
- PLATFORM_TREASURY_RESERVE: 62%
- TOTAL: 100%

The 5% sector-manager allocation is per sale and belongs only to the manager resolved by that sale's locked Sales DNA. The number of managers in a sector never multiplies this 5%.

The 5% marketer allocation is per sale and belongs only to the marketer resolved by that sale's locked Sales DNA. The number of marketers in a sector never multiplies this 5%.

## TIGER Sovereign Sales DNA

Every new financially attributable sale resolves through one immutable lineage snapshot:

`Sale → Country → Sector → Responsibility Cell → Manager Assignment Epoch → Marketer Assignment Epoch → Financial Policy Version`

A Responsibility Cell is a routing object, not an administrative or financial role.

Each sale uses five locks:

1. Identity Lock
2. Sector Lock
3. Lineage Lock
4. Time Lock
5. Financial Lock

After Financial Lock, future reassignment cannot rewrite historical attribution.

## Zero-overlap invariant

Standard mode enforces:

- maximum one financial sector-manager beneficiary per sale;
- maximum one primary marketer beneficiary per sale;
- no retroactive reassignment of past sales;
- no duplicate distribution for the same financial event.

Missing manager attribution routes to `MANAGEMENT_UNATTRIBUTED_RESERVE`.
Missing marketer attribution routes to `MARKETING_UNATTRIBUTED_RESERVE`.
Neither route silently enriches another person or the ordinary treasury allocation.

## Financial truth

The immutable double-entry ledger is the financial source of truth. Dashboards, reports, analytics, and caches are projections only.

Every distribution must preserve integer minor-unit arithmetic, idempotency, compensating reversals, policy versioning, and full money lineage.

## Safety boundary

Repository implementation is authorized by this owner decision. Production database mutation, real-money activation, payouts, provider-secret changes, and protected Production deployment remain separate controlled actions and require their own exact runtime evidence and authorization.

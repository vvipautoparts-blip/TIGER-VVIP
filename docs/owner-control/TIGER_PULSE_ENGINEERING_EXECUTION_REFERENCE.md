# TIGER PULSE — Current Engineering Routing Reference

**Status:** `CURRENT ENGINEERING INDEX / NON-AUTHORITY / NEXUS_SUBORDINATE / NO_FALLBACK`
**Reconciled:** 2026-09-01

This file is an engineering routing index only. It does not create product, finance, pricing, launch, marketplace-intermediation, or Production authority.

## Mandatory authority order

Before any Pulse work, read:

1. `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
2. `docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`
3. `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
4. `docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`
5. `docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`
6. `config/fusion/current-authority.json`
7. `config/finance/current-distribution.json`
8. exact current Git SHA/tree and matching verification evidence.

The newest explicit owner-approved decision is the only current truth in its domain. Git history is provenance only.

## Current Pulse contract

- Current product: `TIGER NEXUS 2026`.
- Invariant: `ONE FEED • ONE OBJECT • ONE PULSE`.
- Pulse is optional paid visibility for the same eligible Living Sector Object; it is not a publication gate and does not create a second Marketplace object or composer.
- Current Pulse reference set: **2 / 10 / 20 / 45 JOD**.
- Those reference prices contain the approved **16% pricing baseline**. Country pricing is derived by recovering the untaxed base with `REFERENCE PRICE / 1.16`, then applying the verified statutory tax for the user's jurisdiction/transaction. The resulting country-specific displayed price is the final user charge; no second tax is added at capture.
- Current delivery modes: **NOW / SMART / PRECISE**.
- Purchased Pulse has no product-time expiry.
- Current consumption sequence: `RESERVE → SERVE → VERIFY → CONSUME`.
- Unqualified delivery is ZERO-BURN.
- Current ProofView runtime uses **50%** minimum viewport and **2000 ms** minimum continuous qualifying presence, plus foreground, object/placement eligibility, valid reservation, invalid-traffic rejection, and duplicate protection.
- Current browser-safe runtime is `scripts/nexus/pulse-runtime.js`; current UI surface is `scripts/nexus/pulse-surface.js`; current qualification code is `scripts/nexus/proofview.js`.
- Pulse Vault is a platform-service visibility allocation, **not money and not a money wallet**.

## Marketplace boundary — no intermediation

VVIP TIGER marketplace intermediation role is `NONE`.

Pulse payment, when a lawful platform-service payment path is separately implemented and activated, is payment for VVIP TIGER's own visibility/advertising service only. It never turns VVIP TIGER into an intermediary, broker, agent, escrow provider, settlement provider, transaction representative, or transaction party between a seller and buyer or a service provider and beneficiary.

VVIP TIGER only advertises, supports discovery, reduces distance, and enables direct contact. Marketplace transaction negotiation, contracting, payment, delivery, and dispute handling remain directly between the transaction parties.

## Current finance boundary

The current finance authority is only `docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`, `docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md`, and `config/finance/current-distribution.json`.

Statutory tax is outside platform distributions and commissions. The current Pulse pricing baseline of 16% is a pricing calibration only and is distinct from the former internal `TAX_RESERVE` 16%.

`TAX_RESERVE` is **CANCELLED** under the latest owner decision. Known current allocation is **84%** and the remaining internal **16% is pending** an explicit owner decision; no beneficiary is invented. `CSR = 3%` remains inside ACTUAL_OPERATIONS 43%. Until the pending owner decision is resolved, final distribution execution remains **fail-closed**.

## Current implementation truth

The current NEXUS Pulse runtime covers server-backed visibility allocation/vault behavior and verified delivery. No new real-money Pulse purchase/checkout feature slice is authorized by this engineering reference.

Legacy standalone Marketplace runtime/repository paths removed by the current convergence must not be restored as alternate transaction or payment flows.

## Retired engineering assumptions

This file must not restore or authorize any earlier independent Pulse program, money-wallet/top-up model, subscription model, parallel Marketplace creation flow, marketplace-party checkout/payment/intermediation, older exposure thresholds, older deduplication windows, old Wave execution chain, or deleted owner-binding path.

There is no independent `PULSE-A` through `PULSE-H` implementation program under current authority.

## Current execution lane

Current work remains PR #349 convergence only. No new Pulse feature slice begins from this file.

Protected sequence:

`CURRENT OWNER AUTHORITY → REGRESSION CONTRACT → RECONCILE MINIMALLY → DELETE PROVEN CONFLICT → EXACT-HEAD RUNNER-EXECUTED GREEN → REVIEW → PROTECTED MERGE → VERIFICATION`

PR #349 remains Draft. This file does not authorize Ready for Review, merge, Production/Staging mutation, provider/database mutation, migration application, credential changes, real-money activation, country activation, or gate weakening.

A workflow with no executed runner steps is blocked verification, not GREEN evidence.

## Latest-only rule

Any older Pulse engineering rule that conflicts with the current owner binding, NEXUS, Pulse authority, finance authority, country-tax pricing authority, zero-intermediation marketplace boundary, or current verified runtime is removed or corrected and is not preserved as an in-tree fallback, archive, trash copy, compatibility authority, or alternate execution program. Applied historical migration bytes remain immutable; Git history preserves source provenance.

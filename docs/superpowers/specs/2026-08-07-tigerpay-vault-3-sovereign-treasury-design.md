# TigerPay Vault 3.0 — Current Authority Boundary

Status: **SUPERSEDED by Issue #312 for third-party advertised goods/services commerce**

This path remains the compatibility entry point for the 2026-08-07 TigerPay Vault 3.0 design, but its former marketplace/customer/provider payment authority is **HISTORICAL_EVIDENCE_ONLY**. The byte-preserved historical design has been retained at `docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.HISTORICAL_EVIDENCE_ONLY.md` for audit and provenance.

## Current binding scope

TigerPay financial execution is limited to **platform-owned advertising and platform-owned services** under the current owner architecture. It MUST NOT create, authorize, broker, escrow, settle, pay out, or otherwise intermediate buyer/seller, user-to-user, user-to-provider, merchant/provider, order/listing, or other third-party advertised-goods/services transactions.

For third-party advertised goods/services, the authoritative platform path is:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**

Negotiation, agreement, service delivery, sale, payment, settlement, and deal completion occur outside TIGER.

## Preserved non-conflicting financial safeguards

The historical design remains useful only where its controls apply to platform-owned advertising/services finance without contradicting Issue #312, including deterministic server-side authorization, no AI money movement, no raw PAN/CVV storage, idempotency/replay protection, immutable accounting/evidence principles, provider authenticity verification, country-specific payment activation gates, and separation of payment/settlement/accounting/authorization/audit/AI concerns.

If any historical statement conflicts with Issue #312, `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`, or the zero-brokerage boundary, the current owner authority wins fail-closed.

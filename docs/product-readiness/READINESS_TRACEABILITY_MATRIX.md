# READINESS TRACEABILITY MATRIX

**Current commerce authority:** Issue #312 and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` control every user-to-user/user-to-provider commerce interpretation. External advertised-goods/services flow is **DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**. Historical transaction-value commission is `SUPERSEDED` / `HISTORICAL_EVIDENCE_ONLY` with `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`. Platform finance is separately limited to advertising, ad credits/packages and approved platform-owned services.

Sources referenced:

- Official Product Blueprint, only where non-conflicting with later owner authority
- Memory Map, as historical/context evidence only where non-conflicting
- UX-R01
- UX-R02
- UX-R03
- P08 security design / Steel Shield
- Issue #312 + Owner Architecture Authority Registry

| Requirement ID | Source | Requirement | Current evidence | Status | Backend dependency | Owner acceptance needed |
| --- | --- | --- | --- | --- | --- | --- |
| RTM-001 | Official Product Blueprint | Unified platform identity; sectors are additive shared-core classifications, not separate apps | PRODUCT_SCOPE_FREEZE.md + sector-registry contracts | Defined | Yes | Yes |
| RTM-002 | Official Product Blueprint + Memory Map | Sector classification where the active posting contract requires it | Scope freeze + taxonomy | Defined | Yes | Yes |
| ACCOUNT-001 | Owner authority | One base account per user; sectors/personas/roles do not create separate user accounts | PRODUCT_SCOPE_FREEZE.md | DOCUMENTED - BACKEND EVIDENCE SEPARATE | Clerk identity mapping + Supabase profile/role authorization | Yes |
| RTM-003 | Historical product policy | Listing-rate policy where still active | Current runtime/policy tests required | Requires exact-head verification | Yes | Yes |
| RTM-004 | Historical product policy | Media count/type policy where still active | Current F05/media contracts required | Requires exact-head verification | Yes | Yes |
| RTM-005 | Historical product policy | Listing price semantics where applicable | Current listing/ONE FIELD contracts required | Requires exact-head verification | Yes | Yes |
| RTM-006 | ONE FIELD / Issue #312 | Intent-led discovery, hard constraints, organic ranking, fit explanation, sponsored separation and contact handoff | ONE FIELD runtime + acceptance contracts | Implemented on convergence; environment evidence separate | Yes | Yes |
| RTM-007 | Issue #312 | Platform is not party to external deal payment/delivery/contracts; TIGER stops after contact handoff | Owner registry + fail-closed legacy transaction controls | ACTIVE AUTHORITY | Yes | No |
| RTM-008 | Tiger Care scope | Tiger Care behavior only where current implementation/policy still enables it | Current tests/evidence required | Requires verification | Yes | Yes |
| RTM-009 | Current authorization authority | Role separation and access-denied behavior | authorization/RLS contracts | Implemented portions; environment evidence separate | Yes | Yes |
| RTM-010 | UX-R01 + current control integrity | Clear denied/unavailable states; no fake success/dead controls | UX integrity tests | Release blocker until full surface sweep passes | Yes | Yes |
| RTM-011 | UX-R03 | No Production claim from design/UI/CI-only evidence | release/evidence gates | ACTIVE RELEASE RULE | No | No |
| RTM-012 | P08 security + Steel Shield | Security/release state must come from exact current SHA and live evidence where required | security workflows + evidence manifests | Exact-SHA gated | No | No |
| RTM-013 | Current messaging scope | Private communication boundaries; no feature implied without runtime proof | messaging contracts | Implemented portions; staging evidence separate | Yes | Yes |
| RTM-014 | Launch control | Country activation remains deny-by-default until legal/tax/ops gates pass | Issue #243 + country lifecycle controls | EXTERNAL EVIDENCE REQUIRED | No | Yes |
| FIN-312-001 | Issue #312 | No transaction-value commission on external user/provider deals | Owner registry + commission fail-closed policy | SUPERSEDED / NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION | Runtime guard required and present on convergence; live DB evidence separate | No |
| FIN-312-002 | Issue #312 | No buyer/seller/provider checkout, payment, escrow, settlement, fulfillment or deal close | owner registry + zero-brokerage DB/runtime guards | RETIRE_BROKERAGE / REDESIGN_DISCOVERY_ONLY | Runtime/DB guards + environment evidence | No |
| FIN-PLATFORM-001 | Issue #312 | Any TIGER finance is only advertising/ad credits/approved platform-owned services and their own obligations | TigerPay split-scope docs + provider/country release gates | KEEP_PLATFORM_FINANCE - PRODUCTION ACTIVATION SEPARATELY GATED | Yes | Yes |

## Evidence semantics

- `Defined` is documentation only; it is not runtime or Production evidence.
- `Implemented on convergence` means repository/runtime evidence exists on the convergence line; it does not imply Staging or Production proof.
- `EXTERNAL EVIDENCE REQUIRED` cannot become PASS through prose, CI, mocks or local rehearsal.
- A historical percentage, payment term, roadmap phase, blueprint row or old readiness label cannot reopen brokerage or transaction-value commission after Issue #312.
- No row in this matrix authorizes `main`, Production, Staging, provider-secret, legal-country activation, or remote database mutation.

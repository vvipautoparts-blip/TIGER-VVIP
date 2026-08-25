# READINESS TRACEABILITY MATRIX

## Current authority note

Issue #312 and `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` control the current external-commerce boundary: discovery → relevance → explanation → contact handoff, then TIGER stops. Transaction-value commission is `SUPERSEDED` / `HISTORICAL_EVIDENCE_ONLY` with `NO_RUNTIME_AUTHORITY_FOR_TRANSACTION_VALUE_COMMISSION`. Platform-owned advertising/services finance remains separately gateable as `KEEP_PLATFORM_FINANCE`.

Sources referenced:

- Official Product Blueprint, as amended by later owner authority
- Owner Authority Registry / Issue #312
- Memory Map as historical/execution context
- UX-R01
- UX-R02
- UX-R03
- P08 security design / Steel Shield

| Requirement ID | Source | Requirement | Current evidence | Status | Backend dependency | Owner acceptance needed |
| --- | --- | --- | --- | --- | --- | --- |
| RTM-001 | Official Product Blueprint + later owner authority | Unified platform identity; existing sectors preserved and future sectors/views additive | Blueprint + scope freeze + ONE FIELD architecture | Defined | Yes | Yes |
| RTM-002 | Official Product Blueprint + Memory Map + later owner authority | Listing creation remains compatible with existing sector inputs while semantic views are additive | Scope freeze + listing compatibility + semantic registry tests | Defined | Yes | Yes |
| ACCOUNT-001 | Memory Map / Owner authority | One base account per user; sectors, views and roles do not create separate user accounts | PRODUCT_SCOPE_FREEZE.md + authorization contracts | DOCUMENTED - NOT FULLY BACKEND-ENFORCED | Clerk identity mapping and Supabase profile/persona authorization | YES |
| RTM-003 | Historical product constraints | 4 listings/week historical launch limit where still applicable | Listing content policy | Requires current-policy confirmation | Yes | Yes |
| RTM-004 | Historical product constraints | Max 7 images, no video for current approved listing scope | Listing content policy + taxonomy | Defined | Yes | Yes |
| RTM-005 | Listing policy | Price validation where a listing type uses price | Listing policy + UI copy | Defined | Yes | Yes |
| RTM-006 | UX-R02 + ONE FIELD | Search/discovery by intent plus compatible sector/category/price/location projections | UAT plan + ONE FIELD semantic contracts | Partially evidenced | Yes | Yes |
| RTM-007 | Issue #312 / Owner Authority Registry | Platform discovers, explains relevance and hands off contact; it is not party to external payment/delivery/contracts | Owner authority registry + zero-brokerage runtime/DB locks | Defined / enforced in current branch contracts | Yes | No |
| RTM-008 | Memory Map | Tiger Care confirmation within 24h where service remains approved | Tiger Care SOP + copy catalog | Defined | Yes | Yes |
| RTM-009 | Role goals + authorization contracts | Role separation and access-denied patterns | Roles permissions matrix + UAT + Posting-As fail-closed tests | Defined | Yes | Yes |
| RTM-010 | UX-R01 | Access denied clarity and role-aware UX expectations | UX-R01 checklist + roles matrix | Partially evidenced | Yes | Yes |
| RTM-011 | UX-R03 | No production claim from design/UI references | UX-R03 handoff boundary | Evidenced | No | No |
| RTM-012 | P08 security design + Steel Shield | P08/P09 historical phase state cannot override current exact-SHA security evidence | Security docs + exact-head workflows | Evidenced | No | No |
| RTM-013 | Memory Map + policy constraints | One-to-one communication boundaries where current product scope requires them | Private communication rules | Defined | Yes | Yes |
| RTM-014 | Operational readiness requirement | Jordan controlled launch planning remains subject to current owner architecture and launch evidence | 48h launch plan doc | Defined | No | Yes |
| FIN-60D-001 | Issue #312 + current Product Scope Freeze | No external buyer/seller/provider payments, transaction-value commissions, escrow, settlement, fulfillment or deal closing; platform-owned advertising-service finance only through separate gates | PRODUCT_SCOPE_FREEZE.md + OWNER_AUTHORITY_REGISTRY.md + zero-brokerage contracts | `SUPERSEDED` for external-deal finance; `KEEP_PLATFORM_FINANCE` only for TIGER advertising/services | Platform finance backend only if/when separately activated | NO for brokerage; separate approval gates for platform finance |

## Notes

- Status `Defined` means requirement is documented and ready for owner/reviewer validation where still needed.
- Status `Partially evidenced` means supporting UX/planning evidence exists but backend/runtime enforcement is incomplete.
- `SUPERSEDED` means an older capability/decision is not a future option under current authority; it is not merely postponed.
- No row in this matrix claims Production authorization from documentation alone.

# Zero-Residue Semantic Audit — 2026-08-23

**Status:** implementation evidence for PR #321
**Scope:** active runtime/current UI/current migration sources relevant to the 2026-08-22 foundational invariants.
**Safety boundary:** this audit and its source migrations do not prove or perform Production/Staging deployment or remote database mutation.

## Governing rules checked

- automotive discovery/listing scope is parts/accessories/consumables/maintenance-related only; no whole-vehicle inventory;
- external buyer/seller/provider deals end at contact handoff; no transaction-value commission or TIGER brokerage;
- sensitive/work authority is capability-based; a role label is not authority;
- no one country/currency is a silent architectural master;
- mutable display labels must not become canonical IDs;
- stale current UI/runtime fallbacks must not revive superseded semantics.

## Findings and classifications

| Artifact | Finding at audit start | Classification | Resolution/current effect |
| --- | --- | --- | --- |
| `scripts/listing/listing-contract.js` | Current canonical parts-only listing contract already rejects whole-vehicle automotive inventory and includes full food scope/provenance. | `KEEP` | Remains canonical listing semantics. |
| `scripts/listing/listing-api-contract.js` | Legacy snake_case compatibility API silently defaulted `JO`/`JOD`, accepted arbitrary category IDs, and authorized status transitions from role strings such as `moderator`. | `MIGRATE` | Converged onto canonical category families plus safe legacy aliases; whole-car category fails closed; country/currency are explicit; transitions require explicit capabilities. |
| `tests/global-v1-listing-api.test.cjs` | Historical expectations asserted `JO`/`JOD` defaults and role-label authority. | `MIGRATE` | Rewritten to current invariant expectations; role strings are denied and explicit capabilities are tested. |
| `index.html` | Current marketplace search fallback invited search for a whole `سيارة`. | `RETIRE_ACTIVE` | Whole-car fallback wording removed; current copy uses parts/materials/real-estate/food/services semantics. |
| `scripts/vvip-i18n-translations.json` | Arabic/English search placeholders contained `سيارة` / `cars`. | `RETIRE_ACTIVE` | Current translations no longer advertise whole-car inventory. |
| `scripts/onboarding/pr38-account-types.js` (`broker`) | Description could be read as TIGER-managed brokerage between parties. | `MIGRATE` | Stable account-type ID retained for compatibility, but description now states an independent external professional and TIGER's discovery/contact-handoff boundary. |
| `supabase/migrations/202607240001_global_v1_core_schema.sql` (`auto_full_cars`) | Historical applied-source migration created a whole-car automotive category. | `HISTORICAL_EVIDENCE_ONLY` | Historical file is not rewritten. A forward-only retirement source deactivates the category and adds a future-write guard without deleting history. |
| `supabase/migrations/20260823033000_retire_whole_vehicle_automotive_category.sql` | New remediation source. | `KEEP` | Source-only forward migration: deactivates `auto_full_cars`; `NOT VALID` check preserves historical rows while blocking future violating inserts/updates once separately approved/applied. No remote apply is claimed. |
| `scripts/finance/vvip-commission-policy.js` | Name is historically commission-oriented and therefore required inspection. | `KEEP` | Runtime behavior is an explicit fail-closed retirement guard: active recipients are empty and brokerage entry points throw `BROKERAGE_COMMISSION_RETIRED`. It does not calculate current transaction-value commission. |
| `docs/architecture/LEGACY_SUPABASE_SCHEMA_BLOCK.md` and historical commerce docs classified by `OWNER_AUTHORITY_REGISTRY.md` | Contain legacy transaction/order/commission evidence. | `HISTORICAL_EVIDENCE_ONLY` | Preserve audit provenance only; they do not authorize current runtime behavior. |
| `scripts/social/permissions-control.js` | Permissions surface exists as a view-model but current public-profile runtime lacks an authoritative capability-grant data source. | `KEEP` | Deliberately remains view-model only with DOM integration not claimed; avoids a dead/fake permission control. |

## Regression evidence added

`tests/zero-residue-semantic-convergence.test.cjs` now requires all of the following together:

1. no silent country/currency default in the legacy listing API;
2. whole-vehicle automotive category is rejected;
3. role strings do not authorize listing status changes;
4. explicit listing capabilities authorize only defined transitions;
5. current Home and i18n search copy does not invite whole-car inventory;
6. broker-account wording preserves the TIGER discovery/contact boundary;
7. the forward retirement migration deactivates rather than deletes historical category state and uses a `NOT VALID` forward-write guard.

## Exact-SHA verification before this evidence commit

Implementation SHA:

`ec07daec80ed0550a8769ac5672158cbc57f15ea`

GitHub Actions results at that SHA:

- `VVIP Quality Gate` — SUCCESS;
- `TIGER CleanGuard` — SUCCESS;
- `Project Control Integrity` — SUCCESS;
- `Zero-Residue Full History` — SUCCESS.

The first migration attempt was intentionally rejected by the existing Steel Shield because it used scanner-hostile multiline `UPDATE` syntax and a `DROP CONSTRAINT`. The remediation changed only the migration formulation: the guarded update has an explicit same-statement `WHERE`, no constraint is dropped, and the existing quality gate was not weakened.

## Residual risk / non-claims

- The new migration is repository source evidence only. It has **not** been applied to a remote Supabase database by this PR.
- Existing historical rows, if any, may still contain `auto_full_cars`; the design intentionally preserves them for audit/history. The new guard concerns future writes when separately released.
- CI GREEN proves repository evidence at the tested SHA; it does not prove mobile-device behavior, native protected-view adapters, legal approval, payment-provider readiness, Production deployment, or remote database state.
- The permissions view-model is not presented as an active management UI until a real runtime capability source is connected and tested.

## Current semantic conclusion

For the audited active paths, the current repository authority is now aligned to:

```text
AUTOMOTIVE_WHOLE_VEHICLE_INVENTORY=false
COUNTRY_MASTER_DEFAULT=false
CURRENCY_MASTER_DEFAULT=false
ROLE_LABEL_IS_AUTHORITY=false
EXTERNAL_DEAL_COMMISSION=false
CONTACT_HANDOFF_IS_TERMINAL=true
HISTORICAL_EVIDENCE_IS_NOT_RUNTIME_AUTHORITY=true
```

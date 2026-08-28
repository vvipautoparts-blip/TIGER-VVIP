# TIGER Media DB Convergence — Owner Production Runbook

**Authority:** `docs/ai/SUPABASE_SAFETY_POLICY.md`, `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`, and the owner-approved Sovereign Constellation 2026 sequence.

**Production authority:** project `zelcngyyvbomuzokvuxo`, region `ap-northeast-2` (Seoul).

**Required forward migrations:** `20260816090001`, then `20260827120000`, then the mandatory no-visitor forward repair `20260828140000`.

## OWNER-ONLY MUTATION BOUNDARY

This runbook separates repository/read-only verification from Production mutation. Autonomous agents must not execute Production mutation. The owner executes the Production promotion only after every preflight below is GREEN and using the project-standard, explicitly approved protected migration mechanism.

The following actions are forbidden to autonomous agents against Production or any shared live project: `supabase link`, `supabase db push`, `supabase db reset`, `supabase migration repair`, destructive rollback, remote DDL, and remote DML. They are written here as prohibitions, not as executable instructions. Do not expose service-role credentials, database connection strings, or provider credentials in evidence.

No AWS runtime activation, live Sealed Build caller, Global Edge cutover, or Dark Bootstrap may begin until this runbook reaches `DB_CONVERGENCE=VERIFIED_LIVE` with a deterministic `evidenceSha256`.

## 1. Exact protected-main preflight

Run this only from a clean repository checkout after PR #342 has merged to protected `main`:

```bash
git fetch origin main
git checkout main
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
git rev-parse HEAD
```

Record the exact protected-main SHA. Do not continue if the worktree is dirty, local `main` differs from `origin/main`, or any later step uses a different source SHA.

Repository promotion evidence must show all **9/9** required protected PR workflows GREEN on the exact merged source, including the specialized **TIGER Media Finalizer DB Rehearsal**. The DB rehearsal must prove a clean local `supabase db reset --local`, the complete catalog/RLS/Storage/RPC contract, the no-visitor forward repair, owner binding, expiry, replay, and service-role isolation. The local reset is rehearsal-only and must never target Production.

## 2. Exact Production identity preflight

Use independently authenticated Supabase control-plane metadata before mutation. This authority must come from the authenticated project metadata response, not from SQL constants:

- `projectRef` is exactly `zelcngyyvbomuzokvuxo`;
- `region` is exactly `ap-northeast-2`;
- project state is healthy;
- current migration history is read only;
- the pending migration set is exactly `20260816090001`, `20260827120000`, `20260828140000`, in that order, and no other pending migration is bundled into this promotion.

If the project ref, region, health, current migration history, or pending migration set differs, **fail closed** and do not promote.

## 3. Why the third migration is mandatory

Production already has the later no-visitor hardening line in its migration history while the older Media finalization migration is missing. Applying `20260816090001` late can recreate the legacy Storage policy `vvip_listing_media_canonical_read` after the earlier no-visitor hardening removed it. `20260827120000` does not remove that policy.

Therefore `supabase/migrations/20260828140000_media_no_visitor_forward_repair.sql` is a mandatory forward repair. It re-drops the legacy canonical read policy and reasserts the authenticated-only `vvip_listing_media_canonical_member_read` authority after the two historical migrations. Do not rewrite old migration bytes and do not omit this repair from the owner promotion.

## 4. Close the Supabase Anonymous Sign-ins launch condition

The current Supabase Security Advisors report `auth_allow_anonymous_sign_ins` for both `public.vvip_marketplace_listing_media` and `storage.objects`. This is not accepted as harmless because the binding federated-identity ADR does not claim provider-dashboard settings are already correct.

Before `VERIFIED_LIVE`, the owner must disable **Supabase Anonymous Sign-ins** for Production through the owner-controlled Supabase authentication configuration. Do not automate this provider-setting mutation from an agent.

After the owner change, rerun Supabase Advisors. The release-relevant cache keys below **must be absent**:

- `auth_allow_anonymous_sign_ins_public_vvip_marketplace_listing_media`
- `auth_allow_anonymous_sign_ins_storage_objects`

Their repository classifications are `FIXED`, which means absence in the post-change live Advisors is mandatory. If either remains, **fail closed** and do not issue convergence evidence.

The expected post-migration warning for the browser-facing request RPC is different: `authenticated_security_definer_function_executable_public_vvip_marketplace_request_media_finalization_target_media uuid` is `INTENTIONAL_AND_TESTED` only if its exact grants, `SECURITY DEFINER` status, fixed search path, and authenticated-only execution contract all pass the read-only verifier. Claim/complete/fail RPCs remain service-role only.

The binding classification authority is `config/media-finalizer-supabase-advisor-classification.json`. Do not suppress or reclassify unrelated project-wide warnings such as other authentication, marketplace, commerce, social, or legacy findings.

## 5. Owner promotion

Only after Sections 1–4 are GREEN, the owner executes the approved migration promotion against project `zelcngyyvbomuzokvuxo` using the project-standard protected mechanism.

The forward-only promotion contains exactly, in order:

1. `supabase/migrations/20260816090001_sovereign_media_finalization.sql`
2. `supabase/migrations/20260827120000_sealed_media_identity_binding.sql`
3. `supabase/migrations/20260828140000_media_no_visitor_forward_repair.sql`

Do not rewrite historical migration bytes. Do not add an unreviewed migration to the same promotion. Do not perform a destructive rollback. If a migration fails, stop, preserve the failure evidence, and use a separately reviewed forward repair rather than improvising live DDL.

## 6. Immediate read-only live verification

Using a read-only Production query, verify migration history contains all three required versions and that the trusted job table and final no-visitor authority exist. Do not inspect user content.

The authoritative bounded catalog query is:

`tests/sql/media-finalizer-live-verification.sql`

This query is intentionally read-only live verification: it uses catalog/metadata and returns one bounded verifier row. It produces **no user rows** and **no storage object contents**.

The SQL verifier must not self-label a database as Production. It intentionally does not emit `projectRef` or `region`; those fields come only from the independently authenticated control-plane authority in Section 2. This prevents a staging or local database with a similar catalog from being mislabeled as Production.

The verifier row must contain exactly:

- `required_migrations = [20260816090001, 20260827120000, 20260828140000]`
- `contract_checks.migrations = PASS`
- `contract_checks.jobTable = PASS`
- `contract_checks.canonicalColumns = PASS`
- `contract_checks.requestRpc = PASS`
- `contract_checks.trustedRpcs = PASS`
- `contract_checks.rls = PASS`
- `contract_checks.storage = PASS`
- `contract_checks.tokenLease = PASS`

The Storage check must reject the legacy `vvip_listing_media_canonical_read` policy. The job-table check must prove `SELECT`, `INSERT`, `UPDATE`, and `DELETE` for `service_role` independently rather than relying on comma-separated any-of privilege semantics.

Any `FAIL`, missing field, extra field, different migration set/order, or inconsistent authority means **fail closed**.

## 7. Supabase Advisors post-apply gate

Run **Supabase Advisors** for both security and performance immediately after migration promotion and after the owner-controlled Anonymous Sign-ins change.

Normalize the bounded live advisor observations to cache-key arrays named exactly:

- `securityWarnings`
- `performanceWarnings`

Release-relevant Media classification rules:

1. both `auth_allow_anonymous_sign_ins` Media cache keys listed in Section 4 must be absent because they are classified `FIXED`;
2. `authenticated_security_definer_function_executable_public_vvip_marketplace_request_media_finalization_target_media uuid` may remain only as `INTENTIONAL_AND_TESTED` and only while the live verifier proves its bounded contract;
3. any new Media-specific WARN not represented by `config/media-finalizer-supabase-advisor-classification.json` blocks convergence;
4. unrelated project-wide warnings remain visible and must not be silently suppressed by this Media release slice.

If live advisor output conflicts with the classification authority, **fail closed**.

## 8. Deterministic evidence mapping

Calculate the SHA-256 of the canonical JSON form of `config/media-finalizer-supabase-advisor-classification.json`. The evidence helper is:

`scripts/release/media-cell-db-convergence-evidence.cjs`

Use its tested adapter `createMediaDbConvergenceEvidenceFromLive` with four bounded inputs:

```text
authority.projectRef          <- independently authenticated control-plane project ref
authority.region              <- independently authenticated control-plane region
verifierRow.required_migrations <- SQL required_migrations
verifierRow.contract_checks     <- SQL contract_checks
advisors.securityWarnings       <- live Security Advisor cache keys
advisors.performanceWarnings    <- live Performance Advisor cache keys
advisorClassificationSha256     <- canonical classification digest
```

The adapter performs the exact snake_case-to-evidence mapping; no undocumented manual transformation is permitted. The helper binds the authenticated authority, all three migrations, all eight checks, the live advisor observations, and the canonical classification digest into the evidence hash.

The helper must reject unknown keys, wrong project/region, a different migration set/order, any contract check other than `PASS`, either `FIXED` warning still present, a new unclassified Media warning, or a malformed/non-binding advisor digest. Timestamps and volatile advisor ordering do not participate in identity.

Only a successful helper result may state `DB_CONVERGENCE=VERIFIED_LIVE`; `VERIFIED_LIVE` is valid **only** when every database contract check and live advisor gate above are satisfied.

Persist the canonical evidence object and its `evidenceSha256` as the DB prerequisite for the subsequent live Sealed Build. Do not include credentials, user data, request bodies, Storage object contents, or volatile timestamps.

## 9. Handoff to Sealed Build

The database convergence gate is complete only when all of the following are simultaneously true:

- protected `main` source identity is exact and recorded;
- independently authenticated Production `projectRef` and `region` are exact;
- all three required migrations are live in the exact order;
- the read-only live verifier returns all eight checks as PASS;
- the legacy anonymous canonical Storage policy is absent;
- both Media anonymous-auth advisor findings are absent;
- the request-RPC SECURITY DEFINER finding, if emitted, matches the exact `INTENTIONAL_AND_TESTED` classification;
- no new unclassified Media WARN exists;
- deterministic evidence has state `VERIFIED_LIVE` and a valid `evidenceSha256`.

Only then may the next phase invoke the live Sealed Build caller. The later order remains: live Sealed Build → Seoul Runtime → Global Edge → Dark Bootstrap. No step may leapfrog its prerequisite.

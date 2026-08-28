# TIGER Media DB Convergence — Owner Production Runbook

**Authority:** `docs/ai/SUPABASE_SAFETY_POLICY.md`, `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`, and the owner-approved Sovereign Constellation 2026 sequence.

**Production authority:** project `zelcngyyvbomuzokvuxo`, region `ap-northeast-2` (Seoul).

**Required forward migrations:** `20260816090001`, then `20260827120000`.

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

Repository promotion evidence must show **9/9** existing protected PR workflows GREEN on the exact merged source plus the specialized **TIGER Media Finalizer DB Rehearsal** GREEN. The DB rehearsal must prove a clean local `supabase db reset --local`, the complete catalog/RLS/Storage/RPC contract, owner binding, expiry, replay and service-role isolation. The local reset is rehearsal-only and must never target Production.

## 2. Exact Production identity preflight

Independently verify before mutation:

- project ref is exactly `zelcngyyvbomuzokvuxo`;
- project region is exactly `ap-northeast-2`;
- project state is healthy;
- current migration history is read only;
- the pending migration set for this slice is exactly `20260816090001`, `20260827120000` and no other pending migration is bundled into this promotion.

If the project ref, region, health, current migration history, or pending migration set differs, **fail closed** and do not promote.

## 3. Close the Supabase Anonymous Sign-ins launch condition

The current Supabase Security Advisors report `auth_allow_anonymous_sign_ins` for both `public.vvip_marketplace_listing_media` and `storage.objects`. This is not accepted as harmless because the binding federated-identity ADR does not claim provider-dashboard settings are already correct.

Before `VERIFIED_LIVE`, the owner must disable **Supabase Anonymous Sign-ins** for Production through the owner-controlled Supabase authentication configuration. Do not automate this provider-setting mutation from an agent.

After the owner change, rerun Supabase Advisors. The release-relevant cache keys below **must be absent**:

- `auth_allow_anonymous_sign_ins_public_vvip_marketplace_listing_media`
- `auth_allow_anonymous_sign_ins_storage_objects`

Their repository classifications are `FIXED`, which means absence in the post-change live Advisors is mandatory. If either remains, **fail closed** and do not issue convergence evidence.

The expected post-migration warning for the browser-facing request RPC is different: `authenticated_security_definer_function_executable` for `public.vvip_marketplace_request_media_finalization(target_media uuid)` is `INTENTIONAL_AND_TESTED` only if its exact grants, `SECURITY DEFINER` status, fixed search path, and authenticated-only execution contract all pass the read-only verifier. Claim/complete/fail RPCs remain service-role only.

The binding classification authority is `config/media-finalizer-supabase-advisor-classification.json`. Do not suppress or reclassify unrelated project-wide warnings such as other authentication, marketplace, commerce, social, or legacy findings.

## 4. Owner promotion

Only after Sections 1–3 are GREEN, the owner executes the approved migration promotion against project `zelcngyyvbomuzokvuxo` using the project-standard protected mechanism.

The promotion is forward-only and contains exactly:

1. `supabase/migrations/20260816090001_sovereign_media_finalization.sql`
2. `supabase/migrations/20260827120000_sealed_media_identity_binding.sql`

Do not rewrite historical migration bytes. Do not add an unreviewed migration to the same promotion. Do not perform a destructive rollback. If either migration fails, stop; preserve the failure evidence and use a separately reviewed forward repair rather than improvising live DDL.

## 5. Immediate post-apply migration verification

Using a read-only Production query, verify migration history contains both required versions and that the exact required set is present. Verify the trusted job table now exists. Do not inspect user content.

The authoritative bounded catalog query is:

`tests/sql/media-finalizer-live-verification.sql`

This query is intentionally read-only live verification: it uses catalog/metadata and returns one bounded contract object. It must produce no user rows and no storage object contents.

The returned authority must be exactly:

- `project_ref = zelcngyyvbomuzokvuxo`
- `region = ap-northeast-2`
- required migrations = `20260816090001`, `20260827120000`
- `migrations = PASS`
- `jobTable = PASS`
- `canonicalColumns = PASS`
- `requestRpc = PASS`
- `trustedRpcs = PASS`
- `rls = PASS`
- `storage = PASS`
- `tokenLease = PASS`

Any `FAIL`, missing field, extra authority, wrong project, wrong region, or different migration set means **fail closed**.

## 6. Supabase Advisors post-apply gate

Run **Supabase Advisors** for both security and performance immediately after migration promotion and after the owner-controlled Anonymous Sign-ins change.

Release-relevant Media classification rules:

1. both `auth_allow_anonymous_sign_ins` Media cache keys listed in Section 3 must be absent because they are classified `FIXED`;
2. `authenticated_security_definer_function_executable_public_vvip_marketplace_request_media_finalization_target_media uuid` may remain only as `INTENTIONAL_AND_TESTED` and only while the live verifier proves its bounded contract;
3. any new Media-specific WARN not represented by `config/media-finalizer-supabase-advisor-classification.json` blocks convergence;
4. unrelated project-wide warnings remain visible and must not be silently suppressed by this Media release slice.

If advisor output conflicts with the classification authority, **fail closed**.

## 7. Deterministic evidence

Calculate the SHA-256 of the canonical advisor classification and feed the bounded live-verifier result plus that digest into:

`scripts/release/media-cell-db-convergence-evidence.cjs`

The helper must reject unknown keys, wrong project/region, a different migration set, any contract check other than `PASS`, or a malformed advisor digest. Timestamps and volatile advisor ordering must not participate in identity.

Only a successful helper result may state `DB_CONVERGENCE=VERIFIED_LIVE`; `VERIFIED_LIVE` is valid only when every database contract check is PASS and the advisor gate above is satisfied.

Persist the canonical evidence object and its `evidenceSha256` as the DB prerequisite for the subsequent live Sealed Build. Do not include credentials, user data, request bodies, Storage object contents, or volatile timestamps.

## 8. Handoff to Sealed Build

The database convergence gate is complete only when all of the following are simultaneously true:

- protected `main` source identity is exact and recorded;
- Production project/region are exact;
- both required migrations are live;
- the read-only live verifier returns all eight checks as PASS;
- both Media anonymous-auth advisor findings are absent;
- the request-RPC SECURITY DEFINER finding, if emitted, matches the exact `INTENTIONAL_AND_TESTED` classification;
- no new unclassified Media WARN exists;
- deterministic evidence has state `VERIFIED_LIVE` and a valid `evidenceSha256`.

Only then may the next phase invoke the live Sealed Build caller. The later order remains: live Sealed Build → Seoul Runtime → Global Edge → Dark Bootstrap. No step may leapfrog its prerequisite.

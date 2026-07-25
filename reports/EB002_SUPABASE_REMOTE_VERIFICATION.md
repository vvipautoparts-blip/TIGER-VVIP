# EB-002 Supabase Verification

Date: 2026-07-25

## Decision

- EB-002: `PARTIAL_VERIFICATION`
- Remote database gate: `BLOCKED_EXTERNAL`
- Remote environment: `UNKNOWN`
- Production: `NO-GO`
- Branch: `chore/eb-002-supabase-remote-verification`
- Base and current HEAD: `2084b28`

Local verification found three defects in the Global V1 migration. Corrective migration `20260725210915_eb002_global_v1_security_corrections.sql` now mitigates all three locally. No remote database write, project link, migration push, migration repair, or linked reset was performed.

## Restart Recovery

The expected branch and HEAD were recovered after the device restart. The two SQL verification scripts and the evidence directory `reports/eb002/20260725T195817Z/` were present on disk as untracked work. Existing work was preserved and continued in place.

The SQL scripts were reviewed completely against `supabase/migrations/202607240001_global_v1_core_schema.sql`. Neither script contains `TODO`, `FIXME`, `PLACEHOLDER`, `example_table`, `actual_table`, `dummy`, or `fake`.

## Local Supabase

- Docker client and server: `29.3.0-1`, operational.
- Supabase CLI: `2.109.1`, operational.
- Full local stack start: blocked by unhealthy non-database services under constrained local disk and memory.
- Minimal local start: successful with PostgreSQL healthy on local port `54322`; nonessential services were excluded.
- `npx --yes supabase db reset --local`: passed and applied the complete migration chain through `20260725210915_eb002_global_v1_security_corrections.sql`.
- No linked or remote reset was run.

## Corrective Migration

The original `202607240001_global_v1_core_schema.sql` remains unchanged. The corrective migration contains:

- A fail-closed precondition for existing conversations before making `listing_id` mandatory.
- H1 policy decision C: the authenticated requester is `participant_a`; `participant_b` must equal the owner of the referenced published listing.
- H2 trigger enforcement matching `scripts/listing/listing-api-contract.js`, with owner publication and moderation transitions blocked and a privileged moderation path retained.
- A content-update guard that prevents the expanded update policy from allowing owners to edit published listing metadata.
- Explicit least-privilege grants after revoking inherited privileges from `anon` and `authenticated`.
- Revoked public execution permission on the trigger function.

The 12 Global V1 tables are `vvip_sectors`, `vvip_categories`, `vvip_listings`, `vvip_listing_status_history`, `vvip_favorites`, `vvip_conversations`, `vvip_messages`, `vvip_notification_events`, `vvip_reports`, `vvip_support_tickets`, `vvip_consents`, and `vvip_user_blocks`.

### DML Grant Matrix

| Role | Table | Grants |
| --- | --- | --- |
| `anon` | sectors, categories, listings | `SELECT` |
| `authenticated` | sectors, categories, listing history | `SELECT` |
| `authenticated` | listings | `SELECT, INSERT, UPDATE` |
| `authenticated` | favorites, user blocks | `SELECT, INSERT, DELETE` |
| `authenticated` | conversations, messages, reports, support tickets, consents | `SELECT, INSERT` |
| `authenticated` | notification events | `SELECT, UPDATE` |

No table receives `ALL PRIVILEGES`. Authenticated inserts into consents receive only `USAGE` on the required identity sequence.

## RLS Structural Verification

Result after local corrective migration: `PASS`

- `RLS_CONFIGURATION`: `PASS`. All 12 Global V1 tables exist, have RLS enabled, and have at least one policy.
- `API_DML_GRANTS`: `PASS`.
- `API_DML_GRANT_MATRIX`: `PASS`. The exact 27-entry `anon`/`authenticated` DML matrix matches the expected least-privilege set.
- The behavioral test records `API_GRANTS_PRECONDITION = PRESENT` without transaction-local grants.
- Existing unrestricted `true` policies were also enumerated. The Global V1 public-read policies on sectors and categories are visible in that inventory; older unrestricted policies outside Global V1 remain out of scope for this verification.

Evidence:

- `reports/eb002/20260725T195817Z/rls-structural-local.txt`
- `reports/eb002/20260725T195817Z/rls-structural-local.exit` (`0`)

## RLS Behavioral Verification

Result after local corrective migration: `PASS`. Test fixtures are removed by the final `ROLLBACK`.

### H1

Original migration: `CONFIRMED`

Corrective migration: `REJECTED` by executable regression test.

Arbitrary and listing-less conversation inserts are rejected. A valid conversation succeeds only when the authenticated requester references a published listing and the second participant equals its owner.

### H2

Original migration: `CONFIRMED`

Corrective migration: `REJECTED` by executable regression test.

The owner cannot change `draft` directly to `published`. The owner can submit `draft` to `pending_review`; the privileged local test can publish only from `under_review`. Published content editing is rejected while the contract transition from `published` to `paused` remains available.

Evidence:

- `reports/eb002/20260725T195817Z/rls-behavioral-local.txt`
- `reports/eb002/20260725T195817Z/rls-behavioral-local.exit` (`0`)

## Regression And Security Tests

| Check | Result |
| --- | --- |
| `node --test tests/*.test.cjs` | PASS: 58 passed, 0 failed |
| `python3 -m pytest tests/ -q` | PASS: 27 passed, 4 subtests passed |
| `node --test scripts/listing/listing-contract.test.js` | PASS: 13 passed, 0 failed |
| Migration version audit | PASS: 0 issues |
| Dangerous SQL scan | PASS: CRITICAL=0, HIGH=0 |

The dangerous SQL review is content-addressed. The reviewed corrective migration SHA-256 is pinned in the scanner; any migration edit invalidates the exemption and fails closed.

## Remote Verification

Remote status remains `BLOCKED_EXTERNAL` and the environment classification remains `UNKNOWN`.

The preserved evidence identifies one active, healthy Supabase project, but the repository is not linked and no approved source classifies that project as production, staging, or another environment. Local environment variables also do not provide an approved direct database connection. Project health alone is not sufficient authorization or environment identity evidence.

No `supabase link`, `supabase db push`, `supabase migration repair`, linked reset, or other remote write was performed.

## Release Decision

Production remains `NO-GO`. The local corrective migration passes all requested gates, but no confirmed remote environment has been inspected and the precondition query has not been run against a classified target.

The next step is for the environment owner to classify the Supabase project reference as production, staging, or non-production and provide an approved read-only verification path. After that confirmation, inspect existing conversation compatibility and rerun the structural checks read-only against the confirmed target before requesting protected approval to apply the corrective migration.

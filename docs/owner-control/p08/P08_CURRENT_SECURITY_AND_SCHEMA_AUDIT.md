# P08 Current Security and Schema Audit

Status: design-only audit. No remote inspection, migration, RLS, or Storage change was performed.

## Identity Contract

- Canonical caller identity is the Clerk subject from `auth.jwt()->>'sub'`.
- `public.profiles.profile_id` remains the internal identifier; `clerk_user_id` is the canonical external identity mapping.
- New P08 policies must not use `auth.uid()` or `supabase_user_id`.

## Local Validation Result

On 2026-07-14, local `supabase start` with CLI `2.109.1` stopped while applying `20260628_otp_codes_rls_open.sql`:

```
ERROR: relation "public.otp_codes" does not exist (SQLSTATE 42P01)
At statement: 0
alter table public.otp_codes enable row level security
```

Classification: historical migration dependency missing; replacement required before a green local reset. This PR does not edit historical migrations. Production status is unknown.

## Broad-Policy Inventory

| Existing repository migration | Finding | Required P08 disposition | Production status |
| --- | --- | --- | --- |
| `20260628_otp_codes_rls_open.sql` | `using (true)` and `with check (true)` on OTP access | replacement required | unknown |
| `20260702_feed_posts_table.sql` | public read and insert policies use unconditional predicates | replacement required | unknown |
| `20260702_ai_analytics_ads_tables.sql` | analytics and ad settings policies use unconditional predicates | replacement required | unknown |

No broad predicate is approved as a P08 target policy. The secure migration sequence must establish tables and ownership helpers before replacing policies, then validate with least-privilege tests.

## Limits of This Audit

The local generated `supabase/config.toml` has Clerk disabled by default and is not evidence of remote Clerk configuration. Remote target, schema, policy, bucket, backup, and deployment state remain unverified.
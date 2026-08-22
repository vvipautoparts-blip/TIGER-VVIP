# TIGER SYNAPSE S1 Intent Foundation — SQL Security Review

## Exact artifact

- Migration: `supabase/migrations/20260818150000_synapse_intent_foundation.sql`
- SHA-256: `c854a7ebf64d6710a9eb9351044108a10b97a5c35f5afc330288232fc7df5072`
- Review status: `APPROVED_FOR_ISOLATED_REHEARSAL`

The migration is content-addressed in `scripts/security/p08-steel-shield/scan-dangerous-sql.sh`; any byte drift returns it to the unreviewed path.

## Boundary review

- `vvip_synapse_intents` is protected by `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Browser table privileges are revoked from `public`, `anon`, and `authenticated`.
- Writes are exposed only through two exact-signature `SECURITY DEFINER` RPCs with `search_path = pg_catalog`.
- The actor is derived from the trusted server-side actor resolver; client input cannot select `actor_subject`.
- `PRIVATE_LOCAL` is rejected by the persistence RPC, while `ASSISTED` and `LIVE_NETWORK` require explicit confirmation.
- Transition writes lock the actor-owned row, enforce expected revision, reject terminal resurrection, and require policy admission for `ACTIVE`.
- Expiry is bounded to the future and cannot exceed 30 days at creation.

## Steel Shield findings

The findings are expected and bounded for this new, unapplied migration:

- `CRITICAL = 0`
- `HIGH = 21`
- `NOT_NULL_RISK = 18` — integrity constraints on new-table columns.
- `UPDATE_WITHOUT_WHERE = 1` — the update is scoped by the locked actor-owned intent id; the scanner is lexical.
- `BROAD_GRANT_TO_AUTHENTICATED = 2` — exact `EXECUTE` grants on the two bounded RPC signatures; no table CRUD grant.

The exact baseline is accepted only together with the static contract tests and isolated Supabase rehearsal for the same source SHA.

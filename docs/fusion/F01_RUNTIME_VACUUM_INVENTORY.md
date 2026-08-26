# F01 Runtime Vacuum Inventory

**Status:** INVENTORY ONLY — NO DELETION AUTHORIZED

F01 converts “remove old clutter” into a measurable repository contract. Runtime-relevant files are inventoried and assigned one of:

`ACTIVE | MIGRATION_BRIDGE | TEST_ONLY | HISTORICAL_DOC | ORPHANED | DELETE_CANDIDATE`

## Safety rule

`DELETE_CANDIDATE` does **not** authorize deletion. Final removal belongs to F15 and requires dependency/reference scan, runtime reachability evidence, replacement coverage, tests, build/bundle comparison, and rollback evidence.

## Current migration principle

- `index.html` remains the primary active entrypoint until Single Surface migration changes that contract.
- Separate legacy HTML routes default to `MIGRATION_BRIDGE`, not deletion.
- `owner-control.html` and `private-profile-p03.html` are explicit migration bridges pending F02/F03 Single Surface + SOA/SCG replacement.
- PR36/resource-safety paths are protected retained foundations and cannot be automatically marked for deletion.
- Runtime assets are initially ACTIVE pending finer reachability analysis; F01 favors false retention over unsafe deletion.
- ORPHANED is never inferred from filename alone.

## High-risk cleanup families for later evidence

1. duplicate role-specific screens after Single Surface replacement;
2. obsolete preview/demo runtime that can be mistaken for live truth;
3. duplicate CSS/JS after import/reference graph proof;
4. abandoned routes after navigation/deep-link inventory;
5. duplicate media assets after content/reference proof;
6. stale experimental adapters/config after replacement and rollback evidence.

## FUSION invariant

Runtime Vacuum must never remove or weaken SOA, RLS, release security, financial ledger, country gates, audit, recovery, PR36 resource safety, or Strangler migration evidence required for safe transition.

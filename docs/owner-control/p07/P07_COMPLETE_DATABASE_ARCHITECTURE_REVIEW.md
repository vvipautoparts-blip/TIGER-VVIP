# P07 Complete Database Architecture — Review Only

This document is the real P07 architecture package started after PR71 merge.
PR41 is Preliminary Design Reference only and is not used as complete closure evidence.

## Coverage Checklist

- [x] 1. ERD كامل
- [x] 2. Machine-readable data dictionary
- [x] 3. Profiles
- [x] 4. Account types
- [x] 5. Sector publishing permissions
- [x] 6. Listings
- [x] 7. Listing media
- [x] 8. Trials
- [x] 9. Subscriptions
- [x] 10. Entitlements
- [x] 11. One-to-one conversations
- [x] 12. Messages
- [x] 13. Reports
- [x] 14. Moderation cases
- [x] 15. Tiger Care tickets
- [x] 16. Notifications
- [x] 17. Audit logs
- [x] 18. Primary keys
- [x] 19. Foreign keys
- [x] 20. Unique constraints
- [x] 21. Check constraints
- [x] 22. Index strategy
- [x] 23. Data ownership rules
- [x] 24. Public/private/sensitive/admin classifications
- [x] 25. Clerk canonical identity resolution
- [x] 26. Account lifecycle
- [x] 27. Listing lifecycle
- [x] 28. Media lifecycle
- [x] 29. Retention and soft-delete strategy
- [x] 30. Arabic search normalization
- [x] 31. Pagination and scale contracts
- [x] 32. RLS design matrix — Review Only
- [x] 33. Storage policy matrix — Review Only
- [x] 34. Migration ordering plan
- [x] 35. Rollback plan
- [x] 36. Evidence Manifest
- [x] 37. Coverage tests proving every roadmap requirement is represented

## Coverage Matrix

- Machine-readable: docs/owner-control/p07/P07_COVERAGE_MATRIX.json
- Human-readable: docs/owner-control/p07/P07_COVERAGE_MATRIX.md

## Architecture Contracts

### Identity and Ownership

- Every user-owned entity references profiles.profile_id.
- Clerk JWT sub resolves canonically to profiles.clerk_user_id.
- Supabase-auth identity columns are not required in profiles under the Clerk-first model.
- Conversations use canonical unordered pair keys participant_low_profile_id and participant_high_profile_id.

### Lifecycle Contracts

- account lifecycle tracked in account_lifecycle_events.
- listing lifecycle tracked in listing_lifecycle_events with state transitions.
- media lifecycle tracked in media_lifecycle_events and listing_media soft-delete metadata.
- listing publication quota windows use Monday 00:00 UTC canonical week_start and exact 7-day [week_start, week_end) windows.
- listing published lifecycle enforces timestamp coherence and exact 120-day expiry relation.
- listing cover enforcement uses partial unique index on is_cover for active media plus atomic cover-switch service invariant.

### Data Classification

- public: published listing read models only.
- private: direct user data and messaging.
- sensitive: subscriptions, reports, identity mappings.
- admin: moderation cases and audit logs.

### Arabic Search Normalization

- normalization contract includes hamza, taa marbuta, and alef variants folding.
- tokenized search key columns planned for indexed search in P08.

### Pagination and Scale

- keyset pagination on created_at + primary key.
- avoid offset scans for high-volume listing feeds.
- indexes aligned with sector, state, recency, and ownership filters.

## Out of Scope in P07

- SQL implementation.
- migrations execution.
- RLS execution.
- storage policy execution.
- production mutation.

## Linked Deliverables

- ERD: docs/owner-control/p07/P07_DATABASE_ERD.mmd
- Dictionary: docs/owner-control/p07/P07_DATA_DICTIONARY.json
- RLS matrix: docs/owner-control/p07/P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md
- Storage matrix: docs/owner-control/p07/P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md
- Migration plan: docs/owner-control/p07/P07_MIGRATION_ORDERING_PLAN_REVIEW_ONLY.md
- Rollback plan: docs/owner-control/p07/P07_ROLLBACK_PLAN_REVIEW_ONLY.md
- Evidence manifests: docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md and docs/owner-control/p07/P07_EVIDENCE_MANIFEST.json

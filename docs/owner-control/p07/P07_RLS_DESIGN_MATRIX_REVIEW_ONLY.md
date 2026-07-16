# P07 RLS Design Matrix — Review Only

This document is review-only and does not apply SQL or RLS in production.

| Entity | Owner Role | Sector Admin Role | Platform Admin Role | Public | Notes |
|---|---|---|---|---|---|
| profiles | read own, update own | read sector subset | full read for moderation scope | no | sensitive profile data remains private |
| account_types | read own, update own | read sector subset | full read/write review | no | used for eligibility and publishing caps |
| sector_publishing_permissions | read own | read sector | full write | no | admin-managed policy table |
| listings | read own draft, write own | read sector, moderate sector | full write for moderation | published only | lifecycle-aware access |
| listing_media | read/write own listing | read sector listing media | full write moderation | no | storage links remain private |
| trials | read own | no | full write | no | billing-adjacent, sensitive |
| subscriptions | read own | no | full write | no | sensitive financial state |
| entitlements | read own derived | no | full write | no | quota enforcement |
| conversations | read if participant | no | access by approved case only | no | one-to-one only |
| messages | read/write if participant | no | access by approved case only | no | private content |
| reports | create own, read own | read sector reports | full write | no | trust and safety pipeline |
| moderation_cases | no | read assigned sector cases | full write | no | admin/safety domain |
| tiger_care_tickets | create/read own | no | full write for support | no | customer support |
| notifications | read own | no | full write | no | user inbox model |
| audit_logs | no | no | read/write | no | admin-only immutable record |
| clerk_supabase_identity_map | no | no | read/write | no | sensitive identity bridge |
| account_lifecycle_events | no | no | read/write | no | compliance and incident review |
| listing_lifecycle_events | no | read sector subset | read/write | no | moderation lineage |
| media_lifecycle_events | no | read sector subset | read/write | no | media compliance lineage |

## Notes

- Policy expressions are mapped in P08 and reviewed here only.
- No SQL execution, migration, or production mutation is performed in P07.

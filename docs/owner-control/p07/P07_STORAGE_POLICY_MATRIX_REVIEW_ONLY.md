# P07 Storage Policy Matrix — Review Only

This matrix defines design-time storage rules only.

| Bucket Class | Object Class | Writer | Reader | Retention | Notes |
|---|---|---|---|---|---|
| listing-media-private | listing image original | listing owner | owner + authorized moderation | lifecycle bound + soft-delete window | canonical source object |
| listing-media-derived | listing image optimized | backend processor only | owner + public listing readers (if published) | lifecycle bound | generated derivative |
| profile-assets-private | profile media | profile owner | owner + approved support | account lifecycle | not public by default |
| moderation-evidence | report attachments | reporter + moderation tooling | moderation/admin | legal/compliance retention | restricted access |
| tiger-care-attachments | support attachments | ticket owner + support tooling | support/admin + owner | ticket lifecycle + retention policy | private support data |
| audit-artifacts | signed evidence snapshots | platform services | admin only | long-term immutable retention | compliance archive |

## Storage Design Controls

- deterministic path naming by profile/listing identifiers.
- metadata tags for owner profile, sector, classification, and lifecycle state.
- policy hooks reserved for P08 implementation only.
- no runtime bucket mutation in this phase.

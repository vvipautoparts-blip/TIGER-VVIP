# P07 Storage Policy Matrix — Review Only

This matrix defines design-time storage rules only.

| Bucket Class | Object Class | Writer | Reader | Retention | Notes |
|---|---|---|---|---|---|
| listing-media-temporary-quarantine | temporary upload image | listing owner + trusted upload service | owner + processing service only | short TTL (minutes) | discarded after successful processing |
| listing-media-derived | listing image processed 4:3 derivative | backend processor only | owner + public listing readers (only when parent listing is published) | lifecycle bound | product-facing storage key uses processed derivative only |
| profile-assets-private | profile media | profile owner | owner + approved support | account lifecycle | not public by default |
| moderation-evidence | report attachments | reporter + moderation tooling | moderation/admin | legal/compliance retention | restricted access |
| tiger-care-attachments | support attachments | ticket owner + support tooling | support/admin + owner | ticket lifecycle + retention policy | private support data |
| audit-artifacts | signed evidence snapshots | platform services | admin only | long-term immutable retention | compliance archive |

## Storage Design Controls

- deterministic path naming by profile/listing identifiers.
- metadata tags for owner profile, sector, classification, and lifecycle state.
- temporary upload -> crop/zoom/reposition -> validation -> processed 4:3 derivative -> successful persistence -> discard temporary original.
- no durable storage of source uploads in product-facing buckets.
- maximum 7 images per listing, with exactly one cover image contract enforced in model layer.
- policy hooks reserved for P08 implementation only.
- no runtime bucket mutation in this phase.

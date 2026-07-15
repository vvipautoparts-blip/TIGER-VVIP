# VVIP TIGER — Image and Media Standard (P02)

## Scope

- Phase: P02
- Status: In Progress
- Purpose: Define the authoritative image-only preview behavior and the future-safe media contract.
- Out of scope: Real upload, backend storage, Supabase integration, production pipelines.

## Product Rules

- Photos only: true
- Video enabled: false
- Maximum photos per listing: 7
- Minimum photos per listing: 1
- First photo is cover: true
- Reorder supported: true
- Delete before publish: true
- Replace before publish: true

## Aspect Ratio and Sizes

- Standard aspect ratio: 4:3
- Master: 1600x1200
- Large: 1200x900
- Card: 800x600
- Thumbnail: 400x300
- Primary output format: image/webp
- Fallback format when needed: image/jpeg

## Crop and Approval Flow

1. Pick image
2. Validate mime and size
3. Open 4:3 crop stage
4. Drag image
5. Zoom in/out
6. Reset when needed
7. Approve image
8. Local processing only
9. Create derivatives (master/large/card/thumbnail)
10. Add to gallery in memory

## Cancellation Rules

- Cancel means no save, no gallery append, no success toast.
- Any temporary object URL is revoked immediately on cancel.

## Temporary Source Lifecycle

- temporary_source
- validated
- cropped
- normalized
- compressed
- derivatives_created
- temporary_source_deleted
- ready

Error path:

- temporary_source
- error
- temporary_source_deleted

## Privacy and Metadata

Future media processing must strip unnecessary metadata, especially:

- GPS latitude and longitude
- Device model and serial details
- Camera software data
- Non-essential EXIF payloads

Allowed future input types:

- image/jpeg
- image/png
- image/webp

HEIC/HEIF remains reserved until implemented and tested.

## Public Payload Contract

Public payload is restricted to:

- public_delivery_url
- width
- height
- aspect_ratio
- display_order
- is_cover
- alt_text

Not exposed to clients:

- owner_id
- raw storage path
- checksum
- crop history logs
- processing internals
- deletion job metadata

## Listing Card Content Rules

Above media:

- Save button
- Photos count
- Optional verified/VIP badge only when true

Below media:

- Listing title
- Price
- Optional city/region

Do not show private, technical, or internal fields in user UI.

## P02 Local Preview Constraints

- No API calls
- No Supabase writes
- No database writes
- No localStorage for image binaries
- Memory-only image state
- State clears on refresh
- URL.revokeObjectURL required on delete/cancel/unload

## Accessibility and UX

- Touch targets >= 44px
- Keyboard navigation for gallery thumbnails
- Focus-visible states required
- RTL-first rendering
- Honest empty/error/loading/disabled states

## No Video Rule

- No video upload controls
- No reels/live/gif upload in listing media flow
- No "future video" tease in P02 runtime UI

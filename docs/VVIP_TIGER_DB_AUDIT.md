# VVIP TIGER DATABASE AUDIT
## Official database audit before final schema execution

**Project:** VVIP TIGER  
**Mode:** Final execution after approved plan  
**Reference:** docs/VVIP_TIGER_MEMORY_MAP.md  
**Date:** 7/7/2026  
**Status:** Audit only - no database changes applied yet

---

## 1. Purpose

This document records the current Supabase database/schema situation before creating the official VVIP TIGER final schema.

This is not a migration file.

This audit prevents accidental damage, duplicated tables, weak policies, or mixing old test structures with the final platform architecture.

---

## 2. Current database files found

Main schema file:

- supabase-schema.sql
- Size: 902 lines

Current migration files:

- supabase/migrations/20260626_parts_vehicle_registry_id_compat.sql
- supabase/migrations/20260627_vehicle_registry_compat.sql
- supabase/migrations/20260628_otp_codes_rls_open.sql
- supabase/migrations/20260702_ai_analytics_ads_tables.sql
- supabase/migrations/20260702_feed_posts_table.sql

Current Supabase functions:

- supabase/functions/phone-verification/index.ts
- supabase/functions/send-verification-email/index.ts

---

## 3. Existing tables detected in supabase-schema.sql

The current schema includes old and mixed tables such as:

- orders
- suppliers
- profiles
- commissions
- salary_payments
- user_sessions
- otp_codes
- buyers
- account_types
- vehicle_catalog / vehicle_registry compatibility
- parts
- review_requests
- admin_replies
- part_update_logs
- profile_meta
- service_center_services
- gallery_images
- approval_requests

These tables show that the project has useful previous work, but the structure is not yet the clean final VVIP TIGER schema.

---

## 4. Existing migration: feed_posts

File:

- supabase/migrations/20260702_feed_posts_table.sql

Detected table:

- feed_posts

Important fields:

- description
- media_kind
- visibility
- author_name
- author_handle
- like_count
- comment_count
- share_count
- created_at

Current issue:

media_kind currently allows:

- all
- images
- video

This conflicts with the approved VVIP TIGER rule:

- No video
- Images only

Current policy issue:

The migration currently has open policies:

- Anyone can read feed posts
- Anyone can insert feed posts

This is too open for the final platform and should not be treated as the final VVIP TIGER posting system.

Decision:

- feed_posts can remain as old/test feed structure for now.
- Do not build final posts logic directly on it without redesign.
- Final platform should use a cleaner posts + post_images model.

---

## 5. Existing migration: AI analytics and ads

File:

- supabase/migrations/20260702_ai_analytics_ads_tables.sql

Detected tables:

- feed_analytics_events
- ad_campaign_settings

Current issue:

The policies are open:

- Anyone can read analytics events
- Anyone can insert analytics events
- Anyone can read ad campaign settings
- Anyone can insert ad campaign settings

This is not acceptable for the final VVIP TIGER admin/reporting model.

Decision:

- Keep these tables temporarily.
- Do not rely on them for final admin reports until permissions are redesigned.
- Analytics and ad settings must later be protected by role-based policies.

---

## 6. Existing OTP migration

File:

- supabase/migrations/20260628_otp_codes_rls_open.sql

Detected issue:

The name and policies suggest open OTP access.

Decision:

- This belongs to the older/manual auth direction.
- Since Clerk is now the official auth layer, this must not become the final authentication model.
- Do not expand OTP/manual auth unless explicitly requested.

---

## 7. Key conflicts with approved VVIP TIGER decisions

### Conflict 1: Video is allowed in old feed migration

Approved rule:

- No video
- Images only

Old migration:

- Allows video in feed_posts.media_kind

Action later:

- Final posts table must not allow video.
- If feed_posts remains, it must be classified as old/test or adjusted later with caution.

---

### Conflict 2: Public insert policies are too open

Approved rule:

- Platform must be controlled, premium, and protected.
- User actions must be tied to authenticated identity.
- Admin actions must be separated from normal user actions.

Old policies:

- with check (true)
- using (true)

Action later:

- Replace open public policies with authenticated/user-owned policies.
- Admin policies must use roles.
- Sensitive tables must not be publicly insertable/readable.

---

### Conflict 3: Old auto-parts structure is mixed with final platform direction

The project still contains useful auto-parts related tables, but VVIP TIGER now has three sectors:

1. Auto parts and car services
2. Materials and supplies
3. Real estate

Action later:

- Keep useful old tables as reference.
- Build final sector-based model cleanly.
- Avoid breaking existing pages before confirming dependencies.

---

### Conflict 4: Auth direction changed

Old files/tables include OTP/manual auth direction.

Approved current direction:

- Clerk is official authentication layer.
- Supabase stores platform data, profiles, posts, tickets, roles, and reports.

Action later:

- Link Clerk user IDs to Supabase profiles.
- Do not rebuild manual auth.
- Do not depend on OTP as primary login.

---

## 8. Final database direction

The final VVIP TIGER database should be built around:

- Clerk identity
- Supabase profiles
- sectors
- user sector access
- posts
- post_images
- contact_requests
- support_tickets
- ticket_messages
- admin_notes
- roles
- user_roles
- admin_activity_logs
- subscriptions
- account_status_history
- reports_snapshots

---

## 9. Tables that should be created or redesigned for final execution

Required final tables:

- profiles
- sectors
- user_sector_access
- posts
- post_images
- contact_requests
- support_tickets
- ticket_messages
- admin_notes
- roles
- user_roles
- admin_activity_logs
- subscriptions
- account_status_history
- reports_snapshots

Possible compatibility/reference tables:

- parts
- suppliers
- buyers
- vehicle_registry
- gallery_images
- approval_requests

Tables that should not drive final auth:

- otp_codes
- user_sessions if tied to old manual auth

Tables that need security review before use:

- feed_posts
- feed_analytics_events
- ad_campaign_settings

---

## 10. Recommended safe execution strategy

Do not delete old tables now.

Do not rewrite supabase-schema.sql immediately.

Use new official migrations for final VVIP TIGER structures.

Recommended next migration:

- supabase/migrations/20260707_vvip_tiger_core_schema.sql

This migration should:

1. Create sectors.
2. Insert the three approved sectors.
3. Upgrade or safely extend profiles for Clerk.
4. Create roles and user_roles.
5. Create posts and post_images with no video.
6. Add limits fields and expiry fields.
7. Create Tiger Care contact/ticket tables.
8. Create admin logs.
9. Prepare subscriptions/trial fields.
10. Enable RLS with safer policies.

---

## 11. Immediate next step

Before writing the migration, inspect current profile usage in frontend files:

- scripts/profile-loader.js
- scripts/supabase-auth-bridge.js
- scripts/require-auth.js
- auth-clerk-index.js
- private-profile.html
- public-profile.html

Reason:

The migration must not break current profile loading.

---

## 12. Audit decision

The current database is valuable, but it is not yet the final VVIP TIGER structure.

The correct path is:

- Preserve existing work.
- Avoid destructive changes.
- Create a clean final VVIP TIGER core migration.
- Use Clerk as identity source.
- Use Supabase as platform data layer.
- Fix open RLS policies gradually and carefully.
- Keep Mobile First and premium platform rules at the center.

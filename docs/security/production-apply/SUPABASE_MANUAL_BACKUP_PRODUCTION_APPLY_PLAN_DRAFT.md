# VVIP TIGER - Supabase Manual Backup and Production Apply Plan

Status: DRAFT ONLY  
Date: 2026-07-10  
Scope: Documentation and planning only. No production execution. No SQL apply. No Supabase changes. No Clerk changes.

---

## 1. Safe Checkpoint

This plan starts from the clean checkpoint after PR #3 was merged into main.

Known state:

- main was clean before this documentation branch was created.
- origin/main was synced.
- PR #3 was merged.
- Merge commit: b510f70.
- Supabase production was not touched.
- Clerk was not touched.
- No SQL was applied.
- Review-only SQL remains under:

docs/security/sql-review/

This document is a planning draft only. It is not approval to execute anything in production.

---

## 2. Hard Safety Rules

Before any future production execution:

1. Do not run SQL from VS Code.
2. Do not apply SQL during this draft-only phase.
3. Do not change Supabase production during this draft-only phase.
4. Do not change Clerk during this draft-only phase.
5. Do not expose secrets, JWT tokens, service_role keys, passwords, or dashboard screenshots with sensitive data.
6. Do not move review-only SQL into supabase/migrations unless explicitly approved later.
7. Any future SQL execution must be manual from Supabase SQL Editor after backup, review, approval, and rollback planning.

Current status:

DRAFT ONLY - DO NOT EXECUTE

---

## 3. Expected Review-Only SQL Location

Expected review-only SQL path:

docs/security/sql-review/20260709_vvip_tiger_atomic_profile_resolver_rpc_hardened_review.sql

This file must not be executed now.

This file must not be copied into Supabase now.

This file must not be applied to production now.

---

## 4. Manual Backup Plan

Before any future Supabase production apply, the following backup steps must be completed:

1. Open Supabase Dashboard.
2. Select the correct production project.
3. Go to Database > Backups.
4. Confirm the latest automatic backup exists.
5. Record the backup date and time.
6. If manual backup/export is available, create or download it.
7. Do not proceed if backup status is unclear.

Backup record template:

Backup date:
Backup time:
Supabase project:
Backup type:
Backup reference:
Confirmed by:
Notes:

---

## 5. Pre-Apply Schema Snapshot Plan

Before any future SQL apply, document the current state of affected objects.

Likely affected objects:

- profiles table.
- RLS policies related to profiles.
- RPC/function related to atomic profile resolving.
- Grants and permissions for authenticated users.
- Any related security definer function behavior.

Snapshot record template:

Object:
Current state:
Screenshot or reference saved:
Risk level:
Notes:

---

## 6. Future Production Apply Plan

If explicit approval is given later, the manual apply process should be:

1. Open Supabase Dashboard.
2. Select the correct production project.
3. Open SQL Editor.
4. Paste reviewed SQL manually.
5. Review the SQL again inside Supabase before running.
6. Run once only.
7. Save the Supabase execution result.
8. Immediately run verification checks.
9. Record results in the implementation log.

This document does not authorize running SQL.

---

## 7. Pre-Apply Checklist

Before any future production execution, all items must be confirmed:

- [ ] Git branch verified.
- [ ] Working tree clean.
- [ ] Backup exists.
- [ ] Backup reference recorded.
- [ ] Review-only SQL reviewed.
- [ ] SQL has no accidental destructive operation.
- [ ] SQL does not expose secrets.
- [ ] SQL does not weaken RLS.
- [ ] Clerk changes are not included.
- [ ] Frontend changes are not included.
- [ ] Rollback notes are prepared.
- [ ] Explicit approval received.

Required future approval wording:

Approved to apply reviewed SQL manually in Supabase production.

Without explicit approval, production execution remains forbidden.

---

## 8. Future Verification Plan

After any future approved apply, verify:

- Authenticated user can resolve only their own profile.
- Authenticated user cannot resolve another user's private profile.
- Anonymous user cannot access private resolver behavior.
- No secret, JWT, or service_role value is exposed.
- RLS remains strict.
- Private profile page works after Clerk sign-in.
- Browser console does not expose token, JWT, or secret values.
- Safe fallback remains available if RPC fails.

---

## 9. Rollback Plan

Rollback must be ready before any future execution.

Possible rollback options:

1. Restore previous function definition if available.
2. Drop and recreate only the affected function if safe.
3. Restore from Supabase backup if a serious issue occurs.
4. Revert frontend only if frontend was changed, which is not expected in this phase.

Rollback record template:

Rollback trigger:
Rollback method:
Responsible person:
Backup reference:
Expected downtime:
Verification after rollback:
Notes:

---

## 10. Final Gate

This document is a draft only.

Final status:

DRAFT ONLY - DO NOT EXECUTE

No Supabase production change.
No Clerk change.
No SQL apply.
No migration execution.

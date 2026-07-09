# VVIP TIGER Zero-Visible-Error Experience

## Purpose
This document establishes the official UX and engineering standard for VVIP TIGER: internal failures must never be exposed to users as raw technical errors. Any recoverable failure should become a safe, polished, Arabic-facing state with retry, recovery, or escalation paths.

## Product Principle
Users should never see raw technical errors.
Internal failures must become safe, polished, Arabic user-facing states.

The platform must not expose messages such as:
- Supabase error
- Postgres error
- Clerk error
- RLS error
- constraint error
- duplicate key
- profiles_email_unique
- network stack traces
- SQL details

Instead, the UI should present safe states such as:
- جاري المزامنة...
- تم تسجيل الدخول بنجاح
- حسابك آمن، ويتم تجهيز ملفك
- إعادة المحاولة
- متابعة إلى الصفحة العامة
- طلب مساعدة عبر Tiger Care

## Engineering Standard
Every feature should prefer the following sequence when an issue occurs:
1. classify the error
2. retry when safe
3. recover when possible
4. fall back to a safe mode
5. escalate to Tiger Care when recovery is not possible
6. document the behavior for future maintenance

This is the default pattern for the platform, not an exception.

## User Experience Rule
The user experience must remain calm, readable, and non-technical.

A failure may change the state of the page, but it must not reveal database, auth, or infrastructure internals. The user should always see a stable interface with a clear next action.

## Error Classification
All feature work should classify errors into operational groups rather than surface raw error payloads.

Recommended classes:
- authentication_missing
- duplicate_data
- profile_not_found
- network_or_service_unavailable
- recovery_failed
- unknown

Each class should map to a safe UX path, not a technical dump.

## Self-Healing Flow
The standard self-healing flow is:
1. attempt the primary read path
2. if the record is missing, attempt a safe create path
3. if the create path hits a duplicate condition, retry and recover
4. if recovery succeeds, render the normal success state
5. if recovery fails, render a safe fallback state
6. if the user still needs help, escalate to Tiger Care

The first adopted reference for this pattern is the Self-Healing Profile Gateway in [clerk-private-profile.html](../clerk-private-profile.html).

## Safe Fallbacks
When recovery is incomplete, the UI must stay useful.

Safe fallback expectations:
- show a polished status message instead of a stack trace
- offer retry
- offer navigation back to the public page
- offer Tiger Care escalation
- use local safe snapshots only when appropriate

## Tiger Care Escalation
Tiger Care is the official escalation path when automated recovery is not enough.

The UI should allow the user to request help without exposing internal failure details. The escalation message should remain user-friendly and operational, not technical.

## Local Safe Snapshots
Local storage may be used only for safe snapshots needed to improve continuity.

Allowed snapshot content is limited to non-sensitive profile metadata such as:
- email
- clerk_user_id
- account_status
- updated_at

Rules:
- do not store tokens
- do not store secrets
- do not store raw auth payloads
- do not store database error details
- do not store sensitive security data

## Security Boundaries
The zero-visible-error standard must stay within strict security limits:
- Do not store tokens.
- Do not store secrets.
- Do not expose internal IDs unless needed.
- Do not use service_role in frontend code.
- Local storage can only store safe snapshots when needed.
- No raw database or security messages in the UI.

## Modules Covered
This standard applies to all major platform modules:
- Auth
- Private profile
- Public profile
- Navigation
- Search
- Listings
- Media upload
- Company pages
- Membership
- Tiger Care
- Notifications
- Future wallet/billing

## Required Pattern for Future Features
Any new feature should follow the same structure:
- detect and classify errors early
- prefer recoverable flows over hard failures
- keep the user interface stable
- replace technical errors with safe, local language states
- provide retry and escalation paths
- document the adopted behavior in the repository

## Examples
Good:
- "جاري المزامنة..."
- "تم تسجيل الدخول بنجاح"
- "حسابك آمن، ويتم تجهيز ملفك"
- "إعادة المحاولة"
- "طلب مساعدة عبر Tiger Care"

Bad:
- "Supabase error"
- "Postgres error"
- "duplicate key value violates unique constraint"
- "profiles_email_unique"
- "RLS policy violation"

## Implementation Roadmap
1. Apply the zero-visible-error rule to all profile and auth surfaces.
2. Expand the self-healing pattern to navigation and search.
3. Introduce safe recovery flows for listings and media upload.
4. Add Tiger Care escalation to more modules.
5. Audit future features against this document before release.

## Current Adopted Reference
The current adopted reference for this standard is:
- Self-Healing Profile Gateway in [clerk-private-profile.html](../clerk-private-profile.html)
- Commit: `c8270c7` fix: add self-healing Clerk profile gateway
- Merge: `f528a13` merge: add self-healing Clerk profile gateway

## Status
- Standard adopted: yes
- Current state: stable
- Action type: documentation only
- Runtime changes in this step: none

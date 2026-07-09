# VVIP TIGER — Page Flow & User Journey Patch

## Purpose

This patch addresses the two actionable journey gaps found in `private-profile.html`:

- Clearer logout/sign-out access.
- Clearer home/public-profile navigation.

## Changes Applied

- Added a small private profile journey navigation bar.
- Added links to home and public profile.
- Added a safe sign-out button.
- Added scoped CSS for the journey controls.
- Kept user-facing behavior calm and non-technical.

## Safety Boundary

This patch does not modify:

- Supabase schema
- Supabase RLS
- Supabase RPC
- Clerk configuration
- Profile resolver logic
- Backend logic
- Payment logic
- Secrets or keys

## Result

The private profile page now provides clearer user movement through the intended journey:

Public page → login → private profile → return/home → logout.

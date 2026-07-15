# VVIP TIGER — Specialist Review Gate (Technical Internal Gate)

## Purpose

- Establish a consistent specialist review gate before and after each P02 change set.
- This is an internal technical review framework inside the repository.
- It does not claim a human specialist signature unless explicitly documented.

## Core Reviews

- Security Review
- Performance Review
- Privacy Review
- UX and Accessibility Review
- Database Review
- Authentication Review
- Payments Review
- Legal Review
- DevOps Review
- Amanah and Ihsan Review

## Mandatory Fields Per Change Set

- Relevant Specialty
- Pre-Execution Review
- Security Impact
- Performance Impact
- Privacy Impact
- UX and Accessibility Impact
- Amanah and Ihsan Impact
- Risk Level
- Pass Criteria
- Stop Conditions
- Rollback Plan
- Post-Execution Evidence
- Final Result: PASS / FAIL

## Human Specialist Required

- If a change requires certified legal/security/compliance decision, mark as Human Specialist Required.
- Do not implement that risky change inside the same execution without documented approval.

## P02 Gate Policy

- Security First
- Performance First
- Privacy First
- Amanah and Ihsan
- Minimal Safe Scope
- Evidence-Based Decisions
- Rollback Ready
- No Direct Main Changes
- No Production Changes

## Pre-Check Checklist

- Baseline state matches approved phase status.
- Scope is limited to P02 navigation and app shell.
- No Clerk/Supabase/SQL/RLS/Payments/Production changes.
- Route map has no fake or broken targets.

## Post-Check Checklist

- Node syntax checks pass for modified JS files.
- Duplicate ID scan passes for runtime pages.
- Missing navigation target scan passes.
- Secret scan passes.
- Unicode control scan passes on text files.
- Mobile viewport and RTL checks documented.
- Keyboard and focus-state behavior verified.

## Evidence and Rollback

- Evidence must include commands, outputs, and file-level references.
- Rollback must be possible through `git restore` for local edits and revert commit after merge.

## Final Gate Result

- PASS: all applicable gates pass and no stop condition triggered.
- FAIL: any critical gate fails or scope violation occurs.

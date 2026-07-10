# VVIP TIGER - PR #17 Launch Shell Runtime Target Selection

Status: TARGET SELECTION ONLY
Scope: Documentation only
Runtime impact: None

---

## 1. Purpose

PR #16 created the Launch Shell Inspection.

PR #17 uses the PR16 scan artifacts to select the safest first runtime target for the next launch-shell hardening step.

The next runtime goal is:

    No Blank Screen / No Dead Button

---

## 2. Source Data

This report is based on:

- docs/launch/pr16/VVIP_TIGER_PR16_HTML_FILES.tsv
- docs/launch/pr16/VVIP_TIGER_PR16_LINKS_AND_BUTTONS_SCAN.tsv

PR16 scan totals:

- HTML files found: 40
- Navigation/action indicators found: 1869

---

## 3. Top Action Surface

Top action file:

    approved/social-ui-before-tiger-care-feedback-fix-20260708.js

Action indicators in top file:

    140

Top action files summary:

    docs/launch/pr17/VVIP_TIGER_PR17_TOP_ACTION_FILES.tsv

Top HTML files summary:

    docs/launch/pr17/VVIP_TIGER_PR17_TOP_HTML_FILES.tsv

---

## 4. Target Selection Rule

The first runtime target must be selected using these rules:

1. Prefer a user-entry file or navigation shell file.
2. Prefer visible journey impact.
3. Avoid broad rewrites.
4. Avoid auth behavior changes.
5. Avoid Supabase/Clerk/SQL changes.
6. Avoid touching unrelated files.
7. Add safe fallback behavior only.
8. Preserve current working login/profile behavior.

---

## 5. Recommended Next Runtime Direction

The recommended next runtime PR should target one small visible launch-shell surface.

Candidate target to review first:

    approved/social-ui-before-tiger-care-feedback-fix-20260708.js

However, before modifying it, the next PR must inspect the exact file and choose one narrow change only.

Allowed next runtime changes may include:

- safe disabled-state handling,
- no dead button fallback,
- no blank screen fallback,
- user-safe unavailable message,
- defensive event handling,
- small loading/empty/error state guard.

Not allowed:

- broad page redesign,
- auth rewrite,
- Supabase changes,
- Clerk changes,
- SQL/migrations,
- changing profile ownership logic,
- touching many unrelated files.

---

## 6. Next PR Recommendation

Next PR:

    PR #18 - Launch Shell Runtime Guard

Expected mode:

    narrow runtime change

Expected first action:

    inspect selected target file and add a small safe guard for visible dead-button or blank-screen behavior.

---

## 7. Final Safety Rule

Do not make the platform feel bigger by making it riskier.

Make it feel safer, clearer, and more complete by improving the smallest visible surface first.

# VVIP TIGER - PR #18 Live Runtime Target Inspection

Status: INSPECTION ONLY
Scope: Documentation only
Runtime impact: None

---

## 1. Purpose

PR #18 begins the Launch Shell Runtime Guard phase.

The goal is not to modify runtime immediately.

The goal is to identify the safest live runtime target for a future small guard against:

- No Blank Screen
- No Dead Button

---

## 2. Why This Inspection Is Required

PR #17 identified the highest action surface by basename as:

    social-ui-before-tiger-care-feedback-fix-20260708.js

That file appears to be backup or historical by name.

Therefore, PR #18 must inspect live tracked runtime files and avoid modifying backup or historical files.

---

## 3. Inspection Outputs

This PR creates:

- docs/launch/pr18/VVIP_TIGER_PR18_LIVE_RUNTIME_CANDIDATE_FILES.tsv
- docs/launch/pr18/VVIP_TIGER_PR18_HTML_SCRIPT_REFERENCES.tsv
- docs/launch/pr18/VVIP_TIGER_PR18_LIVE_ACTION_SURFACE_SCAN.tsv
- docs/launch/pr18/VVIP_TIGER_PR18_LIVE_RUNTIME_TARGET_INSPECTION.md

---

## 4. Counts

Live runtime candidate files:

    27

HTML script/link references found:

    45

Live action indicators found:

    861

---

## 5. Initial Observations

Top live JavaScript file by lines:

    social-ui.js

Top live HTML file by lines:

    clerk-private-profile.html

Top live action-surface file:

    social-ui.js

Top live action-surface count:

    388

---

## 6. Target Selection Rule For Next Runtime PR

The next runtime PR must not modify a backup or historical file.

Allowed next runtime target should be:

1. A live tracked file.
2. Referenced by a live HTML page, or clearly part of the current launch shell.
3. Small enough for one narrow guard.
4. Related to visible user journey safety.
5. Safe to change without touching auth, Supabase, Clerk, SQL, or profile ownership logic.

---

## 7. Allowed Future Runtime Guard Types

Only one small guard should be selected later.

Allowed examples:

- user-safe message for unavailable button
- no blank screen fallback
- defensive click handler
- disabled-state explanation
- safe empty/loading/error state

Not allowed:

- broad redesign
- auth rewrite
- Clerk changes
- Supabase changes
- SQL or migration changes
- changing ownership or profile resolver logic
- touching many unrelated files

---

## 8. Final Safety Rule

PR #18 Step 1 is inspection only.

No runtime behavior changes are included in this PR.

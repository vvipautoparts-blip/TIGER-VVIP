# UX-R01 Visual Review Checklist

## Live Preview

- Local command: `python -m http.server 5502 --bind 0.0.0.0`
- Local route: `/operations-console/`
- State: opened in the host browser on 2026-07-16; response verified as `200`.
- Data boundary: all views below contain mock data only.

## Required Owner Screenshot Evidence

- [ ] Owner overview, desktop.
- [ ] Owner overview, mobile.
- [ ] Tiger Care inbox, desktop.
- [ ] Tiger Care inbox, mobile.
- [ ] Employee management.
- [ ] Internal employee profile.
- [ ] Role assignment drawer.
- [ ] Permission matrix.
- [ ] Moderation reports.
- [ ] Access Denied for `regular_user` or a direct forbidden route.

## Review Checks

- [ ] Owner overview is usable at desktop width.
- [ ] Owner overview has no overlap at mobile width.
- [ ] Tiger Care cards and filters remain usable at desktop and mobile widths.
- [ ] Employee list converts to labelled cards at small widths.
- [ ] Assignment modal fits mobile viewport and required reason validates.
- [ ] Permission matrix remains horizontally scrollable only inside its table wrapper.
- [ ] Moderation actions show confirmation.
- [ ] Access Denied is clear and non-technical.
- [ ] RTL order, focus styles, contrast and keyboard navigation are visually reviewed.
- [ ] No text is clipped, and no sensitive or real data is shown.

## Capture Constraint

No screenshot-capable browser engine is installed in this dev container. No PNG artifact is claimed by this document. The preview is open in the host browser for owner capture and visual approval; no dependency was added solely to generate screenshots.

## Owner Continuation Authorization

- Owner authorized continuation from preview to formal PR.
- Authorization date: 2026-07-16.
- Live preview was available on port 5502.
- Automated permission, navigation, connectivity, and accessibility checks passed.
- No generated screenshot evidence is claimed.
- Final production authorization is not granted.
- Backend authorization is not implemented.
- P08 remains paused and incomplete.
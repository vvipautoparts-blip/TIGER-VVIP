# PR36 Stale Artifact Audit

Classification only: no tracked, historical, backup, migration, or uncertain file is deleted or rewritten.

| Artifact | Classification/evidence | PR36 disposition |
|---|---|---|
| `.vscode/launch.json` | PR35 reported retired public-profile URLs. | Repaired later by clean-room stabilization. |
| Historical/duplicate snapshots reported by PR35 | Removed after canonical-file and runtime-reference proof. | Recover from Git history only if required. |
| `private-profile.html`, `clerk-private-profile.html` | Redirect compatibility shims; `private-profile-p03.html` is canonical. | Preserve; add no PR36 include. |
| Absent `public-profile.html`, `public-profile-p03.html`, `social-ui.js` | Retired surfaces guarded against restoration by PR35. | Do not recreate. |
| Root `auth.js`, `styles.css` and older references | Uncertain legacy surfaces not in current canonical PR29–PR35 import map. | Preserve unchanged. |
| `docs/VVIP_TIGER_OFFICIAL_PRIVATE_PROFILE_UI.md`, `docs/VVIP_TIGER_POST_OPTIONS_TIGER_CARE.md` | Historical claims superseded by current routes/imports. | Preserve unchanged. |
| `docs/launch/pr34/*`, `docs/launch/pr35/*` | Immutable historical launch/review evidence. | Preserve; execute gates and report actual results without weakening them. |
| Existing SQL, migrations, Supabase functions, review-only PR35 SQL | Protected production-sensitive or historical artifacts. | Preserve; never execute, deploy, edit, or delete. |
| PR31 `localPhotos`/source object-URL code | Active temporary behavior conflicting with approved lifecycle, not a stale file. | Surgically replace behavior; retain tracked shell. |
| PR31/PR32 `photoNames`/`photoFileNames` shape | Legacy filename metadata unnecessary under PR36 privacy. | Sanitizer discards names and keeps only clamped count/display metadata; no bulk storage rewrite. |
| PR36 URLs, bitmaps, canvases, workers, timers, provisional blobs, header buffers, input Files | Controller/session-owned temporary runtime artifacts. | Must be disposed on settle/cancel/timeout/remove/reset/pagehide/dispose; never tracked. |
| QA `mktemp` comparison files | Controller-owned temporary QA artifacts. | Remove with trap; never add to Git. |

Tracked deletions authorized: **none**. The manifest `deletions` array is empty. Uncertainty resolves to preservation; future repository cleanup requires separate owner authorization and scope.

Round 4 final audit: no PR36-created untracked/rebuildable dead artifact was proven unused. No artifact was deleted, and the classifications above remain current.

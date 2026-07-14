# PR35 Legacy and Unused File Audit

| Surface | Evidence | PR35 disposition |
|---|---|---|
| `index.html` | Firebase route destination, current imports, PR29–33 tests | canonical, may modify |
| `private-profile-p03.html` | both private shims redirect here; current imports | canonical, may modify |
| `private-profile.html` | redirect-only shim | preserve unchanged |
| `clerk-private-profile.html` | redirect-only shim despite older docs calling it official | preserve unchanged |
| `public-profile.html` | absent; Firebase redirects route | do not recreate |
| `public-profile-p03.html` | absent; Firebase redirects route | do not recreate |
| `social-ui.js` | absent; smoke test requires absence | do not recreate |
| `styles.css`, `auth.js` | older README/AGENTS references; not imported by canonical shell | no PR35 change |
| `approved/`, `backups/` | historical snapshots | audit-only, never modify/delete |
| root and migration SQL | historical/production-sensitive | no change; PR35 SQL only under review path |
| `.vscode/launch.json` | stale public-profile launch URLs | leave untouched; document later cleanup |
| `docs/VVIP_TIGER_OFFICIAL_PRIVATE_PROFILE_UI.md` | historical `clerk-private-profile.html` claim | preserve; superseded by route/import evidence |
| `docs/VVIP_TIGER_POST_OPTIONS_TIGER_CARE.md` | historical missing `social-ui.js` implementation | preserve; implement anew on canonical cards |
| `.vscode/launch.json` | still names retired public-profile launch routes | suspicious/stale candidate; preserve for owner review |
| `approved/` and `backups/` duplicate profile snapshots | many historical copies, not runtime imports | duplicate candidates; preserve all tracked files |
| root `auth.js`, `styles.css`, legacy private/public profile artifacts | older docs reference them but canonical PR29–33 imports do not | potentially stale; no PR35 deletion or edit |
| `AGENTS.override.md` | untracked orchestration instruction artifact, not product implementation | leave untouched and exclude from PR35 allowlist |

No tracked legacy file is deleted. Uncertainty defaults to preservation and later owner review.

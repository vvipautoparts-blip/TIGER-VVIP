# VVIP TIGER — Deletion Manifest

**Branch:** feat/global-v1-foundation-20260724-092530  
**Policy:** No file deleted without verified non-use, replacement confirmation, and rollback commit in Git history.

## No Deletions in This Mission

All existing files preserved. The following files were identified as candidates for future cleanup but are NOT deleted in this mission because:

1. They may be referenced dynamically or in undiscovered entry points
2. They contain Firebase authentication history that may be needed for reference
3. No explicit owner instruction to delete

### Candidates for Future Review (NOT DELETED)

| File | Reason | Risk | Replacement Needed |
|------|--------|------|--------------------|
| `auth.js` | Firebase client SDK code | LOW — not linked in index.html | Clerk only (auth-clerk-index.js) |
| `auth-supabase.js` | Legacy Supabase auth | LOW — verify no imports | scripts/supabase-auth-bridge.js |
| `firebase.json` | Firebase hosting config | LOW — separate product | Not needed for Clerk+Supabase path |
| `FIREBASE-EMAIL-SETUP.md` | Firebase email docs | LOW — documentation only | Keep for history |
| `clerk-test.html` | Test page | LOW — not linked in production | Can be removed after production verify |
| `private-profile.html` | Older profile page | MEDIUM — verify vs clerk-private-profile.html | Verify which is canonical |

### Verification Procedure Before Any Deletion
1. `grep -r "filename" .` — verify no text references
2. Check import graph — `grep -r "auth.js" .`
3. Verify not in package.json scripts
4. Verify not in CI workflows
5. Verify not in HTML link/script tags
6. Record in this manifest with SHA-256 of deleted file
7. Confirm Git history preserves file for recovery

## Files Confirmed Safe (Not Candidates)
- All `supabase/migrations/` files — NEVER delete migrations
- All `docs/` governance files — keep for compliance
- `privacy-policy.html`, `terms-of-service.html` — legal requirement
- All test files in `tests/` — keep all tests

# VVIP TIGER - PR #15 Clerk Private Profile Runtime Launch Hardening

Status: RUNTIME HARDENING - NARROW TARGET  
Target: clerk-private-profile.html  
Scope: First protected runtime change for the 48H Real Trial Launch.

---

## 1. Purpose

This PR begins runtime hardening for the first launch target:

    clerk-private-profile.html

The change adds a safe diagnostics layer to reduce the risk of sensitive console output and raw user-facing diagnostics during the controlled Jordan-first launch path.

---

## 2. What Changed

A small page-local safe diagnostics block was inserted into:

    clerk-private-profile.html

The block provides:

- safe diagnostic helper,
- redaction for common token/JWT/key/session/password patterns,
- debug disabled by default,
- localhost-only debug opt-in through vvip_debug=1,
- user-safe message helper,
- safe window error/rejection handlers.

---

## 3. What Did Not Change

This PR does not change:

- Clerk dashboard configuration,
- Supabase dashboard configuration,
- SQL,
- migrations,
- profile ownership logic,
- Supabase RLS,
- auth provider setup,
- production database state.

---

## 4. Security Behavior

The safe diagnostics layer is designed to avoid logging:

- JWTs,
- tokens,
- sessions,
- Supabase keys,
- passwords,
- raw private payloads.

Debug output is disabled by default and only allowed for localhost with:

    ?vvip_debug=1

---

## 5. Launch Benefit

This supports the 48H Real Trial Launch by reducing the chance that a real Jordan-first tester sees or causes sensitive diagnostics to appear in the browser console.

The visible experience remains calmer and safer.

---

## 6. Rollback

Rollback options:

1. Revert this PR.
2. Restore from backup:

    backups/clerk-private-profile.before-pr15-launch-hardening.html

---

## 7. Verification

Required checks:

- page still loads,
- Clerk login still works,
- private profile path still opens,
- no tokens/JWT/session values are printed by the new helper,
- no SQL/migrations changed,
- no Supabase/Clerk dashboard changes,
- changed files remain within the approved PR15 scope.


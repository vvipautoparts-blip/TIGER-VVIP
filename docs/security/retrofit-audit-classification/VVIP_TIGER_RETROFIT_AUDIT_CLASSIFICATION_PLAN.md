# VVIP TIGER - Retrofit Audit Classification Plan

Status: CLASSIFICATION ONLY  
Date: 2026-07-10  
Scope: Documentation and risk classification planning only. No runtime code changes. No Supabase changes. No Clerk changes. No SQL applied.

---

## 1. Purpose

PR #6 produced an existing code protection retrofit audit.

This PR classifies the audit output into a safe remediation plan before any code is changed.

The goal is to avoid random fixes and create a staged protection roadmap.

---

## 2. Safety Confirmation

This phase is classification-only.

Confirmed non-scope:

- No runtime code changes.
- No frontend changes.
- No auth changes.
- No Supabase changes.
- No Clerk changes.
- No SQL applied.
- No migration executed.
- No production changes.
- No matched source line contents copied into this plan.

---

## 3. Input File

The classification is based on:

```text
docs/security/retrofit-audit/VVIP_TIGER_EXISTING_CODE_PROTECTION_SCAN.tsv
```

The scan records only:

```text
indicator type
file path
line number
```

---

## 4. Summary

Total indicators:

```text
10631
```

Total files with indicators:

```text
153
```

Generated summary file:

```text
docs/security/retrofit-audit-classification/VVIP_TIGER_RETROFIT_AUDIT_CLASSIFICATION_SUMMARY.tsv
```

---

## 5. Classification Model

The audit indicators should be reviewed using the following risk model.

### Critical

Issues that may expose secrets, bypass identity, weaken RLS, expose private data, or allow unauthorized privileged behavior.

Examples:

- Real service_role exposure.
- Real private key or secret exposure.
- Token or JWT printed to user-visible logs.
- Private profile data accessible without verified identity.
- SQL/RLS weakness affecting production data.
- Admin action available to normal users.

### High

Issues that may not be confirmed exploitable yet, but touch sensitive trust boundaries.

Examples:

- Clerk token handling.
- Supabase RPC usage.
- Profile ownership logic.
- Frontend role/permission logic.
- Storage upload ownership.
- Private page access guards.
- Console logging near auth/profile flows.

### Medium

Issues that affect reliability, fallback safety, user trust, or may become security risks when combined with other issues.

Examples:

- Weak fallback behavior.
- Dead buttons.
- Technical errors shown to users.
- Redirects without clear guard.
- Retry/recover logic not standardized.
- DOM rendering needing XSS review.

### Low

Normal references or low-risk code patterns that should be documented but may not require urgent change.

Examples:

- Normal Supabase references.
- Normal Clerk references.
- Normal profile naming.
- Documentation-only mentions.
- Harmless category references.

### Normal / False Positive

Indicators that are expected and safe after manual review.

Examples:

- Security documentation mentioning secret/token terms.
- Audit reports mentioning risk words.
- Comments or docs that do not affect runtime.
- Safe references in already reviewed code.

---

## 6. Recommended Review Order

### Phase 1 - Secrets and Logging

Priority: Critical / High

Review:

- POSSIBLE_SECRET_WORDING
- CONSOLE_LOGGING

Goal:

- Confirm no real secret is committed.
- Confirm no token/JWT/service_role is printed.
- Confirm logs are admin-safe and user-safe.

### Phase 2 - Auth and Identity Boundary

Priority: Critical / High

Review:

- CLERK_USAGE
- SUPABASE_USAGE
- FRONTEND_ONLY_SECURITY_HINT
- NAVIGATION_AUTH_HINT

Goal:

- Confirm no frontend-only authorization.
- Confirm private profile access fails closed.
- Confirm Clerk/Supabase bridge is safe.

### Phase 3 - DOM and XSS Surface

Priority: High / Medium

Review:

- UNSAFE_DOM_PATTERN

Goal:

- Confirm no unsafe user-provided HTML rendering.
- Replace risky patterns later with safe text rendering or controlled templates.

### Phase 4 - Storage and Upload

Priority: High / Medium

Review:

- UPLOAD_STORAGE_HINT

Goal:

- Confirm size/type/path/ownership constraints.
- Confirm no trust in user-provided file metadata.

### Phase 5 - Fallback and UX Recovery

Priority: Medium

Review:

- FALLBACK_HINT
- NAVIGATION_AUTH_HINT

Goal:

- Standardize graceful fallback.
- Prevent dead buttons and crash screens.
- Avoid hiding dangerous failures.

---

## 7. Future Remediation Rules

Before any actual retrofit fix:

1. Use the Pre-Code Protection Gate.
2. Create a focused branch.
3. Change only the targeted flow.
4. Preserve working behavior.
5. Add built-in code protection.
6. Use fail-closed behavior.
7. Add user-safe fallback where needed.
8. Avoid frontend-only security.
9. Verify with commands and manual review.
10. Merge only through review gates.

---

## 8. Stop Conditions

Stop future remediation immediately if:

- A real secret is found.
- SQL/Supabase production becomes involved without approval.
- Clerk settings need changing without explicit approval.
- More files change than planned.
- A fix relies only on frontend hiding.
- A fallback hides a dangerous authorization failure.
- A change creates a user-facing crash or dead button.

---

## 9. Current Status

Classification plan created.

No code remediation has been applied yet.

Final status:

```text
CLASSIFICATION ONLY - DO NOT EXECUTE PRODUCTION CHANGES
```

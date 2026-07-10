# VVIP TIGER - Surgical Execution and Security Shield Rule

Status: OFFICIAL PROJECT RULE  
Scope: Applies before any terminal command, code change, database change, production change, security change, or platform-wide modification.

---

## 1. Core Principle

VVIP TIGER must be maintained like surgery, not hammering.

No random fixes.  
No fake solutions.  
No temporary patches presented as final solutions.  
No blind terminal execution.  
No production changes without review gates.  
No code without built-in protection.

Every change must be root-cause based, scoped, reversible, testable, secure by design, privacy by design, and safe for the user experience.

---

## 2. Mandatory First Gate Before Any Execution

Before any terminal command or code execution, the following must be clear:

1. Goal.
2. Root cause or exact reason.
3. Scope.
4. Non-scope.
5. Affected files, systems, or services.
6. Hacking and tampering risks.
7. Data leakage risks.
8. Secrets exposure risks.
9. Built-in code protection.
10. Authorization and least-privilege rules.
11. Fail-closed behavior.
12. User-safe fallback behavior.
13. Admin logging without secrets.
14. Backup or rollback plan.
15. Verification plan.
16. Stop conditions.
17. Whether explicit approval is required.

If these items are not clear, execution must not proceed.

---

## 3. Surgical Execution Rule

The platform must not be changed randomly.

Correct execution requires:

- Inspect current state first.
- Identify the real issue.
- Preserve stable work.
- Minimize change scope.
- Avoid unrelated edits.
- Use a safe branch.
- Validate before commit.
- Commit only reviewed work.
- Use PR review gates before merge.
- Keep production untouched unless explicitly approved.

Bad execution examples:

- Randomly editing files.
- Deleting stable code without proof.
- Changing many systems at once.
- Applying SQL because it might help.
- Hiding errors without logging.
- Trusting frontend-only protection.
- Shipping code without rollback.

---

## 4. Security Shield Rule

Security must be part of every feature, every flow, and every code change.

Every future implementation must consider protection from:

- Hacking.
- Tampering.
- Unauthorized access.
- Data leakage.
- Secrets exposure.
- Account abuse.
- Fraud.
- Fake content.
- Impersonation.
- Unsafe file upload.
- Broken access control.
- Unsafe admin actions.
- Unexpected failures.

Security is not a final polish step. Security is a first design rule.

---

## 5. Self-Protecting Code Standard

Code must protect itself by design.

Required standards:

- Validate inputs before using them.
- Normalize and sanitize user-provided data.
- Never trust frontend state as authority.
- Enforce authorization outside the frontend.
- Avoid exposing secrets, tokens, JWTs, service_role keys, passwords, or private config.
- Fail closed by default.
- Handle errors gracefully.
- Do not show technical error details to users.
- Log useful admin/debug information without sensitive data.
- Prevent dead buttons and broken user journeys.
- Use safe defaults.
- Limit risky behavior.
- Avoid broad permissions.
- Make sensitive operations auditable.

The frontend may guide the user, but it must not be the only security layer.

---

## 6. Zero-Trust Platform Design

VVIP TIGER must follow zero-trust thinking.

Do not trust:

- Browser state.
- Hidden buttons.
- URL parameters.
- Local storage.
- User-edited JavaScript.
- Client-side role labels.
- Client-side profile IDs.
- Uploaded file metadata.
- Any user input without validation.

Security decisions must be enforced through trusted layers such as backend logic, Supabase RLS, secure RPC behavior, Clerk identity verification, and strict permission checks.

---

## 7. Fail-Closed Rule

If the system is unsure, it must deny safely.

Default behavior for sensitive flows:

- Unknown user: deny.
- Missing session: deny.
- Invalid permission: deny.
- Unexpected role: deny.
- Unverified ownership: deny.
- Broken security check: deny.
- Database/RPC uncertainty: do not expose private data.

A failure must not accidentally become permission.

---

## 8. Least Privilege Rule

Every user, function, RPC, policy, storage rule, and admin action should receive only the minimum permission required.

Avoid:

- Global permissions when scoped permissions are enough.
- Admin-like behavior in normal user flows.
- service_role in frontend.
- Wide update/delete permissions.
- Public access to private records.
- Broad storage access.
- Unreviewed privileged RPC functions.

---

## 9. Defense in Depth

The platform must use layered protection.

Example structure:

1. Clerk verifies identity.
2. Frontend provides safe UX.
3. Supabase RLS enforces data boundaries.
4. RPC functions enforce controlled behavior.
5. Storage rules enforce file ownership.
6. Logs capture admin-safe diagnostics.
7. Fallbacks protect the user experience.
8. Review gates protect production.

No single layer should be the only defense for sensitive data.

---

## 10. User-Safe Fallback and Recovery

Any user-facing feature should include a graceful fallback.

Required structure:

1. Primary path.
2. Safe fallback path.
3. User-friendly message.
4. Silent recovery where safe.
5. Admin/debug logging without secrets.
6. No crash screen.
7. No dead button.
8. No token, JWT, service_role, password, or secret exposure.

The user should not feel the platform is broken when a recoverable internal issue happens.

---

## 11. AI-Assisted Safety Layer

AI may be used as an additional safety and quality layer, but it must never be treated as impossible to hack.

AI can help with:

- Scam detection.
- Abuse detection.
- Suspicious content review.
- Listing quality checks.
- Admin alerts.
- Pattern detection.
- Security review assistance.
- User-friendly fallback messages.

AI must not replace:

- RLS.
- Authorization.
- Secure backend checks.
- Input validation.
- Human review for critical actions.
- Backup and rollback planning.

AI is an assistant layer, not the only defense.

---

## 12. Existing Code Retrofit Rule

This rule applies to old code as well as new code.

Existing code should be reviewed gradually and safely.

Retrofit approach:

1. Inventory current files and flows.
2. Classify risk.
3. Identify frontend-only security.
4. Identify missing validation.
5. Identify missing authorization.
6. Identify weak fallback behavior.
7. Identify unsafe logging.
8. Identify secrets exposure.
9. Fix in small staged branches.
10. Preserve what already works.

Do not rewrite the whole platform randomly.

Correct principle:

Preserve what works.  
Harden what is risky.  
Replace only what is structurally unsafe.

---

## 13. Production Rule

Production systems must never be changed casually.

Before production execution:

- Backup must be confirmed.
- Exact SQL or change must be reviewed.
- Rollback must be ready.
- Explicit approval must be given.
- Verification must run immediately after.
- Results must be documented.

Without this, production execution is forbidden.

---

## 14. Final Rule

If the change is not understood, scoped, reversible, testable, and protected, do not execute it.

Final standard:

Surgical execution only.  
Security by default.  
Privacy by default.  
Self-protecting code.  
Zero-trust platform design.  
User-safe fallbacks always.  
No random hammering.

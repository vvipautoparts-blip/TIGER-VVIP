# VVIP TIGER - Surgical Execution Rule

Status: OFFICIAL PROJECT RULE  
Scope: Applies before any terminal command, code change, database change, production change, or platform-wide modification.

---

## 1. Core Principle

VVIP TIGER must be maintained like surgery, not hammering.

No random fixes.  
No fake solutions.  
No temporary patches presented as final solutions.  
No blind terminal execution.  
No production changes without review gates.

Every change must be root-cause based, scoped, reversible, testable, and safe for the user experience.

---

## 2. Mandatory Rule Before Any Execution

Before any command or code execution, the following must be clear:

1. What is the exact goal?
2. What is the root problem being solved?
3. What files, systems, or services may be affected?
4. What will not be touched?
5. What is the risk level?
6. What is the rollback plan?
7. What is the verification plan?
8. What are the stop conditions?
9. What user-facing fallback exists if something fails?
10. Is explicit approval required before execution?

If these items are not clear, execution must not proceed.

---

## 3. Safety Boundaries

The following systems require extra review gates:

- Supabase production
- Supabase SQL
- Supabase migrations
- Supabase RLS policies
- Clerk authentication
- Secrets and environment variables
- User identity/profile logic
- Payment/subscription logic
- Legal/disclaimer logic
- Admin permissions
- Public/private data exposure
- File upload/storage logic

No direct production change is allowed without backup, review, approval, and rollback notes.

---

## 4. User-Safe Fallback Standard

Any user-facing feature should be designed with a graceful fallback.

Required structure:

1. Primary path
2. Safe fallback path
3. User-friendly message
4. Silent recovery where safe
5. Admin/debug logging without exposing secrets
6. No crash screen
7. No dead button
8. No token, JWT, service_role, password, or secret exposure

The user should not feel the system is broken when a recoverable internal issue happens.

---

## 5. Root-Cause First

Before fixing symptoms, identify the real cause.

Bad approach:

- Randomly editing files
- Copying code without understanding scope
- Deleting stable work
- Changing many systems at once
- Applying SQL because it "might help"
- Hiding errors without logging them

Correct approach:

- Inspect current state
- Identify affected flow
- Minimize change scope
- Preserve working behavior
- Add fallback when needed
- Validate after change
- Commit only reviewed work

---

## 6. Execution Gate Template

Every implementation phase should include:

### Goal

What this phase is trying to achieve.

### Scope

What will be changed.

### Non-Scope

What will not be touched.

### Risk Level

LOW, MEDIUM, HIGH, or CRITICAL.

### Backup Plan

What must be saved or verified before execution.

### Rollback Plan

How to return to the previous safe state.

### Execution

The exact command or code change.

### Verification

How success will be confirmed.

### Stop Conditions

When to stop immediately and avoid continuing.

---

## 7. Production Rule

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

## 8. Platform Quality Standard

VVIP TIGER should aim for:

- Stable user journeys
- Clear premium experience
- Safe identity handling
- No secret exposure
- Clean navigation
- Predictable fallback behavior
- Structured logs for admins
- No chaotic feature additions
- No unreviewed destructive changes

---

## 9. Final Rule

If the change is not understood, scoped, reversible, and testable, do not execute it.

Final standard:

Surgical execution only.  
Root-cause solutions only.  
User-safe fallbacks always.  
No random hammering.

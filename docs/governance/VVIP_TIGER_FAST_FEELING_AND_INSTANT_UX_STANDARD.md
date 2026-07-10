# VVIP TIGER - Fast Feeling & Instant UX Standard

Status: OFFICIAL GOVERNANCE STANDARD  
Scope: Applies to all future VVIP TIGER code and retroactively to existing approved code through staged retrofit PRs.  
Mode: Performance, perceived speed, command safety, and premium user experience.  
Production effect: Governance only until implemented through separate scoped runtime PRs.

---

## 1. Purpose

VVIP TIGER must feel fast, calm, premium, and responsive even when the user's internet is average.

The standard is not only about raw network speed.

It is about perceived speed:

- the user sees an immediate response,
- the interface does not freeze,
- pages do not open as blank screens,
- every command has a visible state,
- failures recover safely,
- heavy data loads progressively,
- images do not block the experience,
- sensitive actions remain secure and fail closed.

This standard becomes a mandatory condition before writing or modifying any platform code.

---

## 2. Core Principle

Every user action must answer this question:

    Did the platform visibly respond immediately and safely?

If the answer is no, the code is incomplete.

---

## 3. Mandatory Fast Feeling Rules

### 3.1 No Blank Screen Rule

No page should leave the user facing an empty or frozen screen.

Every major page should have one of:

- app shell,
- skeleton loading,
- loading state,
- empty state,
- safe error state,
- retry option where appropriate.

### 3.2 Immediate Visual Feedback Rule

Every button, form submit, navigation action, upload, save, delete, contact request, and important command must have immediate visual feedback.

Examples:

- loading state,
- disabled state during processing,
- success state,
- safe failure state,
- retry state,
- clear user-friendly message.

### 3.3 No Dead Button Rule

No clickable element should appear functional without a real action, safe fallback, or explicit disabled state.

A dead button is considered a quality and trust failure.

### 3.4 App Shell First Rule

The main interface shell should appear before heavy data loads.

The shell may include:

- header,
- navigation,
- account area,
- page title,
- skeleton cards,
- safe placeholders.

### 3.5 Progressive Data Loading Rule

Large or non-critical data should load progressively.

Examples:

- profile basics first,
- statistics second,
- listings later,
- images only when visible,
- non-critical widgets after first render.

### 3.6 Skeleton Loading Rule

Use skeleton loading for feeds, cards, listings, profile areas, and image-heavy pages.

The skeleton should match the final layout closely enough to prevent visual jumping.

### 3.7 Image Performance Rule

Images are one of the biggest performance risks.

Any image-heavy feature must consider:

- thumbnail first,
- lazy loading,
- fixed aspect ratio,
- size limits,
- compression,
- avoiding original huge image display in feeds,
- no loading images outside the viewport unless needed.

### 3.8 Safe Command State Rule

Every user command should have a safe state model.

Recommended command states:

- idle,
- pending,
- success,
- failed,
- retrying,
- cancelled.

No command should silently fail.

### 3.9 Duplicate Submission Protection Rule

Forms and critical commands must prevent accidental duplicate submissions.

Examples:

- disable button while pending,
- request idempotency where applicable,
- clear pending state after completion,
- do not create duplicate posts, tickets, profile updates, or contact requests.

### 3.10 Safe Optimistic UI Rule

Optimistic UI is allowed only for low-risk reversible actions.

Allowed examples:

- favorite,
- save view preference,
- non-sensitive UI state.

Not allowed without server confirmation:

- auth,
- identity,
- permissions,
- admin actions,
- payment,
- subscription,
- delete,
- security-sensitive profile ownership,
- private data access.

### 3.11 Debounced Search Rule

Search and filters should avoid firing requests on every keystroke.

Use:

- debounce,
- minimum character threshold,
- pagination,
- loading state,
- empty result state,
- retry state.

### 3.12 Safe Cache Rule

Caching is allowed only when safe.

Never cache:

- JWT,
- Clerk session object,
- Supabase session object,
- service_role,
- secrets,
- private sensitive payloads,
- admin-only data.

Allowed with care:

- non-sensitive display preferences,
- short-lived profile display cache,
- public listing summaries,
- non-sensitive filter choices.

### 3.13 Request Budget Rule

Every new feature should consider how many requests it creates.

Avoid:

- repeated profile loading,
- repeated auth checks without reason,
- loading full collections when pagination is enough,
- realtime subscriptions where normal refresh is enough.

### 3.14 Realtime Scope Rule

Realtime should be used only where it creates clear value.

Good candidates:

- private messages,
- important notifications,
- Tiger Care ticket state,
- urgent admin/user status changes.

Avoid realtime for everything by default.

### 3.15 Mobile First Performance Rule

VVIP TIGER is mobile-first.

Every feature should consider:

- low memory devices,
- smaller screens,
- touch feedback,
- reduced motion where useful,
- image-heavy pages,
- slow CPU,
- safe Lite Mode later.

### 3.16 User-Safe Failure Rule

Any failure must produce a safe and respectful user experience.

The user should not see raw technical errors, stack traces, tokens, SQL errors, or third-party internal objects.

---

## 4. Tiger Command Queue Standard

VVIP TIGER should move toward a command-based action model.

A command is any user action that changes or requests something, such as:

- save profile,
- upload image,
- submit contact request,
- create listing,
- edit listing,
- delete image,
- send message,
- report abuse,
- request Tiger Care support.

Each command should eventually have:

- command id where useful,
- status,
- safe user message,
- admin-safe diagnostic,
- retry strategy where safe,
- no secret exposure,
- duplicate prevention.

This does not mean implementing a full queue everywhere immediately.

It means every new command must be designed as a safe stateful operation.

---

## 5. Fast Feeling Code Checklist

Before writing or merging any code, answer:

1. Does the user get immediate visual feedback?
2. Is there a loading state?
3. Is there an empty state?
4. Is there a safe error state?
5. Can the user retry safely?
6. Can the command be submitted twice accidentally?
7. Does the page show a blank screen while loading?
8. Are images lazy-loaded or optimized?
9. Is heavy data loaded progressively?
10. Are requests debounced, paginated, or minimized?
11. Is anything sensitive cached?
12. Are tokens/JWT/session objects ever logged?
13. Does the code preserve auth/security boundaries?
14. Does the code fail closed for identity uncertainty?
15. Does the UI remain premium, calm, and understandable?

If these are not answered, the code is not ready.

---

## 6. Existing Code Performance Retrofit Rule

This standard applies retroactively to existing approved code.

Existing code should not be rewritten randomly.

Retrofit approach:

1. audit,
2. classify,
3. select a small target,
4. apply a narrow fix,
5. verify,
6. merge through review gates.

Correct principle:

    Preserve what works.
    Speed up what is heavy.
    Add feedback where the user waits.
    Protect sensitive actions.
    Avoid mass rewrites.

---

## 7. Relationship to Security Rules

Speed must never weaken security.

Fast feeling is not permission to:

- trust frontend state,
- bypass backend checks,
- expose private data,
- cache secrets,
- hide auth failures,
- ignore RLS,
- log tokens,
- use service_role in frontend,
- skip user-safe fallback.

For sensitive operations, correctness and security come before optimistic speed.

---

## 8. Official Engineering Rule

Every future VVIP TIGER code change must pass both:

    Security Shield
    Fast Feeling & Instant UX

A feature is not complete if it is secure but feels frozen.

A feature is not acceptable if it feels fast but weakens security.

VVIP TIGER must be both:

    protected
    fast-feeling

# PR35 Tiger Care Workflow

## Intake

Authenticated users open Tiger Care from the account center or a listing three-dot menu. Categories: official management contact, support, complaint/report, missing category, rejection appeal, account issue, sector/access request, fraud/safety concern, and controlled other. No management phone number is shown.

Required input is category, subject, bounded description, and relevant scope/listing reference when applicable. Priority is suggested by policy but staff may change it only with permission and reason. The accepted confirmation is exactly:

`تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.`

No email-success copy appears unless a configured adapter confirms delivery.

## Lifecycle

`new -> acknowledged -> in_review -> waiting_user|escalated|resolved -> closed`, with the exact alternate transitions defined in the design spec. `cancelled` is allowed for the owner-isolated requester only while the ticket is `new`, or for authorized staff through the controlled graph with a reason. Cross-user cancellation returns the same not-found result as an absent ticket. Every sensitive transition produces audit input for a trusted append boundary.

## Routing and SLA

Routing filters active assignments by permission, scope, category/team eligibility, and current availability; it then uses deterministic least-open-ticket ordering with stable ID tie-break. No eligible assignee leaves the ticket unassigned and flagged for escalation. Urgent and fraud/safety requests enter the escalation lane without exposing internal classification to other users.

Initial response budgets are policy data: urgent 1 hour, high 4 hours, normal 24 hours, low 48 hours. These are internal operational budgets, not a promise of resolution. The exact 24-hour confirmation remains unchanged.

## Visibility

Requesters see only their own ticket, public messages, public status, and safe timestamps. Internal notes, staff-only routing reasons, other users, authorization assignments, and audit metadata are excluded. Staff see only tickets within explicit permission and scope.

## Offline behavior

Only a normal-user new-ticket submission may be stored as a sanitized session-scoped draft/queue item with `pending`, `sent`, or `failed`. Staff commands, internal notes, escalation, assignment, permission operations, and audit writes fail closed offline.

## PASS 03 local foundation

The executable local foundation is implemented as pure ES modules under
`scripts/pr35/`. It includes strict transitions, owner-isolated requester
projections, public-message/internal-note separation, deterministic routing,
assignment and escalation history, response SLA calculation, append-only
timelines, idempotency/replay resistance, session-only drafts and queueing,
bounded timeout/retry/cancellation, and explicit local/production adapters.

Local records are volatile review data only. The local adapter reports email
and notifications as `not_configured` unless a separately configured adapter
explicitly confirms notification delivery; it never sends email. The production
adapter denies operations until a verified trusted transport is provided and
never falls back to local success.

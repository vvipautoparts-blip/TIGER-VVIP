# Private Intent Engine — Execution Overlay

> **For agentic workers:** This overlay is mandatory whenever implementing post-linked commercial engagement under the approved Clean-Room Modular Core design.

**Decision:** `OWNER-PRIVATE-INTENT-001`  
**Approved amendment:** `docs/superpowers/specs/2026-08-31-private-intent-engine-owner-amendment.md`  
**Base design:** `docs/superpowers/specs/2026-08-31-cleanroom-modular-core-design.md`

## Precedence

The earlier foundation-plan statement that exact Likes/Comments/post-linked Messages privacy was `SOURCE-RECOVERY-LOCKED` is superseded. That privacy scope is now resolved by `OWNER-PRIVATE-INTENT-001`.

The foundation-domain-kernel plan remains valid because it does not implement the social engagement runtime. Do not add PIE behavior to that foundation slice by stealth.

## Required later social-runtime plan

Before implementing the Social Runtime slice, write a dedicated TDD implementation plan covering at minimum:

1. one `user_id + post_id` private-intent uniqueness constraint;
2. private `INTERESTED` state with no public list/count projection;
3. private `INQUIRY` visible only to user + post owner;
4. Post Interest Center owner projection;
5. inquiry classification and owner-approved Private Smart Reply delivery;
6. grouped notifications + urgent-contact path;
7. escalation of the same intent context into one-to-one conversation with post context pinned;
8. authorization tests proving third-user and employee-by-title denial;
9. block/report/spam/rate-limit behavior;
10. post-expiry behavior: no new intent path after expiry, existing context retained according to retention policy;
11. save/share separation from interest state;
12. analytics that never claim a sale without evidence;
13. exact-SHA integration/security/preview evidence.

## Explicit rejects

The future Social Runtime plan must fail any implementation that restores:

- public commercial comment threads;
- public interested-user lists;
- default public interest counts;
- automatic Inbox conversation creation for every inquiry;
- duplicate conversations for the same user/post context;
- employee access to private engagement solely due to job title.

## Safety

This overlay does not authorize Production, live database migration, payment, merge to `main`, release, or destructive legacy cleanup.
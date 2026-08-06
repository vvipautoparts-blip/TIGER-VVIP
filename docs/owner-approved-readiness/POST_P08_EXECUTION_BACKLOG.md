# POST P08 EXECUTION BACKLOG

This backlog is planning only. It does not start P09 and it does not authorize implementation.

## Epic List

| Epic ID | Objective | Dependencies | Acceptance criteria | Security requirements | Test requirements | Owner decision dependencies | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EPIC-01 | Architecture and repositories | Blueprint, memory map, checklist | Clean repository structure and ownership map | No secrets, no destructive git actions | Repo review and branch/worktree checks | Owner approval for structure | NOT STARTED / BLOCKED BY P08 |
| EPIC-02 | Clerk authentication | Auth policy and UI flow | Login, logout, reset, and identity mapping are clear | No password exposure | Auth flow tests | Owner approved auth direction | NOT STARTED / BLOCKED BY P08 |
| EPIC-03 | Supabase profiles | Identity mapping and profile model | Profiles are defined and linked to Clerk IDs | RLS and profile protection required | Profile create/read tests | Owner approval of profile fields | NOT STARTED / BLOCKED BY P08 |
| EPIC-04 | RLS and authorization | Data model and role matrix | Access control rules are defined | Least privilege and audit trail | Authorization denial tests | Owner approval of policy scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-05 | Account types and permissions | ODR-004, role matrix | User/account types are consistent | Sensitive data protection | Role-based access tests | Owner approval of registration policy | NOT STARTED / BLOCKED BY P08 |
| EPIC-06 | Listings | Taxonomy and content policy | Listing lifecycle and validation are defined | No invalid price or media bypass | Listing creation tests | Owner approval of listing constraints | NOT STARTED / BLOCKED BY P08 |
| EPIC-07 | Image processing and storage | Media policy | Crop, compress, and store images only | No video, no secret exposure | Image upload tests | Owner approval of media UX | NOT STARTED / BLOCKED BY P08 |
| EPIC-08 | Weekly posting limits | Posting policy | Limit enforcement is documented | Anti-abuse controls | Limit breach tests | Owner approval of quota policy | NOT STARTED / BLOCKED BY P08 |
| EPIC-09 | Search and filters | Taxonomy and discovery | Search supports sector, category, price, location | No private data leakage | Search/filter tests | Owner approval of discovery scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-10 | Private one-to-one messaging | Communication policy | One-to-one flow only | No group/broadcast leakage | Messaging tests | Owner approval of messaging scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-11 | Friend invitation flow | Communication policy | Friend request and invite limits are clear | No invite abuse | Invite limit tests | Owner approval of invitation rules | NOT STARTED / BLOCKED BY P08 |
| EPIC-12 | Tiger Care | Tiger Care SOP | Intake, SLA, and escalation are defined | No management phone exposure | Support flow tests | Owner approval of support workflow | NOT STARTED / BLOCKED BY P08 |
| EPIC-13 | Moderation | Moderation policy | Warning/restriction/suspension/ban ladder is defined | Evidence protection | Report and appeal tests | Owner approval of policy ladder | NOT STARTED / BLOCKED BY P08 |
| EPIC-14 | Admin dashboards | Roles and logs | Operational dashboards are scoped | Audit trail required | Admin action tests | Owner approval of dashboards | NOT STARTED / BLOCKED BY P08 |
| EPIC-15 | Conversation retention | Retention policy | 90-day retention is defined | Privacy controls | Retention/deletion tests | Owner approval of retention policy | NOT STARTED / BLOCKED BY P08 |
| EPIC-16 | Account deletion | Deletion policy | 30-day grace period is defined | Data minimization | Deletion lifecycle tests | Owner approval of deletion policy | NOT STARTED / BLOCKED BY P08 |
| EPIC-17 | Business verification | Business registration policy | Hybrid verification is defined | Sensitive document protection | Verification review tests | Owner approval of verification model | NOT STARTED / BLOCKED BY P08 |
| EPIC-18 | Mobile Android | Mobile direction | Android flow is documented | Device data safety | Android tests | Owner approval of device scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-19 | Mobile iPhone | Mobile direction | iPhone flow is documented | Device data safety | iPhone tests | Owner approval of device scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-20 | Web/PWA | Mobile direction | Web/PWA continuity is documented | Session and cache safety | Web/PWA tests | Owner approval of web scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-21 | Store readiness | Store checklist | Metadata, assets, and policies are planned | Privacy/legal readiness | Store readiness checklist | Owner approval of store prep | NOT STARTED / BLOCKED BY P08 |
| EPIC-22 | Observability | Operations and security | Logs, alerts, and incident traces are defined | No secret logging | Observability tests | Owner approval of telemetry | NOT STARTED / BLOCKED BY P08 |
| EPIC-23 | Backup and rollback | Incident readiness | Rollback and backup steps are defined | Safe recovery | Recovery drills | Owner approval of recovery procedure | NOT STARTED / BLOCKED BY P08 |
| EPIC-24 | Security | P08 security design | Hardening and threat controls are documented | No secret exposure | Security verification tests | Owner approval of security scope | NOT STARTED / BLOCKED BY P08 |
| EPIC-25 | Privacy | Legal draft and policies | Privacy notices and data handling are aligned | Sensitive data protection | Privacy checks | Owner approval and counsel review | NOT STARTED / BLOCKED BY P08 |
| EPIC-26 | UAT | Acceptance plan | Owner-facing test coverage is complete | Evidence collection only | UAT evidence review | Owner acceptance required | NOT STARTED / BLOCKED BY P08 |
| EPIC-27 | Jordan launch | 48-hour launch plan | Controlled launch runbook is documented | Incident controls | Launch rehearsal tests | Owner go/no-go approval | NOT STARTED / BLOCKED BY P08 |
| EPIC-28 | Post-launch subscription readiness | ODR-001 and ODR-002 | Publisher subscription readiness is defined | No financial execution yet | Billing readiness tests | Owner approval of pricing later | NOT STARTED / BLOCKED BY P08 |

## Notes

- This backlog is a planning artifact only.
- No implementation authorization is granted.
- P08 remains incomplete and P09 remains not started.

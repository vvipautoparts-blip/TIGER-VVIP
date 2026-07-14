# PR35 Permission Catalog

Permissions are stable IDs; roles are editable bundles. Every protected decision also needs an active assignment and contained scope.

The browser catalog is a UX mirror. Production authority remains unavailable until a verified trusted transport re-evaluates identity, assignment state, permission, scope, reason, and audit requirements.

| Permission | Sensitive/reason | Initial role bundles |
|---|---:|---|
| `owner.console.read` | no | Owner |
| `authorization.assignment.read` | no | Owner, Platform Admin (scoped) |
| `authorization.assignment.manage` | yes | Owner, Platform Admin below ceiling |
| `authorization.owner.manage` | yes | Owner only |
| `authorization.permission.delegate` | yes | Owner, eligible delegated admins |
| `care.request.create` | no | all authenticated users |
| `care.ticket.read.own` | no | all authenticated users |
| `care.ticket.read.scoped` | no | authorized operational roles |
| `care.ticket.acknowledge` | yes | Tiger Care, scoped managers/admins |
| `care.ticket.assign` | yes | Tiger Care lead, scoped managers/admins |
| `care.ticket.transition` | yes | Tiger Care, scoped managers/admins |
| `care.ticket.escalate` | yes | Tiger Care, scoped managers/admins |
| `care.ticket.resolve` | yes | Tiger Care, scoped managers/admins |
| `care.message.create.own` | no | ticket requester |
| `care.message.create.scoped` | no | assigned/authorized staff |
| `care.internal_note.read` | no | expressly authorized staff only |
| `care.internal_note.create` | yes | expressly authorized staff only |
| `care.routing.manage` | yes | Owner, Platform Admin, Tiger Care lead |
| `care.sla.manage` | yes | Owner, Platform Admin, Tiger Care lead |
| `audit.event.read.scoped` | no | Owner, scoped auditors/admins |
| `audit.event.append` | yes | trusted backend operation only |

Supported position bundles: Owner / Super Admin, Platform Admin, Sector Manager, Regional Manager, Area Manager, Group Manager, Campaign Manager, Sales, Marketing, Tiger Care / Support, Moderator, Service Provider, and Regular User. Operational people remain normal users; assignments attach positions, permissions, scope, validity, grantor, and status separately.

Scope levels are `platform`, `sector`, `region`, `area`, `team`. Cross-scope access requires a separate explicit assignment containing the needed permission. Role labels never bypass permission evaluation.

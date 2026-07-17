# ROLES PERMISSIONS ACCEPTANCE MATRIX

Requirement matrix only.
This document is not backend authorization and does not prove runtime enforcement.

## Role Matrix

| Role | What this role sees | What this role can do | What this role cannot do | Access Denied examples |
| --- | --- | --- | --- | --- |
| Owner / Super Admin | Full platform operations, reports, escalation state | Define policy direction, approve strategic decisions, assign top-level ownership | Bypass legal/privacy constraints | Access denied to direct password/token visibility |
| Platform Admin | Cross-sector operations dashboards and governance tools | Manage platform settings, role assignment workflows, operational review | Override owner-only strategic lock decisions | Access denied to owner-only governance actions |
| Sector Manager | Sector-specific queues, listings, incidents, team workload | Approve/reject sector listings, escalate to platform level, assign regional tasks | Manage unrelated sectors without delegated scope | Access denied when opening another sector admin panel |
| Region / Area Manager | Region-specific listing and operations context | Coordinate region operations, triage regional issues, route escalations | Global platform-wide policy overrides | Access denied on global control modules |
| Tiger Care | Ticket queue, request metadata, communication templates | Intake, classify, prioritize, assign, reply, escalate, close/reopen ticket | View passwords, tokens, hidden management numbers | Access denied when trying to view credential fields |
| Moderator | Pending review queue, reports, evidence references | Review content/reports, apply moderation actions per policy | Delete evidence outside policy, perform owner actions | Access denied on permanent policy edits |
| Operational employee roles | Assigned worklists, scoped operational modules | Execute assigned tasks within role boundaries | Self-escalate permissions or cross-role access | Access denied for non-assigned modules |
| Buyer Viewer | Public browsing surfaces | Browse listings and profiles with limited interaction | Create listing or access seller-only tools | Access denied on listing creation form |
| Buyer Standard | Browsing and standard buyer interactions | Search, save, initiate allowed private interactions | Perform admin/moderation actions | Access denied on admin dashboards |
| Individual Seller | Seller listing workflow and own profile state | Create/manage own listings within limits | Access other sellers' private controls | Access denied on foreign listing edit endpoints |
| Shops / service centers / dealers / companies / service providers | Business-capable listing surfaces and profile context | Publish and manage listings under account type constraints | Assume admin privileges without assignment | Access denied on role-management screens |

## Minimum Access-Denied Scenarios

- Unauthenticated user attempts protected operational route.
- Role opens module outside assigned scope.
- User attempts privileged action without required role.
- Any actor requests hidden management phone numbers.
- Any actor requests password/token visibility.

## Acceptance Notes

- This matrix defines target product behavior for owner acceptance.
- Backend and RLS enforcement remain separate implementation responsibility.
- No claim is made that this matrix is currently enforced in production.
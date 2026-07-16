# UX-R01 Role Catalog

All names and identities below are local preview vocabulary only.

| Role | Arabic label | Default scope | Visible operational areas |
|---|---|---|---|
| `owner_super_admin` | المالك / المدير الأعلى | global | All preview areas, including settings and audit. |
| `platform_admin` | مدير المنصة | global | Operations, users, reports and management without owner settings or Owner assignment. |
| `sector_manager` | مدير القطاع | sector | Sector listings, users, reports, Tiger Care and moderation. |
| `regional_manager` | المدير الإقليمي | region | Regional users, workers, listings, providers and escalation. |
| `area_manager` | مدير المنطقة | area | Area-level work queues and moderation. |
| `tiger_care_manager` | مدير Tiger Care | assigned_queue | Tiger Care queue, SLA and escalations. |
| `tiger_care_agent` | موظف Tiger Care | assigned_queue | Assigned tickets and alerts only. |
| `moderator` | المشرف على المحتوى والبلاغات | assigned_queue | Listings, reports and moderation actions. |
| `sales_manager` | مدير المبيعات | region | Future local sales workspace and reports. |
| `sales_agent` | موظف المبيعات | own_records | Assigned leads only; no full audit log. |
| `marketing_manager` | مدير التسويق | global | Future local marketing workspace and reports. |
| `campaign_manager` | مدير الحملات | sector | Future campaign workspace in scope. |
| `service_provider_coordinator` | منسق مزودي الخدمات | region | Local provider review workspace. |
| `authorized_role_assigner` | الشخص المخول بتعيين الأدوار | global | Employees, role assignment preview, matrix and audit. |
| `regular_user` | مستخدم عادي للمقارنة | own_records | Operations entry is denied. |

Owner roles cannot be granted from the standard preview assignment flow. Only `owner_super_admin` and `authorized_role_assigner` see the assignment action; this is visual behavior, not authorization.
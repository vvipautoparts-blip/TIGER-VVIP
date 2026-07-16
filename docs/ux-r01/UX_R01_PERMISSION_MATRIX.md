# UX-R01 Permission Matrix

## Scope model

| Scope | Preview behavior |
|---|---|
| `global` | Shows all mock records. |
| `sector` | Shows records matching the selected sector only. |
| `region` | Shows records matching the selected region only. |
| `area` | Shows records matching the selected area only. |
| `assigned_queue` | Shows queue or assignee-matched mock work only. |
| `own_records` | Shows records owned or assigned to the preview actor only. |

## Permission vocabulary

- **مسموح:** preview role can access the feature at its eligible scope.
- **محدود بالنطاق:** preview role can access only filtered mock records.
- **يحتاج موافقة أعلى:** UI represents a workflow that requires escalation.
- **غير مسموح:** route is denied and does not appear in navigation.

The interactive matrix renders the selected role across operations, users, account state, listings, moderation, Tiger Care, employees, role assignment, reports, audit, settings, and scope. `platform_admin` never receives owner settings or an Owner grant path; `moderator` cannot assign roles; and `regular_user` cannot enter the console.
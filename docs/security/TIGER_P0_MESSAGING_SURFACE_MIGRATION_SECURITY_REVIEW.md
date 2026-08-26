# TIGER P0 Messaging Surface Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824120000_social_messaging_surface.sql`
- SHA-256: `769a1f9bc537f3b324d8fc4a51206f24bb0553a6487168c77d109a284d8be602`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=2`
- `BROAD_GRANT_TO_AUTHENTICATED=2`

Both HIGH findings are exact `EXECUTE` grants on bounded browser RPCs:

- `vvip_social_list_conversations(integer)`
- `vvip_social_list_message_contacts(integer)`

`PUBLIC` and `anon` execute authority is revoked before the authenticated grants. The migration grants no direct table `SELECT`, `INSERT`, `UPDATE`, or `DELETE` authority and does not change existing durable table privileges.

## Conversation discovery boundary

`vvip_social_list_conversations(integer)` derives the Clerk-backed actor internally, requires the current social profile to be active, bounds the requested result count to `1..100`, and joins only active membership rows. It additionally requires the actor to be one of the conversation's two durable parties; a malformed membership row therefore fails closed and cannot turn an unrelated conversation into readable presentation.

The RPC returns only:

- opaque conversation/profile UUIDs;
- safe peer display name/avatar or the neutral unavailable tombstone;
- last-message preview and timestamps already authorized to that participant;
- durable read cursor and peer-only unread count;
- `can_message` derived from current lifecycle/block authority.

No `subject_low`, `subject_high`, `member_subject`, `sender_subject`, or other Clerk subject is serialized.

## Contact discovery boundary

`vvip_social_list_message_contacts(integer)` returns only safe active profile projection fields for current accepted friends. It excludes blocked pairs and bounds output to `1..100`. The current actor and peer subject remain internal query fields and are not browser output.

## Behavioral proof requirement

`tests/sql/tiger-p0-messaging-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves the exact RPC privilege boundary, safe contact/conversation discovery, malformed membership isolation, unread convergence, block behavior, lifecycle tombstones, and absence of raw subjects. A slice cannot close unless this proof and VVIP Quality Gate are both GREEN on the same exact SHA.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, payment surfaces, or remote database mutation.

## Approval rule

This review approves only SHA-256 `769a1f9bc537f3b324d8fc4a51206f24bb0553a6487168c77d109a284d8be602`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.

# TIGER P0-B Orphan-Safe Author Presentation Migration Security Review

Reviewed migration:

- `supabase/migrations/20260821120000_orphan_safe_author_presentation.sql`
- SHA-256: `a16eb9e91dd03b107c474a82362f3874c1de2112955c1d960262ce074a87a3a1`

## Steel Shield classification

- `CRITICAL=0`
- `HIGH=12`

The 12 HIGH scanner hits were reviewed against the exact migration bytes above. They are expected lexical matches and bounded authenticated RPC grants, not destructive or authority-widening SQL.

### `NOT_NULL_RISK` (2)

Both matches are `IS NOT NULL` predicates inside lifecycle/authentication checks. The migration does not add or tighten a table `NOT NULL` constraint.

### `UPDATE_WITHOUT_WHERE` (6)

All six matches come from `BEFORE INSERT OR UPDATE OR DELETE ON ...` trigger declarations for the six integrated Social mutation tables. They are trigger event clauses, not unbounded `UPDATE` statements.

The guarded tables are:

- `vvip_social_posts`
- `vvip_social_comments`
- `vvip_social_reactions`
- `vvip_social_bookmarks`
- `vvip_social_follows`
- `vvip_social_relationships`

The trigger calls `vvip_social_guard_active_actor_mutation()` and fails closed with `SOCIAL_PROFILE_INACTIVE` for a deactivated or deleted authenticated actor.

### `BROAD_GRANT_TO_AUTHENTICATED` (4)

The four grants are exact `EXECUTE` grants on bounded functions only:

- `vvip_social_actor_active()`
- `vvip_social_feed_page(integer, timestamptz, uuid)`
- `vvip_social_post_create(text, text)`
- `vvip_social_comment_list(uuid)`

`PUBLIC` and `anon` execute authority is explicitly revoked. Raw authenticated `SELECT`, `INSERT`, `UPDATE`, and `DELETE` authority on `vvip_social_posts` is revoked by the migration. The feed and post-create RPCs derive the current actor server-side and never serialize `author_subject`.

## P0-B security properties reviewed

1. Historical posts/comments remain readable through the safe presentation boundary when the author is deactivated or deleted.
2. Active authors expose only opaque `profile_id`, display name, avatar URL, and availability state.
3. Unavailable authors collapse to the neutral tombstone: `author_profile_id = null`, `author_display_name = 'عضو غير متاح'`, `author_avatar_url = null`, `author_available = false`.
4. Clerk subject remains internal to authorization joins and is not serialized by the safe feed/comment payloads.
5. Authenticated raw post reads are removed; browser reads use `vvip_social_feed_page`.
6. Post creation uses `vvip_social_post_create`; actor identity is derived server-side.
7. The active-actor trigger centrally protects the six currently integrated Social mutation tables, including existing SECURITY DEFINER mutation RPCs and relationship DML.
8. The migration contains no `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, `DROP COLUMN`, `DISABLE ROW LEVEL SECURITY`, `GRANT ... TO anon`, or destructive `CASCADE` operation.

## Approval rule

This review approves only SHA-256 `a16eb9e91dd03b107c474a82362f3874c1de2112955c1d960262ce074a87a3a1`. Any byte drift must invalidate the Steel Shield baseline and re-enter security review.

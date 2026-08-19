-- VVIP TIGER Social Post RETURNING RLS compatibility fix.
-- Forward-only repository migration. Remote/Production apply remains a separate protected gate.
-- Adds an owner-only permissive SELECT policy so INSERT ... RETURNING can pass RLS
-- without weakening block-aware visibility for any non-owner actor.

begin;
set local lock_timeout = '2s';

create policy vvip_social_post_owner_read_returning
on public.vvip_social_posts
for select
to authenticated
using (
    author_subject = (select public.vvip_marketplace_actor_id())
);

commit;

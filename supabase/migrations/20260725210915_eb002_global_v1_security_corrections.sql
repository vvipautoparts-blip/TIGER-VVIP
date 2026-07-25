-- EB-002 Global V1 least-privilege grants and authorization corrections.
-- H1 product decision: conversations start from a published listing and target its owner.
-- H2 enforcement: listing transitions follow the server contract; publication is privileged.

set search_path = public;

-- Fail safely if pre-existing conversations cannot satisfy the approved listing context.
do $$
begin
  if exists (
    select 1
    from public.vvip_conversations conversation
    left join public.vvip_listings listing
      on listing.id = conversation.listing_id
    where conversation.listing_id is null
       or listing.id is null
       or conversation.participant_b <> listing.clerk_user_id
       or conversation.participant_a = listing.clerk_user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'EB-002 precondition failed: existing conversations require reviewed listing/participant remediation';
  end if;
end;
$$;

alter table public.vvip_conversations
  alter column listing_id set not null;

alter table public.vvip_conversations
  drop constraint vvip_conversations_listing_id_fkey,
  add constraint vvip_conversations_listing_id_fkey
    foreign key (listing_id)
    references public.vvip_listings(id)
    on delete restrict;

drop policy if exists "User starts conversation" on public.vvip_conversations;
create policy "User starts listing conversation"
  on public.vvip_conversations
  for insert
  to authenticated
  with check (
    participant_a = (auth.jwt() ->> 'sub')
    and participant_b <> participant_a
    and participant_b = (
      select listing.clerk_user_id
      from public.vvip_listings listing
      where listing.id = listing_id
        and listing.status = 'published'
    )
  );

create or replace function public.vvip_enforce_listing_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  actor_sub text := auth.jwt() ->> 'sub';
  actor_is_privileged boolean := current_user in ('postgres', 'service_role', 'supabase_admin');
  transition_is_valid boolean;
begin
  if actor_is_privileged then
    null;
  elsif actor_sub is null or actor_sub <> old.clerk_user_id or new.clerk_user_id <> actor_sub then
    raise exception using
      errcode = '42501',
      message = 'Listing transition requires owner or privileged moderation context';
  end if;

  if not actor_is_privileged
     and old.status not in ('draft', 'rejected', 'paused')
     and (to_jsonb(new) - array['status', 'updated_at', 'version'])
       is distinct from (to_jsonb(old) - array['status', 'updated_at', 'version']) then
    raise exception using
      errcode = '42501',
      message = 'Listing content can only be edited in an owner-editable state';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  transition_is_valid := case old.status
    when 'draft' then new.status in ('pending_review', 'archived')
    when 'pending_review' then new.status in ('under_review', 'draft')
    when 'under_review' then new.status in ('published', 'rejected')
    when 'published' then new.status in ('paused', 'expired', 'archived')
    when 'rejected' then new.status in ('draft', 'archived')
    when 'paused' then new.status in ('published', 'archived')
    when 'expired' then new.status = 'archived'
    when 'archived' then false
    else false
  end;

  if not transition_is_valid then
    raise exception using
      errcode = '23514',
      message = format('Listing transition from %s to %s is not permitted', old.status, new.status);
  end if;

  if not actor_is_privileged
     and (old.status = 'under_review' or new.status in ('under_review', 'published')) then
    raise exception using
      errcode = '42501',
      message = 'Listing moderation and publication require a privileged path';
  end if;

  return new;
end;
$$;

drop trigger if exists vvip_listings_enforce_status_transition on public.vvip_listings;
create trigger vvip_listings_enforce_status_transition
  before update on public.vvip_listings
  for each row
  execute function public.vvip_enforce_listing_status_transition();

revoke execute on function public.vvip_enforce_listing_status_transition() from public, anon, authenticated;

drop policy if exists "Owner updates draft or rejected listing" on public.vvip_listings;
create policy "Owner updates listing through state machine"
  on public.vvip_listings
  for update
  to authenticated
  using (
    clerk_user_id = (auth.jwt() ->> 'sub')
    and status in ('draft', 'pending_review', 'published', 'rejected', 'paused', 'expired')
  )
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

revoke all privileges on table
  public.vvip_sectors,
  public.vvip_categories,
  public.vvip_listings,
  public.vvip_listing_status_history,
  public.vvip_favorites,
  public.vvip_conversations,
  public.vvip_messages,
  public.vvip_notification_events,
  public.vvip_reports,
  public.vvip_support_tickets,
  public.vvip_consents,
  public.vvip_user_blocks
from anon, authenticated;

grant select on table
  public.vvip_sectors,
  public.vvip_categories,
  public.vvip_listings
to anon;

grant select on table
  public.vvip_sectors,
  public.vvip_categories,
  public.vvip_listings,
  public.vvip_listing_status_history,
  public.vvip_favorites,
  public.vvip_conversations,
  public.vvip_messages,
  public.vvip_notification_events,
  public.vvip_reports,
  public.vvip_support_tickets,
  public.vvip_consents,
  public.vvip_user_blocks
to authenticated;

grant insert on table
  public.vvip_listings,
  public.vvip_favorites,
  public.vvip_conversations,
  public.vvip_messages,
  public.vvip_reports,
  public.vvip_support_tickets,
  public.vvip_consents,
  public.vvip_user_blocks
to authenticated;

grant update on table
  public.vvip_listings,
  public.vvip_notification_events
to authenticated;

grant delete on table
  public.vvip_favorites,
  public.vvip_user_blocks
to authenticated;

grant usage on sequence public.vvip_consents_id_seq to authenticated;

-- END: 20260725210915_eb002_global_v1_security_corrections.sql

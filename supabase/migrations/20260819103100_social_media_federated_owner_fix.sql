-- Social Storage ownership must follow the federated Clerk actor subject.
-- Supabase Auth UUIDs are not the identity authority for VVIP TIGER.

begin;

drop policy if exists vvip_social_media_object_update on storage.objects;

create policy vvip_social_media_object_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select public.vvip_marketplace_actor_id())
)
with check (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select public.vvip_marketplace_actor_id())
);

commit;

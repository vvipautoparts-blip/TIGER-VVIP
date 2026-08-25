begin;

create table if not exists public.vvip_semantic_sector_registry (
  legacy_sector_key text primary key,
  semantic_view_id text not null unique
);

insert into public.vvip_semantic_sector_registry
  (legacy_sector_key, semantic_view_id)
values
  ('automotive', 'view_automotive'),
  ('materials', 'view_materials'),
  ('real-estate', 'view_real_estate')
on conflict (legacy_sector_key) do update
set semantic_view_id = excluded.semantic_view_id;

alter table public.vvip_semantic_sector_registry enable row level security;
alter table public.vvip_semantic_sector_registry force row level security;

revoke all privileges on table public.vvip_semantic_sector_registry
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.vvip_semantic_sector_registry
  to service_role;

alter table public.vvip_marketplace_listings
  drop constraint if exists vvip_marketplace_listings_sector_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vvip_marketplace_listings_sector_registry_fkey'
      and conrelid = 'public.vvip_marketplace_listings'::regclass
  ) then
    alter table public.vvip_marketplace_listings
      add constraint vvip_marketplace_listings_sector_registry_fkey
      foreign key (sector)
      references public.vvip_semantic_sector_registry (legacy_sector_key)
      on update restrict
      on delete restrict
      not valid;
  end if;
end
$$;

alter table public.vvip_marketplace_listings
  validate constraint vvip_marketplace_listings_sector_registry_fkey;

commit;

-- VVIP TIGER Global V1 Core Schema Migration
-- 202607240001_global_v1_core_schema.sql
-- Auth: Clerk JWT (sub = clerk_user_id), RLS deny-by-default

set search_path = public;

-- 1. SECTORS
create table if not exists vvip_sectors (
  id         text primary key,
  name_ar    text not null,
  name_en    text not null,
  icon       text,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table vvip_sectors enable row level security;
drop policy if exists "Anyone reads sectors" on vvip_sectors;
create policy "Anyone reads sectors" on vvip_sectors for select using (true);

insert into vvip_sectors (id, name_ar, name_en, sort_order) values
  ('automotive',  'قطع وخدمات السيارات', 'Auto Parts and Services', 1),
  ('materials',   'مواد ولوازم',           'Materials and Supplies',  2),
  ('real_estate', 'عقارات',                'Real Estate',             3)
on conflict (id) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, sort_order = excluded.sort_order;

-- 2. CATEGORIES
create table if not exists vvip_categories (
  id         text primary key,
  sector_id  text not null references vvip_sectors(id) on delete restrict,
  name_ar    text not null,
  name_en    text not null,
  parent_id  text references vvip_categories(id) on delete set null,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists vvip_categories_sector_idx on vvip_categories(sector_id);
alter table vvip_categories enable row level security;
drop policy if exists "Anyone reads categories" on vvip_categories;
create policy "Anyone reads categories" on vvip_categories for select using (true);

insert into vvip_categories (id, sector_id, name_ar, name_en, sort_order) values
  ('auto_parts',      'automotive',  'قطع غيار',              'Auto Parts',         1),
  ('auto_services',   'automotive',  'خدمات سيارات',         'Auto Services',      2),
  ('auto_full_cars',  'automotive',  'سيارات كاملة',         'Full Cars',           3),
  ('build_materials', 'materials',   'مواد بناء',            'Building Materials', 1),
  ('tools_supplies',  'materials',   'أدوات ولوازم',        'Tools and Supplies', 2),
  ('apartments',      'real_estate', 'شقق',                   'Apartments',          1),
  ('villas',          'real_estate', 'فلل',                   'Villas',              2),
  ('commercial',      'real_estate', 'محلات تجارية',         'Commercial',          3),
  ('land',            'real_estate', 'أراضي',                  'Land',                4)
on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;

-- 3. LISTINGS
create table if not exists vvip_listings (
  id             uuid primary key default gen_random_uuid(),
  clerk_user_id  text not null,
  sector_id      text not null references vvip_sectors(id) on delete restrict,
  category_id    text not null references vvip_categories(id) on delete restrict,
  title_ar       text not null check (char_length(title_ar) between 3 and 200),
  title_en       text,
  description_ar text check (char_length(description_ar) <= 5000),
  description_en text check (char_length(description_en) <= 5000),
  price          numeric(15,3),
  currency       text not null default 'JOD' check (currency in ('JOD','SAR','AED','USD','EUR')),
  country_code   text not null default 'JO',
  city           text,
  area           text,
  condition      text check (condition in ('new','used','refurbished','for_rent')),
  status         text not null default 'draft'
                 check (status in ('draft','pending_review','under_review','published','rejected','paused','expired','archived')),
  rejection_reason text,
  images         jsonb not null default '[]'::jsonb,
  attributes     jsonb not null default '{}'::jsonb,
  view_count     integer not null default 0 check (view_count >= 0),
  is_featured    boolean not null default false,
  published_at   timestamptz,
  expires_at     timestamptz,
  version        integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists vvip_listings_user_idx on vvip_listings(clerk_user_id, status);
create index if not exists vvip_listings_sector_idx on vvip_listings(sector_id, status, published_at desc);
create index if not exists vvip_listings_country_idx on vvip_listings(country_code, status, published_at desc);
create index if not exists vvip_listings_status_idx on vvip_listings(status, created_at desc);
create index if not exists vvip_listings_price_idx on vvip_listings(price) where status = 'published';
create index if not exists vvip_listings_fts_idx on vvip_listings
  using gin(to_tsvector('simple', coalesce(title_ar,'') || ' ' || coalesce(title_en,'') || ' ' || coalesce(description_ar,'')));

alter table vvip_listings enable row level security;
drop policy if exists "Owner reads own listings" on vvip_listings;
create policy "Owner reads own listings" on vvip_listings for select
  using (clerk_user_id = (auth.jwt() ->> 'sub'));
drop policy if exists "Anyone reads published listings" on vvip_listings;
create policy "Anyone reads published listings" on vvip_listings for select
  using (status = 'published');
drop policy if exists "Owner inserts own listing" on vvip_listings;
create policy "Owner inserts own listing" on vvip_listings for insert
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));
drop policy if exists "Owner updates draft or rejected listing" on vvip_listings;
create policy "Owner updates draft or rejected listing" on vvip_listings for update
  using (clerk_user_id = (auth.jwt() ->> 'sub') and status in ('draft','rejected','paused'))
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- 4. LISTING STATUS HISTORY
create table if not exists vvip_listing_status_history (
  id             bigint generated always as identity primary key,
  listing_id     uuid not null references vvip_listings(id) on delete cascade,
  from_status    text,
  to_status      text not null,
  reason         text,
  actor_clerk_id text,
  created_at     timestamptz not null default now()
);
create index if not exists vvip_listing_hist_idx on vvip_listing_status_history(listing_id, created_at desc);
alter table vvip_listing_status_history enable row level security;
drop policy if exists "Owner reads own listing history" on vvip_listing_status_history;
create policy "Owner reads own listing history" on vvip_listing_status_history for select
  using (listing_id in (select id from vvip_listings where clerk_user_id = (auth.jwt() ->> 'sub')));

-- 5. FAVORITES
create table if not exists vvip_favorites (
  clerk_user_id text not null,
  listing_id    uuid not null references vvip_listings(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (clerk_user_id, listing_id)
);
create index if not exists vvip_favorites_user_idx on vvip_favorites(clerk_user_id, created_at desc);
alter table vvip_favorites enable row level security;
drop policy if exists "User manages own favorites" on vvip_favorites;
create policy "User manages own favorites" on vvip_favorites for all
  using (clerk_user_id = (auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- 6. CONVERSATIONS AND MESSAGES
create table if not exists vvip_conversations (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid references vvip_listings(id) on delete set null,
  participant_a text not null,
  participant_b text not null,
  is_blocked    boolean not null default false,
  blocked_by    text,
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint vvip_conversations_unique unique (participant_a, participant_b, listing_id),
  constraint vvip_conversations_diff check (participant_a <> participant_b)
);
create index if not exists vvip_conv_a_idx on vvip_conversations(participant_a, last_message_at desc);
create index if not exists vvip_conv_b_idx on vvip_conversations(participant_b, last_message_at desc);
alter table vvip_conversations enable row level security;
drop policy if exists "Participants read own conversations" on vvip_conversations;
create policy "Participants read own conversations" on vvip_conversations for select
  using (participant_a = (auth.jwt() ->> 'sub') or participant_b = (auth.jwt() ->> 'sub'));
drop policy if exists "User starts conversation" on vvip_conversations;
create policy "User starts conversation" on vvip_conversations for insert
  with check (participant_a = (auth.jwt() ->> 'sub') or participant_b = (auth.jwt() ->> 'sub'));

create table if not exists vvip_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references vvip_conversations(id) on delete cascade,
  sender_id       text not null,
  content         text not null check (char_length(content) between 1 and 4000),
  content_type    text not null default 'text' check (content_type in ('text','image')),
  is_read         boolean not null default false,
  is_deleted      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists vvip_messages_conv_idx on vvip_messages(conversation_id, created_at asc);
alter table vvip_messages enable row level security;
drop policy if exists "Participants read messages" on vvip_messages;
create policy "Participants read messages" on vvip_messages for select
  using (
    is_deleted = false and
    conversation_id in (
      select id from vvip_conversations
      where participant_a = (auth.jwt() ->> 'sub') or participant_b = (auth.jwt() ->> 'sub')
    )
  );
drop policy if exists "Sender sends messages" on vvip_messages;
create policy "Sender sends messages" on vvip_messages for insert
  with check (
    sender_id = (auth.jwt() ->> 'sub') and
    conversation_id in (
      select id from vvip_conversations
      where (participant_a = (auth.jwt() ->> 'sub') or participant_b = (auth.jwt() ->> 'sub'))
        and is_blocked = false
    )
  );

-- 7. NOTIFICATIONS
create table if not exists vvip_notification_events (
  id           uuid primary key default gen_random_uuid(),
  recipient_id text not null,
  event_type   text not null,
  title_ar     text,
  title_en     text,
  body_ar      text,
  body_en      text,
  resource_type text,
  resource_id  text,
  is_read      boolean not null default false,
  channels     jsonb not null default '["in_app"]'::jsonb,
  delivered_at jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists vvip_notifs_recipient_idx on vvip_notification_events(recipient_id, is_read, created_at desc);
alter table vvip_notification_events enable row level security;
drop policy if exists "User reads own notifications" on vvip_notification_events;
create policy "User reads own notifications" on vvip_notification_events for select
  using (recipient_id = (auth.jwt() ->> 'sub'));
drop policy if exists "User marks notifications read" on vvip_notification_events;
create policy "User marks notifications read" on vvip_notification_events for update
  using (recipient_id = (auth.jwt() ->> 'sub'))
  with check (recipient_id = (auth.jwt() ->> 'sub'));

-- 8. REPORTS
create table if not exists vvip_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   text not null,
  reported_type text not null check (reported_type in ('listing','user','message')),
  reported_id   text not null,
  reason_code   text not null,
  description   text check (char_length(description) <= 2000),
  status        text not null default 'pending'
                check (status in ('pending','under_review','resolved','dismissed')),
  resolution    text,
  moderator_id  text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists vvip_reports_status_idx on vvip_reports(status, created_at asc);
alter table vvip_reports enable row level security;
drop policy if exists "Reporter reads own reports" on vvip_reports;
create policy "Reporter reads own reports" on vvip_reports for select
  using (reporter_id = (auth.jwt() ->> 'sub'));
drop policy if exists "Authenticated submits report" on vvip_reports;
create policy "Authenticated submits report" on vvip_reports for insert
  with check (reporter_id = (auth.jwt() ->> 'sub') and reported_id <> (auth.jwt() ->> 'sub'));

-- 9. SUPPORT TICKETS (Tiger Care)
create table if not exists vvip_support_tickets (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  subject       text not null check (char_length(subject) between 5 and 300),
  category      text not null,
  description   text not null check (char_length(description) between 10 and 5000),
  status        text not null default 'open'
                check (status in ('open','in_progress','pending_user','resolved','closed')),
  priority      text not null default 'normal'
                check (priority in ('low','normal','high','urgent')),
  related_type  text,
  related_id    text,
  agent_id      text,
  resolved_at   timestamptz,
  csat_score    integer check (csat_score between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists vvip_tickets_user_idx on vvip_support_tickets(clerk_user_id, created_at desc);
create index if not exists vvip_tickets_status_idx on vvip_support_tickets(status, priority, created_at asc);
alter table vvip_support_tickets enable row level security;
drop policy if exists "User reads own tickets" on vvip_support_tickets;
create policy "User reads own tickets" on vvip_support_tickets for select
  using (clerk_user_id = (auth.jwt() ->> 'sub'));
drop policy if exists "User creates own ticket" on vvip_support_tickets;
create policy "User creates own ticket" on vvip_support_tickets for insert
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- 10. CONSENTS
create table if not exists vvip_consents (
  id            bigint generated always as identity primary key,
  clerk_user_id text not null,
  consent_type  text not null,
  consented     boolean not null,
  ip_hash       text,
  consented_at  timestamptz not null default now()
);
create index if not exists vvip_consents_user_idx on vvip_consents(clerk_user_id, consent_type, consented_at desc);
alter table vvip_consents enable row level security;
drop policy if exists "User reads own consents" on vvip_consents;
create policy "User reads own consents" on vvip_consents for select
  using (clerk_user_id = (auth.jwt() ->> 'sub'));
drop policy if exists "User records consent" on vvip_consents;
create policy "User records consent" on vvip_consents for insert
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- 11. USER BLOCKS
create table if not exists vvip_user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists vvip_user_blocks_blocked_idx on vvip_user_blocks(blocked_id);
alter table vvip_user_blocks enable row level security;
drop policy if exists "User manages own blocks" on vvip_user_blocks;
create policy "User manages own blocks" on vvip_user_blocks for all
  using (blocker_id = (auth.jwt() ->> 'sub'))
  with check (blocker_id = (auth.jwt() ->> 'sub'));

-- END: 202607240001_global_v1_core_schema.sql

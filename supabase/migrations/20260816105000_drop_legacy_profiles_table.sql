-- VVIP TIGER — remove the empty historical Supabase profile authority.
-- No CASCADE: any unexpected dependency must stop the migration visibly.

begin;

drop table if exists public.profiles;

commit;

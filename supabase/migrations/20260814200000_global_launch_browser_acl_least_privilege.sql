-- TIGER VVIP global-launch browser ACL least-privilege baseline.
-- Privilege-only hardening: no application row, country state, authority state, or business data is modified.
-- This migration runs as the application schema owner (`postgres`). Platform-owned
-- `supabase_admin` defaults are tracked separately because cross-owner default ACL
-- mutation is intentionally denied by Supabase.

begin;

-- Unauthenticated visitors are read-only at the database ACL layer.
-- RLS still decides which SELECT rows are visible.
revoke insert, update, delete, truncate, references, trigger
on all tables in schema public
from anon;

-- Signed-in browser users may retain application DML where explicitly granted,
-- but never database maintenance / schema-adjacent table capabilities.
revoke truncate, references, trigger
on all tables in schema public
from authenticated;

-- Anonymous visitors have no legitimate sequence-write requirement.
revoke all privileges
on all sequences in schema public
from anon;

-- Secure future application tables created by the application schema owner.
alter default privileges for role postgres in schema public
revoke insert, update, delete, truncate, references, trigger on tables from anon;

alter default privileges for role postgres in schema public
revoke truncate, references, trigger on tables from authenticated;

-- Secure future application sequences for anonymous visitors.
alter default privileges for role postgres in schema public
revoke all privileges on sequences from anon;

-- New application browser-callable database functions must opt in explicitly.
-- Existing function ACLs are intentionally not changed by this migration.
alter default privileges for role postgres in schema public
revoke execute on functions from anon, authenticated;

commit;

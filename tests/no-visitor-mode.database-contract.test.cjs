"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const migrationPath = "supabase/migrations/20260821003000_no_visitor_mode_hardening.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(function main() {
  assert(fs.existsSync(path.join(root, migrationPath)), "NO_VISITOR_MODE hardening migration is missing");
  const sql = read(migrationPath);
  const normalized = sql.replace(/\s+/g, " ").toLowerCase();

  assert(normalized.includes('drop policy if exists "anyone can read feed posts" on public.feed_posts'), "legacy feed read policy must be retired");
  assert(normalized.includes('drop policy if exists "anyone can insert feed posts" on public.feed_posts'), "legacy feed insert policy must be retired");
  assert(normalized.includes("revoke all privileges on table public.feed_posts from anon"), "anon must lose legacy feed privileges");

  assert(normalized.includes("drop policy if exists vvip_marketplace_public_read_active on public.vvip_marketplace_listings"), "anonymous marketplace listing policy must be retired");
  assert(normalized.includes("revoke select on table public.vvip_marketplace_listings from anon"), "anon must lose listing SELECT");

  assert(normalized.includes("drop policy if exists vvip_marketplace_media_public_canonical_read on public.vvip_marketplace_listing_media"), "anonymous canonical-media relation policy must be retired");
  assert(normalized.includes("create policy vvip_marketplace_media_member_canonical_read"), "authenticated member canonical-media policy missing");
  assert(normalized.includes("to authenticated"), "member-only policy must target authenticated");

  assert(normalized.includes("revoke select on table public.vvip_marketplace_public_feed from anon"), "anon must lose marketplace feed view SELECT");
  assert(normalized.includes("revoke select on table public.vvip_visibility_plan_catalog from anon"), "anon must lose visibility catalog SELECT");
  assert(normalized.includes("drop policy if exists vvip_visibility_plans_public_active_read on public.vvip_visibility_plans"), "anonymous visibility-plan policy must be retired");
  assert(normalized.includes("create policy vvip_visibility_plans_member_active_read"), "authenticated visibility-plan policy missing");

  assert(normalized.includes("revoke execute on function vvip_private.vvip_marketplace_canonical_media_is_readable(text) from anon"), "anon must lose canonical-media predicate EXECUTE");
  assert(normalized.includes("drop policy if exists vvip_listing_media_canonical_read on storage.objects"), "anonymous canonical storage policy must be replaced");
  assert(normalized.includes("create policy vvip_listing_media_canonical_member_read"), "authenticated canonical storage policy missing");

  assert(!/to\s+anon\b/.test(normalized), "new NO_VISITOR_MODE migration must not create anon-targeted policies");
  assert(!/grant\s+[^;]*\s+to\s+anon\b/.test(normalized), "new NO_VISITOR_MODE migration must not grant platform privileges to anon");

  console.log("NO VISITOR DATABASE CONTRACT PASS");
}());

#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const originalPath = path.join(root, 'supabase/migrations/202607240001_global_v1_core_schema.sql');
const correctionPath = path.join(root, 'supabase/migrations/20260725210915_eb002_global_v1_security_corrections.sql');
const original = fs.readFileSync(originalPath, 'utf8');
const correction = fs.readFileSync(correctionPath, 'utf8');

assert.match(correction, /revoke all privileges[\s\S]+from anon, authenticated;/i);
assert.doesNotMatch(correction, /grant all privileges/i);
assert.match(correction, /grant select[\s\S]+to anon;/i);
assert.match(correction, /grant insert[\s\S]+to authenticated;/i);
assert.match(correction, /grant update[\s\S]+to authenticated;/i);
assert.match(correction, /grant delete[\s\S]+vvip_favorites[\s\S]+vvip_user_blocks[\s\S]+to authenticated;/i);

assert.match(correction, /alter column listing_id set not null/i);
assert.match(
	correction,
	/drop constraint vvip_conversations_listing_id_fkey,[\s\S]+foreign key \(listing_id\)[\s\S]+on delete restrict/i
);
assert.doesNotMatch(correction, /foreign key \(listing_id\)[\s\S]+on delete set null/i);
assert.match(correction, /participant_a = \(auth\.jwt\(\) ->> 'sub'\)/i);
assert.match(correction, /participant_b = \([\s\S]+listing\.clerk_user_id[\s\S]+listing\.status = 'published'/i);
assert.match(correction, /create policy "User starts listing conversation"/i);

assert.match(correction, /create or replace function public\.vvip_enforce_listing_status_transition/i);
for (const transitionClause of [
	"when 'draft' then new.status in ('pending_review', 'archived')",
	"when 'pending_review' then new.status in ('under_review', 'draft')",
	"when 'under_review' then new.status in ('published', 'rejected')",
	"when 'published' then new.status in ('paused', 'expired', 'archived')",
	"when 'rejected' then new.status in ('draft', 'archived')",
	"when 'paused' then new.status in ('published', 'archived')",
	"when 'expired' then new.status = 'archived'",
	"when 'archived' then false"
]) {
	assert.ok(correction.includes(transitionClause), `Missing transition clause: ${transitionClause}`);
}
assert.match(correction, /new\.status in \('under_review', 'published'\)/i);
assert.match(correction, /Listing moderation and publication require a privileged path/i);
assert.match(correction, /Listing content can only be edited in an owner-editable state/i);
assert.match(correction, /to_jsonb\(new\) - array\['status', 'updated_at', 'version'\]/i);
assert.match(correction, /before update on public\.vvip_listings/i);
assert.match(correction, /revoke execute on function public\.vvip_enforce_listing_status_transition\(\) from public, anon, authenticated/i);

assert.match(original, /create policy "User starts conversation"/i);
assert.doesNotMatch(original, /vvip_enforce_listing_status_transition/i);

console.log('PASS: EB-002 corrective migration locks grants, H1, and H2');
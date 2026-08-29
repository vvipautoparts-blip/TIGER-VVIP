"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const composer = require("../scripts/social/post-composer.js");

test("social composer requires a sector and approved NEXUS intent", () => {
  assert.deepEqual(
    composer.normalizeComposerDraft({
      body: "كونا كهرباء 2020",
      audience: "public",
      sectorId: "automotive",
      intent: "offer",
    }),
    {
      ok: true,
      value: {
        body: "كونا كهرباء 2020",
        audience: "public",
        sectorId: "automotive",
        intent: "OFFER",
      },
    }
  );

  assert.equal(composer.normalizeComposerDraft({ body: "صباح الخير", audience: "public" }).code, "NEXUS_SECTOR_REQUIRED");
  assert.equal(composer.normalizeComposerDraft({ body: "سيارة", audience: "public", sectorId: "automotive" }).code, "NEXUS_INTENT_REQUIRED");
});

test("current forward migration enforces sector-intent publication and removes the old two-argument create RPC", () => {
  const sql = fs.readFileSync("supabase/migrations/20260829183000_nexus_sector_publication.sql", "utf8");
  assert.match(sql, /add column if not exists sector_key text/i);
  assert.match(sql, /add column if not exists intent_class text/i);
  assert.match(sql, /vvip_marketplace_sectors/i);
  assert.match(sql, /MARKETPLACE_SECTOR_NOT_ACTIVE|NEXUS_SECTOR_NOT_ACTIVE/);
  assert.match(sql, /OFFER.*NEED.*SERVICE.*OPPORTUNITY/is);
  assert.match(sql, /drop function if exists public\.vvip_social_post_create\(text, text\)/i);
  assert.match(sql, /create function public\.vvip_social_post_create\(\s*p_body text,\s*p_audience text,\s*p_sector_key text,\s*p_intent_class text/is);
});

test("runtime adapter sends sector and intent to the new NEXUS create RPC", () => {
  const source = fs.readFileSync("scripts/social/runtime-adapters.js", "utf8");
  assert.match(source, /p_sector_key/);
  assert.match(source, /p_intent_class/);
  assert.match(source, /sectorId/);
  assert.match(source, /intent/);
});

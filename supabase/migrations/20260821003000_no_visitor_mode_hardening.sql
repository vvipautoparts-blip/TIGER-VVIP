-- TIGER VVIP — NO_VISITOR_MODE hardening.
-- Owner binding decision: unauthenticated actors remain outside TIGER.
-- This forward-only migration removes anonymous platform-data reads while
-- preserving authenticated member access and auth/bootstrap infrastructure.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Retire historical feed_posts as an executable fallback.
-- Current Social Core lives on public.vvip_social_posts and is authenticated-only.
-- Keep the legacy relation only as migration/history evidence, with zero browser ACL.
-- ---------------------------------------------------------------------------
DO $no_visitor$
BEGIN
  IF to_regclass('public.feed_posts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read feed posts" ON public.feed_posts';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert feed posts" ON public.feed_posts';
    EXECUTE 'ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.feed_posts FORCE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.feed_posts FROM PUBLIC';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.feed_posts FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.feed_posts FROM authenticated';
  END IF;
END
$no_visitor$;

-- ---------------------------------------------------------------------------
-- 2. Marketplace listings: active listings remain visible to authenticated
-- TIGER members through the existing vvip_marketplace_authenticated_read policy.
-- Anonymous internet discovery is removed.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vvip_marketplace_public_read_active
ON public.vvip_marketplace_listings;

REVOKE SELECT ON TABLE public.vvip_marketplace_listings FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Marketplace canonical media relation: preserve owner/member access,
-- remove the policy and column grants that made ACTIVE listing media anonymous.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vvip_marketplace_media_read
ON public.vvip_marketplace_listing_media;

DROP POLICY IF EXISTS vvip_marketplace_media_public_canonical_read
ON public.vvip_marketplace_listing_media;

DROP POLICY IF EXISTS vvip_marketplace_media_member_canonical_read
ON public.vvip_marketplace_listing_media;

CREATE POLICY vvip_marketplace_media_member_canonical_read
ON public.vvip_marketplace_listing_media
FOR SELECT
TO authenticated
USING (
  finalization_state = 'CANONICAL'
  AND canonical_storage_path IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.vvip_marketplace_listings AS listing
    WHERE listing.listing_id = vvip_marketplace_listing_media.listing_id
      AND listing.status = 'ACTIVE'
      AND vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
  )
);

REVOKE SELECT ON TABLE public.vvip_marketplace_listing_media FROM anon;
REVOKE SELECT (
  media_id,
  listing_id,
  canonical_storage_path,
  finalization_state,
  position,
  is_cover,
  alt_text
) ON public.vvip_marketplace_listing_media FROM anon;

-- Compatibility view name is retained for callers, but it is now member-only.
REVOKE SELECT ON TABLE public.vvip_marketplace_public_feed FROM anon;

-- ---------------------------------------------------------------------------
-- 4. Visibility-plan discovery belongs inside authenticated TIGER.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vvip_visibility_plans_public_active_read
ON public.vvip_visibility_plans;

DROP POLICY IF EXISTS vvip_visibility_plans_member_active_read
ON public.vvip_visibility_plans;

CREATE POLICY vvip_visibility_plans_member_active_read
ON public.vvip_visibility_plans
FOR SELECT
TO authenticated
USING (
  plan_state = 'ACTIVE'
  AND statement_timestamp() >= valid_from
  AND (valid_until IS NULL OR statement_timestamp() < valid_until)
  AND vvip_private.vvip_marketplace_country_is_active(country_code)
  AND (
    sector IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.vvip_marketplace_sectors AS enabled_sector
      WHERE enabled_sector.sector_key = vvip_visibility_plans.sector
        AND enabled_sector.is_enabled
    )
  )
);

REVOKE SELECT ON TABLE public.vvip_visibility_plans FROM anon;
REVOKE SELECT (
  plan_id,
  country_code,
  sector,
  display_name,
  price_minor,
  currency_code,
  pulse_impressions,
  activation_duration_minutes,
  policy_version,
  plan_state,
  valid_from,
  valid_until
) ON public.vvip_visibility_plans FROM anon;

REVOKE SELECT ON TABLE public.vvip_visibility_plan_catalog FROM anon;

-- ---------------------------------------------------------------------------
-- 5. Remove anonymous execution of marketplace read helpers.
-- Authenticated members/service_role retain their previously granted access.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.vvip_marketplace_actor_id() FROM anon;
REVOKE EXECUTE ON FUNCTION vvip_private.vvip_marketplace_country_is_active(text) FROM anon;
REVOKE EXECUTE ON FUNCTION vvip_private.vvip_marketplace_canonical_media_is_readable(text) FROM anon;
REVOKE USAGE ON SCHEMA vvip_private FROM anon;

-- ---------------------------------------------------------------------------
-- 6. Canonical listing-media objects are private bucket objects and now readable
-- only by authenticated TIGER members when the bounded canonical predicate passes.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vvip_listing_media_canonical_read
ON storage.objects;

DROP POLICY IF EXISTS vvip_listing_media_canonical_member_read
ON storage.objects;

CREATE POLICY vvip_listing_media_canonical_member_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-media-canonical'
  AND vvip_private.vvip_marketplace_canonical_media_is_readable(storage.objects.name)
);

COMMENT ON POLICY vvip_listing_media_canonical_member_read ON storage.objects IS
  'NO_VISITOR_MODE: canonical marketplace media is visible only to authenticated TIGER members under bounded listing policy.';

COMMIT;

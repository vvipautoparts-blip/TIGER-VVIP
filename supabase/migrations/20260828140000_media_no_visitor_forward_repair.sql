-- VVIP TIGER — forward repair for late Media DB convergence.
-- Production already carries NO_VISITOR_MODE hardening while the historical
-- 20260816090001 media-finalization migration is still pending. Applying that
-- older migration late can recreate anonymous canonical-media read authority.
-- This forward-only migration reasserts the current member-only authority after
-- all Media convergence migrations without rewriting historical migration bytes.

BEGIN;

-- Reassert member-only canonical media relation reads.
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

-- The compatibility projection remains member-only.
REVOKE SELECT ON TABLE public.vvip_marketplace_public_feed FROM anon;

-- Reassert helper/schema execution boundaries before storage policy evaluation.
REVOKE EXECUTE ON FUNCTION public.vvip_marketplace_actor_id() FROM anon;
REVOKE EXECUTE ON FUNCTION vvip_private.vvip_marketplace_country_is_active(text) FROM anon;
REVOKE EXECUTE ON FUNCTION vvip_private.vvip_marketplace_canonical_media_is_readable(text) FROM anon;
REVOKE USAGE ON SCHEMA vvip_private FROM anon;

-- Remove the historical anonymous storage policy and preserve exactly the
-- authenticated canonical-media policy.
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

-- Fail closed if the repaired state is not actually member-only.
DO $media_no_visitor_forward_repair$
DECLARE
  storage_roles name[];
BEGIN
  IF has_table_privilege('anon', 'public.vvip_marketplace_listing_media', 'SELECT') THEN
    RAISE EXCEPTION 'MEDIA_NO_VISITOR_ANON_MEDIA_SELECT_REMAINS';
  END IF;

  IF has_table_privilege('anon', 'public.vvip_marketplace_public_feed', 'SELECT') THEN
    RAISE EXCEPTION 'MEDIA_NO_VISITOR_ANON_FEED_SELECT_REMAINS';
  END IF;

  IF has_function_privilege(
    'anon',
    'vvip_private.vvip_marketplace_canonical_media_is_readable(text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'MEDIA_NO_VISITOR_ANON_CANONICAL_HELPER_REMAINS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'vvip_listing_media_canonical_read'
  ) THEN
    RAISE EXCEPTION 'MEDIA_NO_VISITOR_LEGACY_STORAGE_POLICY_REMAINS';
  END IF;

  SELECT roles
  INTO storage_roles
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'vvip_listing_media_canonical_member_read';

  IF storage_roles IS NULL
     OR storage_roles <> ARRAY['authenticated']::name[] THEN
    RAISE EXCEPTION 'MEDIA_NO_VISITOR_MEMBER_STORAGE_POLICY_INVALID';
  END IF;
END
$media_no_visitor_forward_repair$;

DO $media_no_visitor_forward_repair_evidence$
BEGIN
  RAISE NOTICE 'MEDIA_NO_VISITOR_FORWARD_REPAIR=PASS';
END
$media_no_visitor_forward_repair_evidence$;

COMMIT;

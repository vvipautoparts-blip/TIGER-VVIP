BEGIN;

CREATE TABLE IF NOT EXISTS public.vvip_social_profile_projection (
  profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL UNIQUE
    CHECK (subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
  profile_state text NOT NULL DEFAULT 'active'
    CHECK (profile_state IN ('active', 'deactivated', 'deleted')),
  display_name text NOT NULL
    CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 160),
  avatar_url text,
  business_name text
    CHECK (business_name IS NULL OR char_length(business_name) <= 200),
  location text
    CHECK (location IS NULL OR char_length(location) <= 200),
  specialization text
    CHECK (specialization IS NULL OR char_length(specialization) <= 200),
  business_description text
    CHECK (business_description IS NULL OR char_length(business_description) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vvip_social_profile_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vvip_social_profile_projection FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vvip_social_profile_projection FROM PUBLIC;
REVOKE ALL ON TABLE public.vvip_social_profile_projection FROM anon;
REVOKE ALL ON TABLE public.vvip_social_profile_projection FROM authenticated;

CREATE OR REPLACE FUNCTION public.vvip_get_public_profile(
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT jsonb_build_object(
    'profile_id', p.profile_id,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'business_name', p.business_name,
    'location', p.location,
    'specialization', p.specialization,
    'business_description', p.business_description
  )
  FROM public.vvip_social_profile_projection AS p
  WHERE p.profile_id = p_profile_id
    AND p.profile_state = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.vvip_get_public_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vvip_get_public_profile(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.vvip_get_public_profile(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vvip_get_public_profile(uuid) TO authenticated;

COMMIT;

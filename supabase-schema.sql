-- Supabase schema for TIGER VVIP

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  customer_name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  product text NOT NULL,
  quantity integer NOT NULL,
  location text NOT NULL,
  priority text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Pending',
  completed_at timestamp with time zone,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0.75,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2) NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Profiles table for user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  email text,
  phone text,
  account_type text,
  account_category text,
  role text NOT NULL DEFAULT 'dealer',
  is_approved boolean NOT NULL DEFAULT true,
  superior_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subscription text NOT NULL DEFAULT 'basic',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS superior_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS business_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS allowed_parts_count integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS representative_phone text,
  ADD COLUMN IF NOT EXISTS company_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_phone_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Commission ledger for weekly payouts
CREATE TABLE IF NOT EXISTS public.commissions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0.75,
  status text NOT NULL DEFAULT 'earned',
  cycle_type text NOT NULL DEFAULT 'weekly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  notes text,
  UNIQUE(order_id)
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount numeric(10,2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes text
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_info text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id bigserial PRIMARY KEY,
  phone text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'registration',
  expires_at timestamp with time zone NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commissions_user_id_idx ON public.commissions (user_id);
CREATE INDEX IF NOT EXISTS commissions_earned_at_idx ON public.commissions (earned_at DESC);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.commissions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supervisor views team commissions" ON public.commissions;
CREATE POLICY "Supervisor views team commissions" ON public.commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profiles team_member ON team_member.superior_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'supervisor'
        AND team_member.id = commissions.user_id
    )
  );

DROP POLICY IF EXISTS "Manager views team commissions" ON public.commissions;
CREATE POLICY "Manager views team commissions" ON public.commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profiles team_member ON team_member.superior_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'manager'
        AND team_member.id = commissions.user_id
    )
  );

DROP POLICY IF EXISTS "Super admin views all commissions" ON public.commissions;
CREATE POLICY "Super admin views all commissions" ON public.commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert own commissions" ON public.commissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commissions" ON public.commissions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supervisors and admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Team and super admin can view orders" ON public.orders;
CREATE POLICY "Team and super admin can view orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profiles team_member ON team_member.superior_id = p.id
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND team_member.id = orders.user_id
    )
  );

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can update approvals" ON public.profiles;
CREATE POLICY "Admin can update approvals" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own salary payments" ON public.salary_payments;
CREATE POLICY "Users can view own salary payments" ON public.salary_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all salary payments" ON public.salary_payments;
CREATE POLICY "Admin can view all salary payments" ON public.salary_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Only admin can insert salary payments" ON public.salary_payments;
CREATE POLICY "Only admin can insert salary payments" ON public.salary_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users manage own sessions" ON public.user_sessions;
CREATE POLICY "Users manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage otp by phone" ON public.otp_codes;
CREATE POLICY "Users can manage otp by phone" ON public.otp_codes
  FOR ALL USING (true)
  WITH CHECK (true);

-- Seed admin profile placeholder (replace user UUID after creating auth user)
-- INSERT INTO public.profiles (id, full_name, phone, account_type, account_category, role, is_approved, subscription)
-- VALUES ('<AUTH_USER_UUID>', 'VVIP Admin', '+962780003302', 'المدير العام', 'الإدارة', 'super_admin', true, 'premium')
-- ON CONFLICT (id) DO UPDATE SET role='super_admin', is_approved=true;

-- Buyers table for admin-managed buyer contacts
CREATE TABLE IF NOT EXISTS public.buyers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Account types used by registration dropdown
CREATE TABLE IF NOT EXISTS public.account_types (
  id bigserial PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_types_label_category_unique'
  ) THEN
    ALTER TABLE public.account_types
      ADD CONSTRAINT account_types_label_category_unique UNIQUE (label, category);
  END IF;
END $$;

INSERT INTO public.account_types (label, category, active)
VALUES
  ('المدير العام', 'الإدارة', true),
  ('مدير منطقة', 'الإدارة', true),
  ('مشرف', 'الإدارة', true),
  ('مندوب', 'الإدارة', true),
  ('شركة قطع غيار', 'قطع الغيار', true),
  ('مؤسسة قطع غيار', 'قطع الغيار', true),
  ('مركز قطع غيار', 'قطع الغيار', true),
  ('محل بيع قطع غيار', 'قطع الغيار', true),
  ('شركة صيانة مركبات', 'الصيانة', true),
  ('مؤسسة صيانة مركبات', 'الصيانة', true),
  ('مركز صيانة مركبات', 'الصيانة', true),
  ('محل صيانة مركبات', 'الصيانة', true),
  ('شركة خدمات مركبات', 'الخدمات', true),
  ('مؤسسة خدمات مركبات', 'الخدمات', true),
  ('مركز خدمات مركبات', 'الخدمات', true),
  ('محل خدمات مركبات', 'الخدمات', true),
  ('شركة خدمات أخرى للمركبات', 'خدمات أخرى', true),
  ('مؤسسة خدمات أخرى للمركبات', 'خدمات أخرى', true),
  ('مركز خدمات أخرى للمركبات', 'خدمات أخرى', true),
  ('محل خدمات أخرى للمركبات', 'خدمات أخرى', true),
  ('مشتري', 'مشتري', true)
ON CONFLICT (label, category) DO NOTHING;

-- Vehicle catalog for advanced search dimensions
CREATE TABLE IF NOT EXISTS public.vehicle_catalog (
  id bigserial PRIMARY KEY,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  body_type text NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehicle_catalog_unique_vehicle'
  ) THEN
    ALTER TABLE public.vehicle_catalog
      ADD CONSTRAINT vehicle_catalog_unique_vehicle
      UNIQUE (brand, model, year, body_type, category);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vehicle_catalog_brand_idx ON public.vehicle_catalog (brand);
CREATE INDEX IF NOT EXISTS vehicle_catalog_model_idx ON public.vehicle_catalog (model);
CREATE INDEX IF NOT EXISTS vehicle_catalog_year_idx ON public.vehicle_catalog (year);

-- Parts master table
CREATE TABLE IF NOT EXISTS public.parts (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  name_en text,
  part_reference text,
  description text,
  price_jod numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  condition_type text NOT NULL DEFAULT 'new',
  gallery_links text[] NOT NULL DEFAULT '{}',
  image_url text,
  status text NOT NULL DEFAULT 'active',
  category text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  body_type text NOT NULL,
  vehicle_catalog_id bigint REFERENCES public.vehicle_catalog(id) ON DELETE SET NULL,
  dealer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS part_reference text,
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condition_type text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS gallery_links text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parts_discount_percent_range'
  ) THEN
    ALTER TABLE public.parts
      ADD CONSTRAINT parts_discount_percent_range
      CHECK (discount_percent >= 0 AND discount_percent <= 99);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS parts_brand_idx ON public.parts (brand);
CREATE INDEX IF NOT EXISTS parts_model_idx ON public.parts (model);
CREATE INDEX IF NOT EXISTS parts_year_idx ON public.parts (year);
CREATE INDEX IF NOT EXISTS parts_category_idx ON public.parts (category);
CREATE INDEX IF NOT EXISTS parts_status_idx ON public.parts (status);
CREATE UNIQUE INDEX IF NOT EXISTS parts_part_reference_unique_idx ON public.parts (part_reference) WHERE part_reference IS NOT NULL;

-- Review requests table
CREATE TABLE IF NOT EXISTS public.review_requests (
  id bigserial PRIMARY KEY,
  part_id bigint NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'general',
  request_message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_requests_part_id_idx ON public.review_requests (part_id);
CREATE INDEX IF NOT EXISTS review_requests_requester_id_idx ON public.review_requests (requester_id);

-- Admin replies to review requests
CREATE TABLE IF NOT EXISTS public.admin_replies (
  id bigserial PRIMARY KEY,
  review_request_id bigint NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_replies_review_request_id_idx ON public.admin_replies (review_request_id);

-- Price/status update logs
CREATE TABLE IF NOT EXISTS public.part_update_logs (
  id bigserial PRIMARY KEY,
  part_id bigint NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS part_update_logs_part_id_idx ON public.part_update_logs (part_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'parts_set_updated_at'
  ) THEN
    CREATE TRIGGER parts_set_updated_at
    BEFORE UPDATE ON public.parts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'review_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER review_requests_set_updated_at
    BEFORE UPDATE ON public.review_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active account types" ON public.account_types;
CREATE POLICY "Anyone can read active account types" ON public.account_types
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Anyone can read active vehicle catalog" ON public.vehicle_catalog;
CREATE POLICY "Anyone can read active vehicle catalog" ON public.vehicle_catalog
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read active parts" ON public.parts;
CREATE POLICY "Anyone can read active parts" ON public.parts
  FOR SELECT USING (status = 'active' OR auth.uid() = dealer_id);

DROP POLICY IF EXISTS "Dealer can insert own parts" ON public.parts;
CREATE POLICY "Dealer can insert own parts" ON public.parts
  FOR INSERT WITH CHECK (
    auth.uid() = dealer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Dealer can update own parts" ON public.parts;
CREATE POLICY "Dealer can update own parts" ON public.parts
  FOR UPDATE USING (
    auth.uid() = dealer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() = dealer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can read own and admin review requests" ON public.review_requests;
CREATE POLICY "Users can read own and admin review requests" ON public.review_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own review requests" ON public.review_requests;
CREATE POLICY "Users can create own review requests" ON public.review_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Super admin can update review requests" ON public.review_requests;
CREATE POLICY "Super admin can update review requests" ON public.review_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can read admin replies for own requests" ON public.admin_replies;
CREATE POLICY "Users can read admin replies for own requests" ON public.admin_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.review_requests rr
      WHERE rr.id = admin_replies.review_request_id
        AND (
          rr.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Super admin can create replies" ON public.admin_replies;
CREATE POLICY "Super admin can create replies" ON public.admin_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can read part update logs" ON public.part_update_logs;
CREATE POLICY "Users can read part update logs" ON public.part_update_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners and super admin can log part updates" ON public.part_update_logs;
CREATE POLICY "Owners and super admin can log part updates" ON public.part_update_logs
  FOR INSERT WITH CHECK (
    changed_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.parts pa
        WHERE pa.id = part_update_logs.part_id
          AND pa.dealer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
      )
    )
  );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS public.profile_meta (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_image_url text,
  about_text text,
  contact_phone text,
  city text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.service_center_services (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  description text,
  working_hours text,
  starting_price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  image_url text NOT NULL,
  thumbnail_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  related_part text,
  related_service text,
  status text NOT NULL DEFAULT 'pending',
  display_order integer NOT NULL DEFAULT 0,
  file_size integer,
  format_type text NOT NULL DEFAULT 'jpeg',
  upload_status text NOT NULL DEFAULT 'completed',
  width integer,
  height integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gallery_images_max_per_user CHECK (
    (SELECT COUNT(*) FROM gallery_images g2 WHERE g2.owner_id = gallery_images.owner_id) <= 50
  ),
  CONSTRAINT gallery_images_jpeg_only CHECK (format_type = 'jpeg' OR format_type = 'jpg'),
  CONSTRAINT gallery_images_file_size_limit CHECK (file_size IS NULL OR file_size <= 5242880)
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id bigserial PRIMARY KEY,
  target_type text NOT NULL,
  target_id text NOT NULL,
  title text NOT NULL,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_center_services_owner_idx ON public.service_center_services(owner_id);
CREATE INDEX IF NOT EXISTS gallery_images_owner_idx ON public.gallery_images(owner_id);
CREATE INDEX IF NOT EXISTS gallery_images_category_idx ON public.gallery_images(category);
CREATE INDEX IF NOT EXISTS gallery_images_created_idx ON public.gallery_images(created_at DESC);
CREATE INDEX IF NOT EXISTS gallery_images_status_idx ON public.gallery_images(status);
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS approval_requests_requester_idx ON public.approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS approval_requests_target_idx ON public.approval_requests(target_type, target_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profile_meta_set_updated_at'
  ) THEN
    CREATE TRIGGER profile_meta_set_updated_at
    BEFORE UPDATE ON public.profile_meta
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'service_center_services_set_updated_at'
  ) THEN
    CREATE TRIGGER service_center_services_set_updated_at
    BEFORE UPDATE ON public.service_center_services
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'gallery_images_set_updated_at'
  ) THEN
    CREATE TRIGGER gallery_images_set_updated_at
    BEFORE UPDATE ON public.gallery_images
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'approval_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER approval_requests_set_updated_at
    BEFORE UPDATE ON public.approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.profile_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_center_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile meta" ON public.profile_meta;
CREATE POLICY "Users can read own profile meta" ON public.profile_meta
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own profile meta" ON public.profile_meta;
CREATE POLICY "Users can upsert own profile meta" ON public.profile_meta
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read active services" ON public.service_center_services;
CREATE POLICY "Anyone can read active services" ON public.service_center_services
  FOR SELECT USING (
    status = 'active'
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

DROP POLICY IF EXISTS "Owners can manage own services" ON public.service_center_services;
CREATE POLICY "Owners can manage own services" ON public.service_center_services
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Reviewers can update services status" ON public.service_center_services;
CREATE POLICY "Reviewers can update services status" ON public.service_center_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

DROP POLICY IF EXISTS "Anyone can read active gallery" ON public.gallery_images;
CREATE POLICY "Anyone can read active gallery" ON public.gallery_images
  FOR SELECT USING (
    (status = 'active' AND is_public = true)
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

DROP POLICY IF EXISTS "Owners can manage own gallery" ON public.gallery_images;
CREATE POLICY "Owners can manage own gallery" ON public.gallery_images
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Reviewers can update gallery status" ON public.gallery_images;
CREATE POLICY "Reviewers can update gallery status" ON public.gallery_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

DROP POLICY IF EXISTS "Requester can read own approval requests" ON public.approval_requests;
CREATE POLICY "Requester can read own approval requests" ON public.approval_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

DROP POLICY IF EXISTS "Requester can create approval requests" ON public.approval_requests;
CREATE POLICY "Requester can create approval requests" ON public.approval_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Reviewers can update approval requests" ON public.approval_requests;
CREATE POLICY "Reviewers can update approval requests" ON public.approval_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'manager', 'representative')
    )
  );

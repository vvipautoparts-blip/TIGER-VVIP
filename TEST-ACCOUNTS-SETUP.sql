-- TIGER VVIP - Hierarchical test accounts profile setup
-- Purpose:
--   Link existing auth users to profiles with roles and hierarchy.
-- Requirement:
--   Create these users first in Supabase Authentication > Users (same emails below).
--
-- Test emails:
--   manager@test.com
--   supervisor@test.com
--   representative@test.com
--   dealer@test.com
--   buyer@test.com
--
-- Optional super admin email used as superior root:
--   vvipautoparts@gmail.com

-- 1) Check which required auth users already exist
SELECT email, id, created_at
FROM auth.users
WHERE email IN (
  'vvipautoparts@gmail.com',
  'manager@test.com',
  'supervisor@test.com',
  'representative@test.com',
  'dealer@test.com',
  'buyer@test.com'
)
ORDER BY email;

-- 2) Upsert base profiles without hierarchy first
WITH base_users AS (
  SELECT id, email
  FROM auth.users
  WHERE email IN (
    'vvipautoparts@gmail.com',
    'manager@test.com',
    'supervisor@test.com',
    'representative@test.com',
    'dealer@test.com',
    'buyer@test.com'
  )
)
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  phone,
  account_type,
  account_category,
  role,
  is_approved,
  subscription,
  created_at
)
SELECT
  u.id,
  CASE
    WHEN u.email = 'vvipautoparts@gmail.com' THEN 'VVIP Super Admin'
    WHEN u.email = 'manager@test.com' THEN 'Manager Test'
    WHEN u.email = 'supervisor@test.com' THEN 'Supervisor Test'
    WHEN u.email = 'representative@test.com' THEN 'Representative Test'
    WHEN u.email = 'dealer@test.com' THEN 'Dealer Test'
    WHEN u.email = 'buyer@test.com' THEN 'Buyer Test'
  END,
  u.email,
  CASE
    WHEN u.email = 'vvipautoparts@gmail.com' THEN '+962780003302'
    WHEN u.email = 'manager@test.com' THEN '+962780003303'
    WHEN u.email = 'supervisor@test.com' THEN '+962780003304'
    WHEN u.email = 'representative@test.com' THEN '+962780003305'
    WHEN u.email = 'dealer@test.com' THEN '+962780003306'
    WHEN u.email = 'buyer@test.com' THEN '+962780003307'
  END,
  CASE
    WHEN u.email = 'vvipautoparts@gmail.com' THEN 'المدير العام'
    WHEN u.email = 'manager@test.com' THEN 'مدير منطقة'
    WHEN u.email = 'supervisor@test.com' THEN 'مشرف'
    WHEN u.email = 'representative@test.com' THEN 'مندوب'
    WHEN u.email = 'dealer@test.com' THEN 'شركة قطع غيار'
    WHEN u.email = 'buyer@test.com' THEN 'مشتري'
  END,
  CASE
    WHEN u.email IN ('vvipautoparts@gmail.com', 'manager@test.com', 'supervisor@test.com', 'representative@test.com') THEN 'الإدارة'
    WHEN u.email = 'dealer@test.com' THEN 'قطع الغيار'
    WHEN u.email = 'buyer@test.com' THEN 'مشتري'
  END,
  CASE
    WHEN u.email = 'vvipautoparts@gmail.com' THEN 'super_admin'
    WHEN u.email = 'manager@test.com' THEN 'manager'
    WHEN u.email = 'supervisor@test.com' THEN 'supervisor'
    WHEN u.email = 'representative@test.com' THEN 'representative'
    WHEN u.email = 'dealer@test.com' THEN 'dealer'
    WHEN u.email = 'buyer@test.com' THEN 'buyer'
  END,
  true,
  CASE
    WHEN u.email IN ('vvipautoparts@gmail.com', 'manager@test.com', 'supervisor@test.com', 'representative@test.com') THEN 'premium'
    ELSE 'basic'
  END,
  now()
FROM base_users u
ON CONFLICT (id)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  account_type = EXCLUDED.account_type,
  account_category = EXCLUDED.account_category,
  role = EXCLUDED.role,
  is_approved = true,
  subscription = EXCLUDED.subscription;

-- 3) Apply hierarchy (superior_id)
WITH root_admin AS (
  SELECT id FROM public.profiles WHERE email = 'vvipautoparts@gmail.com' LIMIT 1
),
manager_user AS (
  SELECT id FROM public.profiles WHERE email = 'manager@test.com' LIMIT 1
),
supervisor_user AS (
  SELECT id FROM public.profiles WHERE email = 'supervisor@test.com' LIMIT 1
),
representative_user AS (
  SELECT id FROM public.profiles WHERE email = 'representative@test.com' LIMIT 1
)
UPDATE public.profiles p
SET superior_id =
  CASE
    WHEN p.email = 'manager@test.com' THEN (SELECT id FROM root_admin)
    WHEN p.email = 'supervisor@test.com' THEN (SELECT id FROM manager_user)
    WHEN p.email = 'representative@test.com' THEN (SELECT id FROM supervisor_user)
    WHEN p.email = 'dealer@test.com' THEN (SELECT id FROM representative_user)
    WHEN p.email = 'buyer@test.com' THEN (SELECT id FROM representative_user)
    ELSE p.superior_id
  END
WHERE p.email IN (
  'manager@test.com',
  'supervisor@test.com',
  'representative@test.com',
  'dealer@test.com',
  'buyer@test.com'
);

-- 4) Clear active sessions for clean login tests
UPDATE public.user_sessions
SET is_active = false
WHERE user_id IN (
  SELECT id
  FROM public.profiles
  WHERE email IN (
    'manager@test.com',
    'supervisor@test.com',
    'representative@test.com',
    'dealer@test.com',
    'buyer@test.com'
  )
);

-- 5) Verification output
SELECT
  p.email,
  p.role,
  p.is_approved,
  p.account_type,
  p.superior_id,
  superior.email AS superior_email
FROM public.profiles p
LEFT JOIN public.profiles superior ON superior.id = p.superior_id
WHERE p.email IN (
  'vvipautoparts@gmail.com',
  'manager@test.com',
  'supervisor@test.com',
  'representative@test.com',
  'dealer@test.com',
  'buyer@test.com'
)
ORDER BY
  CASE p.role
    WHEN 'super_admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'supervisor' THEN 3
    WHEN 'representative' THEN 4
    WHEN 'dealer' THEN 5
    WHEN 'buyer' THEN 6
    ELSE 7
  END;

-- 6) Optional: seed 3 test orders for representative to test commissions/payroll
-- Uncomment if needed.
--
-- INSERT INTO public.orders (
--   user_id,
--   customer_name,
--   company,
--   email,
--   phone,
--   product,
--   quantity,
--   location,
--   priority,
--   notes,
--   status,
--   created_at,
--   completed_at,
--   commission_amount,
--   completed_by
-- )
-- SELECT
--   rep.id,
--   'عميل تجريبي',
--   'شركة تجريبية',
--   'customer@test.com',
--   '+962780003399',
--   'فلتر هواء أصلي',
--   1,
--   'Amman',
--   'High',
--   'Seed order for payroll tests',
--   'Completed',
--   now() - interval '2 day',
--   now() - interval '1 day',
--   0.75,
--   rep.id
-- FROM public.profiles rep
-- WHERE rep.email = 'representative@test.com';
--
-- INSERT INTO public.commissions (
--   user_id,
--   order_id,
--   amount,
--   status,
--   cycle_type,
--   period_start,
--   period_end,
--   earned_at,
--   notes
-- )
-- SELECT
--   o.user_id,
--   o.id,
--   0.75,
--   'earned',
--   'weekly',
--   (current_date - 6),
--   current_date,
--   coalesce(o.completed_at, now()),
--   'Seeded commission'
-- FROM public.orders o
-- WHERE o.email = 'customer@test.com'
-- ON CONFLICT (order_id) DO NOTHING;

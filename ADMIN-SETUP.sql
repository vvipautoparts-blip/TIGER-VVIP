-- TIGER VVIP - Super Admin bootstrap script
-- Run this in Supabase SQL Editor AFTER creating the auth user from Dashboard.
--
-- Step 0 (Dashboard):
-- Create Auth user manually:
--   Email: vvipautoparts@gmail.com
--   Password: choose a strong password in dashboard
--   Email Confirmed: true
--
-- Step 1: find auth user id
-- Replace <ADMIN_EMAIL> if needed.

SELECT id, email, created_at
FROM auth.users
WHERE email = 'vvipautoparts@gmail.com';

-- Step 2: create/update profile with super admin role
-- Replace <ADMIN_USER_ID> with the UUID from the query above.

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
VALUES (
  '<ADMIN_USER_ID>'::uuid,
  'VVIP Super Admin',
  'vvipautoparts@gmail.com',
  '+962780003302',
  'المدير العام',
  'الإدارة',
  'super_admin',
  true,
  'premium',
  now()
)
ON CONFLICT (id)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  account_type = EXCLUDED.account_type,
  account_category = EXCLUDED.account_category,
  role = 'super_admin',
  is_approved = true,
  subscription = EXCLUDED.subscription;

-- Step 3: optional cleanup (recommended once)
-- Deactivate all previous sessions for the admin account.

UPDATE public.user_sessions
SET is_active = false
WHERE user_id = '<ADMIN_USER_ID>'::uuid;

-- Step 4: quick verification
SELECT id, email, phone, role, is_approved, subscription
FROM public.profiles
WHERE id = '<ADMIN_USER_ID>'::uuid;

-- Step 5: policy sanity checks (should return rows)
SELECT count(*) AS profiles_visible
FROM public.profiles;

SELECT count(*) AS orders_visible
FROM public.orders;

SELECT count(*) AS commissions_visible
FROM public.commissions;

SELECT count(*) AS salary_visible
FROM public.salary_payments;

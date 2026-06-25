-- =====================================================
-- ADMIN ROLE SYSTEM - Row-Level Security Policies
-- =====================================================
-- Purpose: Enable role-based access control for TIGER VVIP
-- Status: Ready to apply to Supabase project
-- Date: 2026-06-25

-- =====================================================
-- 0. Enable RLS on profiles table
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- POLICY 1: Users can view their own profile
-- =====================================================
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

COMMENT ON POLICY "Users can view own profile" ON profiles IS
'Every user can read their own profile data';


-- =====================================================
-- POLICY 2: Users can update their own profile
-- =====================================================
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can update own profile" ON profiles IS
'Every user can modify their own profile';


-- =====================================================
-- POLICY 3: Admins can view ALL profiles
-- =====================================================
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);

COMMENT ON POLICY "Admins can view all profiles" ON profiles IS
'Admin and super_admin users can view all user profiles';


-- =====================================================
-- POLICY 4: Admins can update ANY profile
-- =====================================================
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);

COMMENT ON POLICY "Admins can update any profile" ON profiles IS
'Admins can modify any user profile';


-- =====================================================
-- POLICY 5: Only super_admin can delete profiles
-- =====================================================
CREATE POLICY "Super admins can delete profiles"
ON profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'super_admin'
  )
);

COMMENT ON POLICY "Super admins can delete profiles" ON profiles IS
'Only super_admin users can delete profiles';


-- =====================================================
-- VERIFICATION SCRIPT
-- Run this to verify policies are enabled:
-- =====================================================
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
*/


-- =====================================================
-- TESTING SCENARIOS
-- =====================================================
/*
** Test 1: Regular user can only see own profile **
SELECT * FROM profiles WHERE id = 'user-123';  -- ✅ Returns own profile
SELECT * FROM profiles WHERE id = 'user-456';  -- ❌ Access denied

** Test 2: Admin can see all profiles **
SELECT * FROM profiles;  -- ✅ Returns all profiles

** Test 3: Regular user cannot update others' profile **
UPDATE profiles SET full_name = 'Hacked' WHERE id = 'user-456';  -- ❌ Access denied
UPDATE profiles SET full_name = 'John' WHERE id = 'user-123';    -- ✅ Updates own

** Test 4: Admin can update any profile **
UPDATE profiles SET is_approved = true WHERE id = 'user-456';  -- ✅ Admin can update

** Test 5: Regular user cannot delete profiles **
DELETE FROM profiles WHERE id = 'user-456';  -- ❌ Access denied

** Test 6: Only super_admin can delete **
DELETE FROM profiles WHERE id = 'user-456';  -- ✅ (super_admin only)
*/

-- =====================================================
-- MIGRATION NOTE
-- =====================================================
-- If you need to update existing roles:
-- UPDATE profiles SET role = 'super_admin' WHERE id = 'your-admin-id';
-- UPDATE profiles SET role = 'admin' WHERE id = 'another-admin-id';
-- UPDATE profiles SET role = 'dealer' WHERE role IS NULL;

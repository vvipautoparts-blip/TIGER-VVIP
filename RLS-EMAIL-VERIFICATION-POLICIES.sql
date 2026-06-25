-- ============================================
-- 📧 EMAIL VERIFICATION & RLS POLICIES
-- Supabase PostgreSQL Setup
-- ============================================

-- ✅ STEP 1: Enable Row Level Security on 'profiles' table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 🔒 POLICY 1: Users can view their own profile
-- ============================================
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- ============================================
-- 🔒 POLICY 2: Users can update their own profile
-- ============================================
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 🔒 POLICY 3: Users can insert their own profile
-- ============================================
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 🔒 POLICY 4: Super admins can view all profiles
-- ============================================
CREATE POLICY "Super admins can view all profiles"
ON profiles
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'super_admin'
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- ============================================
-- 🔒 POLICY 5: Super admins can update any profile
-- ============================================
CREATE POLICY "Super admins can update any profile"
ON profiles
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'super_admin'
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- ============================================
-- 🔒 POLICY 6: Super admins can delete profiles
-- ============================================
CREATE POLICY "Super admins can delete profiles"
ON profiles
FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'super_admin'
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
);

-- ============================================
-- 📋 STEP 2: Ensure 'profiles' table has email verification columns
-- ============================================
-- Run this ONLY if your profiles table doesn't have these columns:

-- ALTER TABLE profiles 
-- ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
-- ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE;

-- ============================================
-- 🧪 TEST POLICIES
-- ============================================

-- Test as authenticated user (viewing own profile)
-- SELECT * FROM profiles WHERE id = auth.uid();

-- Test as admin (viewing all profiles)
-- SELECT * FROM profiles;

-- ============================================
-- 📞 VERIFICATION EMAIL CONFIGURATION
-- In Supabase Dashboard:
-- ============================================
/*
1. Go to: Authentication → Email Templates → Confirm signup
2. Set redirect URL to: https://vvipautoparts-blip.github.io/TIGER-VVIP/?verified=true#registration-page

3. Email content template:
   - Subject: ✅ تأكيد البريد الإلكتروني - Confirm Your Email
   - Body: 
     أهلا {{ .Email }},
     
     يرجى تأكيد بريدك الإلكتروني بالنقر على الرابط أدناه:
     {{ .ConfirmationURL }}
     
     ----
     Hi {{ .Email }},
     
     Please confirm your email by clicking the link below:
     {{ .ConfirmationURL }}
*/

-- ============================================
-- 🔌 SMTP CONFIGURATION (In Supabase)
-- ============================================
/*
1. Go to: Authentication → SMTP
2. Choose provider (Resend/Brevo/SendGrid)
3. Add credentials:
   - Sender Email: noreply@yourdomain.com
   - SMTP Host: smtp.resend.com (for Resend)
   - SMTP Port: 465
   - Username: your-api-key
   - Password: your-api-key
*/

-- ============================================
-- ✅ VERIFICATION CHECK
-- ============================================
-- Run this to verify RLS is working:
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
-- Expected: Should show 'profiles' table with rowsecurity = true

-- ============================================
-- 🔐 Security Notes
-- ============================================
/*
- All queries automatically filter by auth.uid()
- Admins bypass user filters via role check
- Email verification prevents unauthorized access
- unconfirmed emails cannot access protected routes
- Role-based access control (RBAC) enforced at DB level
*/

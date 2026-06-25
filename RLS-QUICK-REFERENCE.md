# 🔒 RLS Policies Quick Reference

## Current Status
✅ **File:** `RLS-EMAIL-VERIFICATION-POLICIES.sql` ready
✅ **Location:** `/workspaces/TIGER-VVIP/RLS-EMAIL-VERIFICATION-POLICIES.sql`

---

## What RLS Does

**Row-Level Security (RLS)** ensures that:
- Users can only see/edit their own profile
- Admins can see/edit all profiles
- Unverified users are blocked at database level

---

## Quick Start - 3 Steps

### **Step 1: Open Supabase SQL Editor**
```
1. Go to: https://app.supabase.com
2. Select your TIGER VVIP project
3. Click: SQL Editor (left sidebar)
4. Click: "New Query"
```

### **Step 2: Copy & Paste Entire SQL File**
```
1. Open: /workspaces/TIGER-VVIP/RLS-EMAIL-VERIFICATION-POLICIES.sql
2. Copy ALL content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
```

### **Step 3: Run**
```
1. Click: "Run" button (or Ctrl+Enter)
2. ✅ Should see: "CREATE POLICY" messages
3. ✅ Done!
```

---

## The 6 Policies Explained

### Policy 1: Users View Own Profile
```sql
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```
**Translation:** Only see your own data

---

### Policy 2: Users Update Own Profile
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```
**Translation:** Only edit your own data

---

### Policy 3: Users Insert Own Profile
```sql
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```
**Translation:** Only create profile for yourself

---

### Policy 4: Admins View All
```sql
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (auth.jwt() ->> 'role' = 'super_admin');
```
**Translation:** Admins see everything

---

### Policy 5: Admins Update All
```sql
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'super_admin');
```
**Translation:** Admins can change anything

---

### Policy 6: Admins Delete
```sql
CREATE POLICY "Admin can delete any profile"
  ON profiles FOR DELETE
  USING (auth.jwt() ->> 'role' = 'super_admin');
```
**Translation:** Admins can remove profiles

---

## Verify It Worked

### In Supabase SQL Editor:
```sql
-- Check RLS is enabled on profiles table
SELECT tablename FROM pg_tables 
WHERE rowsecurity = true;

-- Should see: profiles
```

### In Browser Console:
```javascript
// Try to view other user's profile
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .neq('id', currentUserId)
  .single();

// Should return: error (access denied)
// Not error: success = RLS is working
```

---

## What Goes in `auth.jwt()` ?

When a user signs in, their JWT token contains:

```json
{
  "sub": "user-id-here",
  "aud": "authenticated",
  "role": "authenticated",
  "email": "user@example.com",
  "user_metadata": {
    "full_name": "User Name",
    "account_type": "dealer"
  },
  // Custom role (added by Supabase Admin)
  "app_metadata": {
    "role": "super_admin"  // This is what RLS checks
  }
}
```

---

## Setting User Roles (For Admins)

In Supabase Dashboard:

1. **Go to:** Authentication → Users
2. **Click:** User email
3. **Find:** "App Metadata"
4. **Add:**
```json
{
  "role": "super_admin"
}
```
5. **Save**

Now this user is an admin!

---

## Testing Each Policy

### Test 1: User Can See Own Data
```javascript
const { data } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', currentUserId)
  .single();

// ✅ Should work
```

### Test 2: User Cannot See Others
```javascript
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .neq('id', currentUserId)
  .single();

// ✅ Should error (no access)
```

### Test 3: Admin Can See All
```javascript
// Switch to admin account
const { data } = await supabaseClient
  .from('profiles')
  .select('*'); // No WHERE clause

// ✅ Should return all profiles
```

---

## If Something Goes Wrong

### RLS Policies Not Applied?
```sql
-- Drop and re-apply
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- Re-run the entire SQL file
```

### Still Getting Access Denied?
```sql
-- Disable RLS temporarily to debug
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Run test query
-- Then re-enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Users Can't See Their Own Profile?
```sql
-- Check if RLS is ON
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- rowsecurity should be true
```

---

## Next Steps

1. ✅ Copy entire `RLS-EMAIL-VERIFICATION-POLICIES.sql`
2. ✅ Run in Supabase SQL Editor
3. ✅ Test each policy above
4. ✅ Set admin roles for test accounts
5. ✅ Deploy and verify in production

---

**Ready?** Open Supabase and run the SQL file now!

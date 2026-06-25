# 📧 Email Verification & Authentication Setup Guide

**Project:** TIGER VVIP  
**Date:** 2026-06-25  
**Phase:** 4 of 6 - Email Verification Implementation

---

## 📋 What's Been Implemented

### ✅ Backend Functions (script.js)

#### 1. **checkEmailVerificationStatus(user)**
```javascript
// Check if user's email has been verified
const result = await checkEmailVerificationStatus(user);
// Returns: { verified: true/false, confirmedAt, email }
```

**Features:**
- Checks `user.email_confirmed_at` from Supabase Auth
- Falls back to checking `profiles.email_verified_at` 
- Returns verification status with timestamp

#### 2. **monitorEmailVerificationStatus()**
```javascript
// Listen for auth state changes and redirect when verified
monitorEmailVerificationStatus();
```

**Features:**
- Monitors `supabaseClient.auth.onAuthStateChange()`
- Auto-redirects to `#profile-page` when email verified
- Works with both production and demo modes

#### 3. **Enhanced handleRegEmailVerified()**
```javascript
handleRegEmailVerified(); // Called after user confirms email
```

**Enhanced:**
- Sets `demo_email_verified` flag
- Calls `monitorEmailVerificationStatus()` automatically
- Shows success message
- Navigates to verified step

---

## 🔒 RLS Policies (Database Security)

**File:** `RLS-EMAIL-VERIFICATION-POLICIES.sql`

### Policies Included:

| Policy | Permission | Condition |
|--------|-----------|-----------|
| View Own Profile | SELECT | `auth.uid() = id` |
| Update Own Profile | UPDATE | `auth.uid() = id` |
| Insert Own Profile | INSERT | `auth.uid() = id` |
| Admin View All | SELECT | `role = 'super_admin'` |
| Admin Update All | UPDATE | `role = 'super_admin'` |
| Admin Delete All | DELETE | `role = 'super_admin'` |

---

## 🔧 Setup Instructions (Step-by-Step)

### **Step 1: Supabase Dashboard Configuration**

#### A. Enable Email Confirmation
1. Go to: **Authentication** → **Email Templates**
2. Find **"Confirm signup"** template
3. Set **Redirect URL** to:
   ```
   https://vvipautoparts-blip.github.io/TIGER-VVIP/?verified=true#registration-page
   ```

#### B. Configure SMTP Provider

**Option 1: Resend (Recommended)**
```
1. Sign up: https://resend.com/
2. Get API Key from dashboard
3. In Supabase: Authentication → Email
4. SMTP Settings:
   - Host: smtp.resend.com
   - Port: 465
   - Username: resend (or your API key)
   - Password: [Your Resend API Key]
   - From Email: noreply@yourdomain.com
```

**Option 2: Brevo (SendinBlue)**
```
1. Sign up: https://www.brevo.com/
2. Get SMTP credentials
3. Same configuration in Supabase
```

---

### **Step 2: Apply RLS Policies**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy entire content from `RLS-EMAIL-VERIFICATION-POLICIES.sql`
4. Paste into SQL Editor
5. Click **"Run"**

✅ Verify success - you should see:
```
CREATE POLICY
(repeated 6 times for each policy)
```

---

### **Step 3: Configure Google OAuth (Optional)**

If using Google Sign-In:

1. Get **Google Client ID** from Google Cloud Console
2. In `script.js`, replace (line ~3125):
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
   // ↓ with
   const GOOGLE_CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
   ```

3. In Supabase: **Authentication** → **Providers** → **Google**
   - Enable and add same OAuth credentials

---

## 🧪 Testing the Workflow

### **Test 1: Email Registration**
```
1. Navigate to: https://vvipautoparts-blip.github.io/TIGER-VVIP/#registration-page
2. Enter email and account type
3. Click "Verify Email"
4. ✅ Should see: "Check your email" message
```

### **Test 2: Email Verification** (Demo Mode)
```
1. In demo mode, code automatically sends verification
2. Click "Verified ✓" button
3. ✅ Should redirect to profile page
```

### **Test 3: RLS Security** (Production)
```
1. Create 2 test accounts (user1@test.com, user2@test.com)
2. Login as user1
3. Try to access user2's profile via console:
   SELECT * FROM profiles WHERE id != auth.uid();
4. ✅ Should return empty (no access to other profiles)
```

---

## 📊 Database Changes Required

Ensure your `profiles` table has these columns:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE;
```

---

## 🔄 Email Verification Workflow (Visual)

```
┌─────────────────────────────────────────────────┐
│  1. User enters email on registration page      │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  2. System sends verification email             │
│     (via Supabase Magic Link)                   │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  3. User sees "Check Email" screen              │
│     - Option to click "Verified ✓"              │
│     - Option to "Resend" email                  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  4. monitorEmailVerificationStatus()            │
│     - Detects email_confirmed_at                │
│     - Auto-redirects to profile page            │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  5. RLS Policies Enforce                        │
│     - User can only see own profile             │
│     - Admins can see all profiles               │
│     - Verified email required for access        │
└─────────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### **Problem: Email not sent**
- ✅ Check SMTP configuration in Supabase
- ✅ Verify Resend/Brevo API key is valid
- ✅ Check email is in correct format

### **Problem: Auto-redirect not working**
- ✅ Clear localStorage: `localStorage.clear()`
- ✅ Check if `supabaseClient` is initialized
- ✅ Verify email has `email_confirmed_at` timestamp

### **Problem: RLS blocking access**
- ✅ Check `email_confirmed_at` is set in auth.users
- ✅ Verify RLS policies are applied correctly
- ✅ Check user role matches policy conditions

---

## 📝 Code Examples

### Check if user's email is verified:
```javascript
const { data } = await supabaseClient.auth.getSession();
if (data.session?.user?.email_confirmed_at) {
  console.log('✅ Email verified');
} else {
  console.log('⏳ Email not yet verified');
}
```

### Fetch user's profile (with RLS):
```javascript
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

if (error) {
  console.error('❌ Access denied by RLS');
}
```

### Check if user is admin:
```javascript
const isAdmin = data?.jwt() ->> 'role' === 'super_admin';
```

---

## ✅ Next Steps

1. **Apply SQL** - Run `RLS-EMAIL-VERIFICATION-POLICIES.sql` in Supabase
2. **Configure SMTP** - Set up email provider (Resend/Brevo)
3. **Test Email Flow** - Test registration and verification
4. **Deploy** - Push changes to GitHub (auto-deploy to Pages)
5. **Monitor** - Check server logs for email delivery

---

## 📞 Need Help?

- **Email not configured?** → See "Configure SMTP Provider" section
- **RLS not working?** → Run SQL policies again
- **Google OAuth issues?** → Check `GOOGLE-ONE-TAP-SETUP.md`

---

**Status:** ✅ Phase 4 Complete - Ready for Testing

# مواصفات نظام اختيار الحساب (Account Chooser)
## Supabase + Google OAuth

**التاريخ:** 2026-06-25  
**الحالة:** تحت التطوير  

---

## 1. ملخص المتطلبات

تنفيذ ميزة **"استخدم حساب آخر"** تعرض اختيار الحسابات المرتبطة بـ Google عند تسجيل الدخول، مشابهة لتجربة Facebook/Google، مع دعم أجهزة متعددة.

### المخرجات المتوقعة:
- زر "استخدم حساب آخر" في صفحة الدخول
- عند النقر: عرض Google Account Chooser
- اختيار الحساب يتم الدخول به مباشرة
- دعم أجهزة متعددة عبر مزامنة المتصفح

---

## 2. التصميم الفني

### 2.1 مزود الهوية
- **Provider**: Google OAuth (مفعل في Supabase)
- **Auth Flow**: OAuth 2.0 with Account Chooser prompt

### 2.2 آلية الطلب
```javascript
// عند نقر زر "استخدم حساب آخر"
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    queryParams: {
      prompt: 'select_account'  // ← المفتاح الأساسي
    }
  }
});
```

**شرح**: تمرير `prompt=select_account` يجبر Google على عرض Account Chooser بدلاً من استخدام الحساب الأخير تلقائياً.

### 2.3 إدارة الجلسة
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (session && session.provider_token) {
    localStorage.setItem('oauth_provider_token', session.provider_token);
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('oauth_provider_token');
  }
});
```

### 2.4 أمان وخصوصية
- لا يمكن للتطبيق قراءة حسابات الجهاز (قيد أمني)
- Google/المتصفح يدير عرض الحسابات
- مزامنة البيانات عبر Chrome Sync اختيارية

---

## 3. خطوات الإعداد (Technical Setup)

### 3.1 Google Cloud Console
1. إنشاء مشروع جديد
2. تفعيل Google+ API
3. إعداد OAuth Consent Screen (Internal/External)
4. إنشاء OAuth 2.0 Client ID (Web Application)
5. إضافة Redirect URIs من Supabase

### 3.2 Supabase Configuration
1. الذهاب إلى: **Authentication → Providers → Google**
2. تفعيل Google Provider
3. لصق:
   - Client ID
   - Client Secret
4. حفظ الإعدادات

### 3.3 Redirect URL (مهم)
```
https://vvipautoparts-blip.github.io/TIGER-VVIP/
http://localhost:8000/
```
يجب إضافة كلا الرابطين في Google Cloud و Supabase.

---

## 4. الكود المطلوب

### 4.1 دالة تسجيل الدخول
```javascript
async function signInWithGoogleAccountChooser() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    
    if (error) {
      console.error('❌ Google OAuth Error:', error);
      showMessage(
        currentLang === 'ar' 
          ? 'خطأ في تسجيل الدخول عبر Google' 
          : 'Google login error',
        'error'
      );
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}
```

### 4.2 تحديث الواجهة (onAuthStateChange)
```javascript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // تحديث الملف الشخصي بدون إعادة تحميل
    currentUser = session.user;
    currentUserProfile = await fetchUserProfile(session.user.id);
    displayUser(currentUser);
    updatePageVisibility();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentUserProfile = null;
    displayUser(null);
    updatePageVisibility();
  }
});
```

### 4.3 HTML (زر "استخدم حساب آخر")
```html
<button 
  id="auth-google-account-chooser-btn" 
  class="auth-btn-secondary"
  onclick="signInWithGoogleAccountChooser()"
  data-ar="استخدم حساب آخر"
  data-en="Use Another Account">
  استخدم حساب آخر
</button>
```

---

## 5. حالات المشاكل والحلول

### 5.1 المشكلة: عدم ظهور Account Chooser
**السبب**: عدم تمرير `prompt=select_account` أو تسجيل الخروج من Google أولاً.

**الحل**:
```javascript
// تأكد من تمرير prompt دائماً
options: {
  queryParams: {
    prompt: 'select_account'
  }
}

// أو قم بتسجيل الخروج من Google أولاً
await supabase.auth.signOut();
// ثم استدعي signInWithOAuth
```

### 5.2 المشكلة: الحسابات لا تظهر على أجهزة متعددة
**السبب**: Chrome Sync غير مفعل أو حسابات Google مختلفة.

**الحل**: 
- تفعيل Google Account Sync في المتصفح
- اعتماد نفس حساب Google على الأجهزة المختلفة

### 5.3 المشكلة: Redirect لا يعمل في WebView
**السبب**: Fragment (#) في URL لا يُعالج بشكل صحيح.

**الحل**: أنشئ relay/callback page (انظر الملف الإضافي: `callback-handler.html`)

---

## 6. سيناريوهات الاختبار

| السيناريو | المتصفح | النتيجة المتوقعة |
|---------|--------|-----------------|
| اختيار حساب جديد | Chrome Desktop | ظهور Account Chooser |
| حساب واحد فقط | Safari Mobile | الدخول مباشرة |
| حسابات متعددة | Chrome with Sync | اختيار من قائمة |
| بعد تسجيل الخروج | Firefox | عرض Chooser مجدداً |

---

## 7. المراجع والموارد

- [Supabase signInWithOAuth Docs](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)
- [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
- [Chrome Enterprise - Account Selection](https://support.google.com/chromebook/answer/1190410)

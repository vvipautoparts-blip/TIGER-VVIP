# إعداد Google One Tap Sign-up

## الخطوات السريعة

### 1. الحصول على Google Client ID

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو استخدم موجود
3. فعّل **Google+ API**
4. اذهب إلى **Credentials** → Create OAuth 2.0 Client ID (Web Application)
5. أضف Redirect URIs:
   - `http://127.0.0.1:8000/`
   - `https://vvipautoparts-blip.github.io/TIGER-VVIP/`

### 2. استخدام Client ID

استبدل `YOUR_GOOGLE_CLIENT_ID` في `script.js` (سطر ~3129):

```javascript
google.accounts.id.initialize({
  client_id: 'your-actual-client-id-here.apps.googleusercontent.com',
  // ...
});
```

### 3. تفعيل في Supabase (اختياري)

إذا أردت المصادقة عبر Supabase:

1. اذهب إلى Supabase Dashboard
2. Authentication → Providers → Google
3. فعّل وضع الـ Implicit Flow
4. أضف نفس Redirect URLs

### 4. الميزات

- ✅ **One Tap Popup**: بوب أب احترافي يظهر للمستخدم
- ✅ **Account Chooser**: اختيار من الحسابات المحفوظة
- ✅ **Auto-fill**: ملء بيانات المستخدم تلقائياً
- ✅ **Security**: JWT Token verification
- ✅ **Saved Emails**: حفظ البريد في localStorage

---

## الحل الكامل

الآن صفحة إنشاء الحساب تحتوي على:

```
┌─────────────────────────────────┐
│   إنشاء حساب جديد               │
├─────────────────────────────────┤
│  [Google Sign In Button]        │ ← Google One Tap
│         أو                      │
│  اختر نوع الحساب: [▼]          │ ← النموذج العادي
│  البريد: [📧 ▼]                 │ ← مع البريدات المحفوظة
│  [التحقق من البريد]             │
└─────────────────────────────────┘
```

### الفوائد:
- تجربة Facebook محترفة
- بدون مشاكل برمجية
- آمن وموثوق
- أداء عالي

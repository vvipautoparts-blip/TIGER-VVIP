# Firebase Email/Password Authentication Setup

## ⚡ خطوات التفعيل في Firebase Console:

### 1. اذهب إلى Firebase Console
```
🔗 https://console.firebase.google.com
```

### 2. اختر Project: `auto-parts-aa00a`
```
Project Settings → Select auto-parts-aa00a
```

### 3. اذهب إلى Authentication
```
Build → Authentication → Sign-in method
```

### 4. تفعيل Email/Password
- اضغط على **Email/Password**
- فعّل **Enabled** 
- فعّل **Password-based accounts**
- اضغط **Save**

### 5. إضافة Authorized Domains
```
Settings → Authorized domains
→ Add domain: tigerautoparts.shop
→ Save
```

### 6. تفعيل Email Verification
```
Templates → Email Templates → Email Verification
→ تأكد من أنها **مفعلة**
```

---

## 🔐 OAuth Setup (Google & Facebook)

### Google OAuth
```
1. اذهب: https://console.cloud.google.com
2. Select Project: auto-parts-aa00a
3. APIs & Services → Credentials
4. عدّل OAuth 2.0 Client ID
5. Authorized redirect URIs:
   - https://tigerautoparts.shop/
   - https://tigerautoparts.shop/index.html
   - https://auto-parts-aa00a.firebaseapp.com/__/auth/handler
   - http://localhost:800/
   - http://127.0.0.1:800/
```

### Facebook App
```
1. اذهب: https://developers.facebook.com
2. اختر App
3. Settings → Basic
   - App Domains: tigerautoparts.shop
4. Facebook Login → Settings
   - Valid OAuth Redirect URIs:
     * https://tigerautoparts.shop/
     * https://auto-parts-aa00a.firebaseapp.com/__/auth/handler
```

---

## ✅ اختبار

```
✓ جرّب Email/Password login
✓ جرّب Google login
✓ جرّب Facebook login
✓ تحقق من البريد الإلكتروني
```

---

## 🐛 استكشاف الأخطاء

### خطأ: "Email sign-in is not enabled"
```
✓ افتح Firebase Console
✓ اذهب Authentication → Sign-in method
✓ تأكد أن Email/Password مفعّل
```

### خطأ: "Redirect URI mismatch"
```
✓ أضف جميع الـ URIs في Google Console و Facebook
✓ تأكد من مطابقة الـ domain بالضبط
```

### خطأ: "Email not sent"
```
✓ تأكد من تفعيل Email Templates في Firebase
✓ تحقق من SMTP settings (إذا كنت تستخدم custom email)
```

# 🚀 دليل الحل السريع - تسجيل الدخول والبريد الإلكتروني

## ⚠️ الخطأ: "Email/Password login is not enabled"

### ✅ **الحل:**

#### 1. اذهب إلى Firebase Console
```
🔗 https://console.firebase.google.com
```

#### 2. اختر Project: `auto-parts-aa00a`
```
القائمة الرئيسية → اختر auto-parts-aa00a
```

#### 3. اذهب إلى Authentication
```
Build (البناء) → Authentication (المصادقة)
```

#### 4. اضغط على "Sign-in method" 
```
Sign-in method → اختر Email/Password
```

#### 5. فعّل Email/Password
```
✓ اضغط على Email/Password
✓ فعّل "Enabled" (أخضر)
✓ فعّل "Password-based accounts"
✓ اضغط "Save"
```

**الآن سيعمل تسجيل الدخول! ✅**

---

## ⚠️ الخطأ: "Redirect URI mismatch" (Google/Facebook)

### ✅ **الحل:**

#### لـ Google:
```
1. اذهب: https://console.cloud.google.com
2. اختر Project: auto-parts-aa00a
3. APIs & Services → Credentials
4. اضغط على OAuth 2.0 Client ID
5. أضف جميع هذه URIs:

   https://tigerautoparts.shop/
   https://tigerautoparts.shop/index.html
   https://auto-parts-aa00a.firebaseapp.com/__/auth/handler
   http://localhost:8080/
   http://127.0.0.1:8080/

6. Save
```

#### لـ Facebook:
```
1. اذهب: https://developers.facebook.com
2. اختر App
3. Settings → Basic
   - App Domains: tigerautoparts.shop
   
4. Facebook Login → Settings
   - أضف Valid OAuth Redirect URIs:
   
   https://tigerautoparts.shop/
   https://auto-parts-aa00a.firebaseapp.com/__/auth/handler
```

---

## ⚠️ الخطأ: "البريد الإلكتروني لا يصل"

### ✅ **الحل:**

#### تأكد من تفعيل Email Verification:
```
Firebase Console → Authentication → Templates
→ Email Verification → تأكد من الـ enabled status
```

#### الرسالة قد تكون في Spam:
```
✓ افتح صندوق Spam
✓ ابحث عن: "AutoParts JO - Email Verification"
✓ اضغط "Confirm your email"
```

---

## 🧪 **اختبار التكامل:**

### 1️⃣ **اختبر Email/Password:**
```
بريد: test@example.com
كلمة المرور: TestPassword123
```

### 2️⃣ **اختبر Google:**
```
اضغط "تسجيل الدخول عبر Google"
→ اختر حسابك
→ تحقق من البريد
```

### 3️⃣ **اختبر Facebook:**
```
اضغط "تسجيل الدخول عبر Facebook"
→ اختر حسابك
→ تحقق من البريد
```

---

## 🐛 **تشخيص الأخطاء:**

### افتح Browser Console:
```
F12 أو Ctrl+Shift+I
→ اذهب إلى Console tab
→ ستشوف الأخطاء التفصيلية:

🔍 "DIAGNOSTICS REPORT"
🔍 "Firebase setup is valid"
🔍 "Email/Password auth IS enabled"
```

### انسخ الخطأ والبحث عنه:
```
1. انسخ error message من Console
2. ابحث عنه في:
   - Firebase Docs
   - Stack Overflow
```

---

## 📞 **تحتاج مساعدة إضافية؟**

### تحقق من:
- [ ] Firebase Project معرّف بشكل صحيح
- [ ] Email/Password مفعّل في Firebase
- [ ] Google/Facebook OAuth URIs أضيفت
- [ ] Authorized domains أضيفت
- [ ] Browser Console لا يظهر أخطاء
- [ ] البريد الإلكتروني ليس في Spam

---

**✅ إذا اتبعت الخطوات أعلاه، كل شيء سيعمل!**

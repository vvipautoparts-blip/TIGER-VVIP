# إعداد المدير العام (Super Admin) - TIGER VVIP

هذا الدليل يكمّل السكيمة الجديدة ويجهّز حساب المدير العام الحقيقي داخل Supabase.

## 1) تنفيذ السكيمة
1. افتح Supabase Dashboard.
2. ادخل SQL Editor.
3. نفّذ كامل ملف:
   - supabase-schema.sql

## 2) إنشاء مستخدم Auth
1. من Authentication > Users.
2. أنشئ مستخدم جديد:
   - Email: vvipautoparts@gmail.com
   - Password: كلمة قوية (اخترها من الداشبورد)
   - Email confirmed: true

## 3) ربطه كمدير عام
1. افتح SQL Editor.
2. نفّذ ملف:
   - ADMIN-SETUP.sql
3. استبدل القيمة:
   - <ADMIN_USER_ID>
   بالـ UUID الفعلي من جدول auth.users.

## 4) تفعيل التحقق الهاتفي الداخلي
التطبيق الآن يربط التحقق الهاتفي عبر endpoint داخلي. لذلك:
1. جهّز Backend endpoint خاص بك (مثلا عبر Edge Function أو API server).
2. endpoint يستقبل:
   - phone
   - code
    - channel=internal
3. قبل تحميل [auth.js](auth.js) و[reset-password.js](reset-password.js)، عرّف المتغير:

```html
<script>
   window.FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
</script>
```

إذا كنت تحتاج تحقق الهاتف، فالنقطة الحالية هي [supabase/functions/phone-verification/index.ts](supabase/functions/phone-verification/index.ts).

## 5) اختبار القيود الرئيسية
1. التسجيل الإداري:
   - سجل مدير منطقة/مشرف/مندوب.
   - يجب أن يُنشأ الحساب كـ is_approved=false.
2. اعتماد المدير:
   - من لوحة المدير العام اعتمد الحساب.
3. حد 3 أجهزة:
   - سجل دخول نفس الحساب من 4 أجهزة/متصفحات مختلفة.
   - يجب رفض الجهاز الرابع.
4. الرواتب الأسبوعية:
   - أكمل عمليات لتسجيل عمولات earned.
   - من لوحة المدير العام استخدم صرف أسبوعي.

## 6) ملاحظة أمان مهمة
لا تضع كلمات المرور الثابتة داخل ملفات المشروع. إنشاء كلمة المرور يتم من Supabase Dashboard فقط.

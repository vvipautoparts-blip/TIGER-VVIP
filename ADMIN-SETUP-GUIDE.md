# إعداد المدير العام (Super Admin) - TIGER VVIP

هذا الدليل يكمّل السكيمة الجديدة ويجهّز حساب المدير العام الحقيقي داخل Supabase.

## 1) تنفيذ السكيمة

1. افتح Supabase Dashboard.
2. ادخل SQL Editor.
3. نفّذ كامل ملف `supabase-schema.sql`.

## 2) إنشاء مستخدم Auth

1. من Authentication > Users.
2. أنشئ مستخدم جديد:
   - Email: `vvipautoparts@gmail.com`
   - Password: كلمة قوية (اخترها من الداشبورد)
   - Email confirmed: true

## 3) ربطه كمدير عام

1. افتح SQL Editor.
2. نفّذ ملف `ADMIN-SETUP.sql`.
3. استبدل القيمة:
   - <ADMIN_USER_ID>
   بالـ UUID الفعلي من جدول auth.users.

## 4) تفعيل OTP واتساب (إجباري فعلي)

التطبيق الآن يرسل OTP عبر endpoint خارجي. لذلك:

1. جهّز Backend endpoint خاص بك (مثلا عبر Edge Function أو API server).
2. endpoint يستقبل:
   - phone
   - code
   - channel=whatsapp
3. قبل تحميل script.js، عرّف المتغير:

```html
<script>
  window.WHATSAPP_OTP_ENDPOINT = "https://YOUR-ENDPOINT/send-otp";
</script>
```

بدون هذا endpoint، سيبقى الإرسال في وضع تحذيري (غير إنتاجي).

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

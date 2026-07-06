# تقرير تدقيق نظام الدخول والربط
## VVIP TIGER AUTH AUDIT

المرحلة: التنفيذ النهائي بعد اعتماد الخطة الكاملة  
المرجع: docs/VVIP_TIGER_MEMORY_MAP.md  
الحالة: تقرير تدقيق فقط، بدون تعديل على الكود الآن

---

## 1. الهدف

تثبيت الوضع الحالي لنظام الدخول قبل أي تعديل.

القرار المعتمد:
- Clerk هو نظام الدخول الرسمي.
- Supabase هو نظام البيانات والبروفايلات والمنشورات والتذاكر والصلاحيات.
- لا نكسر الموجود.
- لا نعيد بناء تسجيل يدوي قديم.

---

## 2. الوضع الحالي

الفحص أظهر وجود مسارين حاليًا:

1. صفحة index.html تستخدم Clerk.
2. صفحة private-profile.html ما زالت تستخدم Supabase Auth.

هذا يعني أن المشروع لم يصبح بعد موحدًا بالكامل تحت Clerk.

---

## 3. Clerk الحالي

صفحة index.html تحمل Clerk وتستخدم الملف:

- auth-clerk-index.js

وهذا الملف يستخدم:
- window.Clerk.load
- window.Clerk.isSignedIn
- window.Clerk.user
- window.Clerk.mountSignIn
- window.Clerk.mountUserButton
- window.Clerk.signOut

هذا يؤكد أن Clerk موجود ويعمل في صفحة الدخول الرئيسية.

---

## 4. البروفايل الخاص الحالي

صفحة private-profile.html تستخدم:

- scripts/supabase-config.js
- scripts/require-auth.js
- scripts/profile-loader.js

وهذا يعني أنها تعتمد على جلسة Supabase وليس Clerk مباشرة.

---

## 5. تحميل البروفايل الحالي

ملف scripts/profile-loader.js يبحث في جدول profiles باستخدام:

- profiles.id = user.id

وهذا مناسب لمسار Supabase Auth القديم، لكنه ليس الربط النهائي مع Clerk.

---

## 6. المشكلة

معرّف مستخدم Clerk لا يساوي دائمًا معرّف مستخدم Supabase.

لذلك قد يدخل المستخدم من Clerk بنجاح، لكن صفحة البروفايل لا تجد بياناته إذا كانت تبحث بجلسة Supabase أو id مختلف.

---

## 7. القرار الصحيح

يجب تجهيز جدول profiles ليحتوي على حقل:

- clerk_user_id

ليصبح الربط النهائي:

- Clerk user.id = profiles.clerk_user_id

مع بقاء الأعمدة القديمة حتى لا نكسر الموجود.

---

## 8. التعديل الآمن القادم

ننشئ migration صغير وآمن باسم:

- supabase/migrations/20260707_vvip_tiger_auth_profile_bridge.sql

هدفه إضافة أعمدة ربط آمنة مثل:

- clerk_user_id
- email
- display_name
- avatar_url
- account_status
- trial_start_at
- trial_end_at
- updated_at

بدون حذف أي شيء.

---

## 9. القرار التنفيذي

لا نعدل الواجهة الآن.

الترتيب الصحيح:
1. حفظ هذا التقرير.
2. إنشاء migration الربط.
3. اختبار أن المشروع لم ينكسر.
4. بعدها نعدل تحميل البروفايل ليدعم Clerk.

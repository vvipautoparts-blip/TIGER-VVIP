# سجل جدول بروفايلات Clerk
## VVIP TIGER Clerk Profile Table Log

المرحلة: ربط Clerk مع Supabase بدون كسر جدول profiles القديم

---

## القرار

بعد فحص جدول public.profiles ظهر أنه مرتبط بـ Supabase Auth من خلال:

profiles.id = auth.users.id

لذلك تم اعتماد جدول مستقل وآمن لمستخدمي Clerk:

vvip_clerk_profiles

---

## سبب القرار

Clerk user id ليس نفس Supabase Auth user id.

لذلك استخدام جدول مستقل يمنع كسر الجداول القديمة ويحافظ على مسار واضح ونظيف للمرحلة الجديدة.

---

## ما تم تطبيقه يدويًا في Supabase

تم إنشاء جدول:

vvip_clerk_profiles

وتم إنشاء 3 سياسات RLS:

- Clerk users can read own vvip profile
- Clerk users can insert own vvip profile
- Clerk users can update own vvip profile

---

## قاعدة الأمان

كل سياسة تعتمد على:

clerk_user_id = auth.jwt()->>'sub'

وهذا يعني أن المستخدم يرى أو ينشئ أو يعدل البروفايل الخاص به فقط.

---

## الملف المرجعي في المشروع

supabase/migrations/20260707_vvip_tiger_clerk_profiles_table.sql

---

## ملاحظة أمنية نهائية

حسب قرار مالك المشروع، سيتم لاحقًا تنفيذ مراجعة أمان وسرية شاملة قبل اعتبار المرحلة جاهزة نهائيًا.

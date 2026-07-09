# VVIP TIGER — قفل قرار فحص Supabase / Clerk الأمني

التاريخ: 2026-07-09

## الهدف

هذا الملف يثبت قرار المرحلة الأولى من Supabase / Clerk Security Hardening Phase.
هذه المرحلة توثيق أمني فقط، ولا تحتوي أي تعديل على Runtime أو إنتاج.

## نقطة البداية

- البداية من main نظيف.
- التاج الذهبي محفوظ: frontend-safe-baseline-20260709.
- لا تعديل على Clerk في هذه الخطوة.
- لا تعديل على Supabase في هذه الخطوة.
- لا تطبيق SQL على الإنتاج في هذه الخطوة.

## نموذج الهوية الرسمي

Clerk هو نظام الدخول الرسمي.
الربط الرسمي يكون بين Clerk user id و public.profiles.clerk_user_id.

الاتجاه الصحيح في RLS يكون عبر:
auth.jwt() ->> 'sub'

وليس عبر auth.uid() للملفات القديمة الخاصة بمرحلة Supabase Auth.

## ملفات SQL القديمة المقفلة للمراجعة فقط

- RLS-POLICIES.sql
- RLS-EMAIL-VERIFICATION-POLICIES.sql
- supabase-schema.sql

هذه الملفات لا يتم تطبيقها مباشرة في Supabase SQL Editor أثناء مرحلة Clerk الحالية.

## السبب

هذه الملفات تحتوي أنماط قديمة مثل:
- auth.uid() = id
- auth.uid() = user_id
- admin_profile.id = auth.uid()

هذه الأنماط لا تمثل مصدر الحقيقة الحالي بعد اعتماد Clerk.

## الملفات الحديثة التي تحتاج مراجعة جراحية لاحقًا

- supabase/migrations/20260707_vvip_tiger_auth_profile_bridge.sql
- supabase/migrations/20260709_vvip_tiger_profiles_clerk_jwt_rls_bridge.sql
- supabase/migrations/20260709_vvip_tiger_atomic_profile_resolver_rpc.sql

## الدالة الحساسة للمراجعة القادمة

public.vvip_resolve_own_profile(p_email text default null)

## قواعد صارمة

- لا نكسر Clerk.
- لا نعرض أخطاء خام للمستخدم.
- لا نكشف أسرار Supabase أو Clerk في الواجهة.
- لا نطبق ملفات RLS القديمة مباشرة.
- لا نلمس الإنتاج بدون backup و branch و commit و push.
- لا نحذف الملفات القديمة الآن.

## الخطوة القادمة

مراجعة دالة vvip_resolve_own_profile مراجعة جراحية قبل أي تطبيق على Supabase.

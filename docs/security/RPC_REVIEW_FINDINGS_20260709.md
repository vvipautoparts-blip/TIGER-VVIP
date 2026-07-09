# VVIP TIGER — مراجعة دالة RPC الحساسة

## الملف الذي تمت مراجعته

`supabase/migrations/20260709_vvip_tiger_atomic_profile_resolver_rpc.sql`

## الدالة

`public.vvip_resolve_own_profile(p_email text default null)`

## التصنيف النهائي

`NEEDS_PATCH_BEFORE_APPLY`

## الحكم المختصر

الدالة تسير بالاتجاه الصحيح لأنها تعتمد على Clerk JWT `sub` وربطه مع `public.profiles.clerk_user_id`.

لكن لا يجوز تطبيق الملف على Supabase كما هو قبل patch أمني.

## النقاط الجيدة

- يستخدم Clerk JWT `sub` كمصدر الهوية الأساسي.
- لا يوجد anon execute.
- يوجد revoke من public و anon.
- يوجد grant execute فقط لـ authenticated.
- لا يوجد delete داخل الدالة.
- توجد رسائل safe_message آمنة للمستخدم.

## نقاط تحتاج patch

### 1. صلاحية update واسعة على جدول profiles

السطر الحالي يعطي authenticated صلاحية update عامة على `public.profiles`.

هذا قد يسمح للمستخدم بتعديل أعمدة حساسة داخل صفه إذا وصل مباشرة إلى API.

المطلوب:
- عدم منح update عام على الجدول.
- أو تقييد update لأعمدة آمنة فقط.
- أو تحويل تحديث البيانات الحساسة إلى RPC آمنة لاحقًا.

### 2. p_email لا يجب أن يكون مصدر ملكية

البريد القادم من الواجهة لا يجب أن يستخدم لاسترجاع profile قديم.

المطلوب:
- استرجاع profile قديم بالبريد فقط إذا كان البريد موجودًا داخل JWT.
- اعتبار `p_email` معلومة مساعدة فقط وليست مصدر صلاحية.

### 3. عدم إرجاع profile كامل

إرجاع `to_jsonb(v_profile)` قد يكشف أعمدة حساسة مستقبلًا.

المطلوب:
- إرجاع JSON آمن ومحدد الأعمدة فقط.

## القرار

لا يتم تطبيق هذا الملف على Supabase production كما هو.

الخطوة القادمة:
إنشاء migration محسّن جديد أو patch آمن للملف الحالي، بدون تطبيق مباشر على الإنتاج، وبعد backup ومراجعة.

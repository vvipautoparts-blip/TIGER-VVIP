# إعداد المدير العام — ملاحظة معمارية حالية

> **الحالة: الدليل القديم الخاص بإنشاء مستخدم Email/Password أصبح غير تنفيذي.**
>
> المرجع الملزم الآن هو [Federated Identity Sovereignty ADR](docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md).

## القاعدة الحالية

لا يتم إنشاء كلمة مرور VVIP TIGER للمدير ولا لأي مستخدم داخل Supabase أو Firebase. هوية المدير تُثبت أولًا من مزود الهوية الخارجي المعتمد، ثم تمنح VVIP TIGER لذلك الـexternal subject صلاحيات الإدارة داخل طبقة authorization الخاصة بالمنصة.

## ما يبقى مسؤولية VVIP TIGER

- ربط الحساب الداخلي بالـexternal subject الموثق؛
- الدور والصلاحيات/capabilities؛
- حالة الحساب والتعليق أو الإلغاء؛
- سياسات RLS والوصول إلى البيانات؛
- Owner approvals للعمليات الحساسة؛
- Audit evidence.

## ما لا يتم تنفيذه

لا تستخدم هذا الملف لإنشاء:

- مستخدم Supabase Email/Password؛
- كلمة مرور مدير محلية؛
- Password reset محلي؛
- Firebase authentication موازٍ؛
- ربط حساب إداري بالبريد فقط.

مسارات المصادقة القديمة القابلة للتنفيذ أزيلت من الشجرة الحالية، كما هو موثق في [Legacy Password Runtime Removal](docs/security/LEGACY_PASSWORD_RUNTIME_REMOVAL_20260808.md).

## إعداد الإدارة قبل Production

إعداد المدير الفعلي يجب أن يمر بإجراء محكوم يثبت:

1. هوية خارجية production-approved؛
2. external issuer + subject ثابتين؛
3. تعيين الدور/الصلاحيات من مسار إدارة موثوق؛
4. RLS/authorization evidence؛
5. تسجيل التدقيق والموافقة المطلوبة؛
6. عدم وجود credential أو recovery bypass محلي.

هذا الملف لا يطبق أي تغيير على Production أو على لوحة مزود الهوية.

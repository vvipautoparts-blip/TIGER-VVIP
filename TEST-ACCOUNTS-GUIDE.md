# دليل إعداد الحسابات التجريبية الهرمية

هذا الدليل يضبط حسابات اختبار جاهزة للسيناريو الإداري الكامل.

## الحسابات المطلوبة في Auth
أنشئ المستخدمين التاليين من Supabase Authentication > Users:
- manager@test.com
- supervisor@test.com
- representative@test.com
- dealer@test.com
- buyer@test.com

ملاحظة: كلمة المرور تحددها من Dashboard مباشرة.

## التنفيذ
1. نفّذ أولاً:
- supabase-schema.sql

2. نفّذ حساب المدير العام:
- ADMIN-SETUP.sql

3. نفّذ الحسابات الهرمية:
- TEST-ACCOUNTS-SETUP.sql

## الهيكل بعد التنفيذ
- super_admin: vvipautoparts@gmail.com
- manager: manager@test.com (superior = super_admin)
- supervisor: supervisor@test.com (superior = manager)
- representative: representative@test.com (superior = supervisor)
- dealer: dealer@test.com (superior = representative)
- buyer: buyer@test.com (superior = representative)

## اختبارات سريعة
1. سجل دخول manager:
- يفترض يشوف فريقه فقط.

2. سجل دخول supervisor:
- يفترض يشوف فريقه فقط.

3. سجل دخول representative:
- يفترض يشوف عملياته/عمولاته فقط.

4. سجل دخول super_admin:
- يفترض يشوف الملخصات العامة والاعتمادات وصرف الرواتب.

## ملاحظة
إذا كانت نتيجة التحقق ناقصة (بعض الحسابات غير موجودة)، ارجع أنشئ المستخدمين الناقصين في Auth ثم أعد تشغيل TEST-ACCOUNTS-SETUP.sql.

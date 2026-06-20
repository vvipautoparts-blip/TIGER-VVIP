# دليل اختبار الرواتب الأسبوعية (Demo)

هذا الدليل يجعل اختبار العمولات والرواتب يتم فوراً بدون إدخال طلبات يدوياً.

## الترتيب الصحيح قبل الديمو
1. نفّذ: supabase-schema.sql
2. نفّذ: ADMIN-SETUP.sql
3. نفّذ: TEST-ACCOUNTS-SETUP.sql
4. نفّذ: DEMO-PAYROLL-SEED.sql

## ماذا يضيف ملف DEMO-PAYROLL-SEED.sql
1. ينشئ عمليات مكتملة للمندوب representative@test.com خلال آخر 30 يوم.
2. ينشئ عمولات earned بقيمة 0.75 لكل عملية مكتملة.
3. ينشئ صرف راتب أسبوعي قديم (historical) لاختبار التقارير.
4. يحدّث جزء من العمولات إلى paid لإظهار الفرق بين earned و paid.

## اختبار الواجهة بعد التنفيذ
1. سجل دخول representative@test.com
- تحقق من لوحة المندوب:
  - مجموع العمولات
  - عدد العمليات المكتملة
  - آخر راتب مصروف

2. سجل دخول vvipautoparts@gmail.com (super_admin)
- افتح لوحة المدير العام.
- تحقق من:
  - إجمالي العمولات
  - العمليات المكتملة
  - الرواتب المصروفة
  - العناصر المستحقة هذا الأسبوع

3. اضغط زر صرف أسبوعي للمندوب من لوحة المدير.
- يجب إنشاء سجل جديد في salary_payments.
- يجب تحويل عمولات earned الخاصة بالأسبوع إلى paid.

## استعلامات تحقق مباشرة (اختياري)
في SQL Editor:

```sql
SELECT status, count(*)
FROM public.commissions
GROUP BY status
ORDER BY status;
```

```sql
SELECT p.email, sp.total_amount, sp.period_start, sp.period_end, sp.payment_date
FROM public.salary_payments sp
JOIN public.profiles p ON p.id = sp.user_id
ORDER BY sp.payment_date DESC;
```

## إعادة تكرار الديمو بأمان
- يمكن تشغيل DEMO-PAYROLL-SEED.sql أكثر من مرة.
- عمولات order_id فيها حماية ON CONFLICT DO NOTHING.
- لكن orders نفسها ستزيد في كل تشغيل (مقصود لزيادة بيانات الاختبار).

## تنظيف بيانات الديمو (اختياري)
إذا أردت إعادة البيئة لنقطة شبه نظيفة قبل إعادة الاختبار، نفّذ:
- DEMO-PAYROLL-RESET.sql

هذا الملف:
1. يحذف طلبات الديمو المعلّمة بالملاحظة Seeded payroll demo order.
2. يحذف العمولات الناتجة عنها.
3. يحذف سجل الراتب التاريخي الديمو المعلّم Seeded historical weekly payroll.

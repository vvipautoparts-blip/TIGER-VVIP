-- TIGER VVIP - Demo payroll and commissions seed
-- هدف الملف:
-- 1) إنشاء عمليات مكتملة جاهزة للمندوب
-- 2) إنشاء سجلات عمولات earned
-- 3) إنشاء عملية صرف راتب أسبوعي قديمة كمثال
--
-- المتطلبات:
-- - تنفيذ supabase-schema.sql
-- - تنفيذ ADMIN-SETUP.sql
-- - تنفيذ TEST-ACCOUNTS-SETUP.sql
-- - وجود profile للمستخدم representative@test.com

-- 0) تحقق من وجود المندوب
SELECT id, email, role
FROM public.profiles
WHERE email = 'representative@test.com'
  AND role = 'representative';

-- 1) إنشاء 8 عمليات مكتملة خلال آخر 30 يوم
WITH rep AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'representative@test.com'
  LIMIT 1
),
seed_orders AS (
  SELECT
    rep.id AS user_id,
    ('عميل تجريبي ' || gs)::text AS customer_name,
    'شركة تجريبية'::text AS company,
    ('demo' || gs || '@customer.test')::text AS email,
    ('+9627800099' || lpad(gs::text, 2, '0'))::text AS phone,
    CASE (gs % 4)
      WHEN 0 THEN 'فلتر هواء أصلي'
      WHEN 1 THEN 'كشاف LED أمامي'
      WHEN 2 THEN 'طقم فرامل رياضي'
      ELSE 'بطارية AGM'
    END::text AS product,
    ((gs % 3) + 1)::int AS quantity,
    'Amman'::text AS location,
    CASE (gs % 3)
      WHEN 0 THEN 'High'
      WHEN 1 THEN 'Medium'
      ELSE 'Low'
    END::text AS priority,
    'Seeded payroll demo order'::text AS notes,
    'Completed'::text AS status,
    (now() - ((gs + 2) * interval '2 day')) AS created_at,
    (now() - ((gs + 1) * interval '2 day')) AS completed_at,
    0.75::numeric(10,2) AS commission_amount,
    rep.id AS completed_by
  FROM rep
  CROSS JOIN generate_series(1, 8) AS gs
)
INSERT INTO public.orders (
  user_id,
  customer_name,
  company,
  email,
  phone,
  product,
  quantity,
  location,
  priority,
  notes,
  status,
  created_at,
  completed_at,
  commission_amount,
  completed_by
)
SELECT * FROM seed_orders;

-- 2) إنشاء عمولات earned لكل العمليات المكتملة غير المفهرسة سابقاً
INSERT INTO public.commissions (
  user_id,
  order_id,
  amount,
  status,
  cycle_type,
  period_start,
  period_end,
  earned_at,
  notes
)
SELECT
  o.user_id,
  o.id,
  coalesce(o.commission_amount, 0.75)::numeric(10,2),
  'earned'::text,
  'weekly'::text,
  ((date_trunc('week', o.completed_at)::date) + 1)::date,
  ((date_trunc('week', o.completed_at)::date) + 7)::date,
  coalesce(o.completed_at, now()),
  'Seeded commission from demo order'::text
FROM public.orders o
JOIN public.profiles p ON p.id = o.user_id
WHERE p.email = 'representative@test.com'
  AND lower(o.status) = 'completed'
ON CONFLICT (order_id) DO NOTHING;

-- 3) (اختياري) إنشاء صرف راتب أسبوعي قديم بقيمة عملية حسابية حقيقية
WITH rep AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'representative@test.com'
  LIMIT 1
),
admin_user AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'vvipautoparts@gmail.com'
  LIMIT 1
),
old_week_commissions AS (
  SELECT
    c.user_id,
    sum(c.amount)::numeric(10,2) AS total_amount
  FROM public.commissions c
  JOIN rep ON rep.id = c.user_id
  WHERE c.earned_at >= now() - interval '21 day'
    AND c.earned_at < now() - interval '14 day'
  GROUP BY c.user_id
)
INSERT INTO public.salary_payments (
  user_id,
  total_amount,
  period_start,
  period_end,
  payment_date,
  created_by,
  notes
)
SELECT
  owc.user_id,
  owc.total_amount,
  (current_date - 21)::date,
  (current_date - 14)::date,
  (now() - interval '13 day'),
  (SELECT id FROM admin_user),
  'Seeded historical weekly payroll'
FROM old_week_commissions owc
WHERE owc.total_amount > 0;

-- 4) تعليم عمولات نفس الفترة القديمة كمدفوعة
UPDATE public.commissions c
SET status = 'paid',
    paid_at = now() - interval '13 day'
WHERE c.user_id = (
  SELECT id FROM public.profiles WHERE email = 'representative@test.com' LIMIT 1
)
  AND c.earned_at >= now() - interval '21 day'
  AND c.earned_at < now() - interval '14 day'
  AND c.status = 'earned';

-- 5) ملخص تحقق نهائي
SELECT
  p.email,
  count(*) FILTER (WHERE lower(o.status) = 'completed') AS completed_orders,
  coalesce(sum(c.amount) FILTER (WHERE c.status = 'earned'), 0)::numeric(10,2) AS earned_amount,
  coalesce(sum(c.amount) FILTER (WHERE c.status = 'paid'), 0)::numeric(10,2) AS paid_amount
FROM public.profiles p
LEFT JOIN public.orders o ON o.user_id = p.id
LEFT JOIN public.commissions c ON c.user_id = p.id
WHERE p.email = 'representative@test.com'
GROUP BY p.email;

SELECT
  p.email,
  sp.total_amount,
  sp.period_start,
  sp.period_end,
  sp.payment_date
FROM public.salary_payments sp
JOIN public.profiles p ON p.id = sp.user_id
WHERE p.email = 'representative@test.com'
ORDER BY sp.payment_date DESC;

-- TIGER VVIP - Demo payroll reset
-- يحذف بيانات الديمو المرتبطة بالمندوب representative@test.com
-- لا يحذف حسابات Auth أو profiles.

WITH rep AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'representative@test.com'
  LIMIT 1
),
rep_orders AS (
  SELECT o.id
  FROM public.orders o
  JOIN rep ON rep.id = o.user_id
  WHERE o.notes = 'Seeded payroll demo order'
)
-- 1) احذف عمولات مرتبطة بطلبات الديمو
DELETE FROM public.commissions c
USING rep_orders ro
WHERE c.order_id = ro.id;

-- 2) احذف طلبات الديمو
DELETE FROM public.orders o
USING rep_orders ro
WHERE o.id = ro.id;

-- 3) احذف سجلات الرواتب الديمو فقط
DELETE FROM public.salary_payments sp
WHERE sp.notes = 'Seeded historical weekly payroll'
  AND sp.user_id = (
    SELECT id FROM public.profiles WHERE email = 'representative@test.com' LIMIT 1
  );

-- 4) إعادة عرض الملخص
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

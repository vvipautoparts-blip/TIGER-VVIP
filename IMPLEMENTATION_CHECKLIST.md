# VVIP TIGER IMPLEMENTATION CHECKLIST

## Official Planning References / مراجع التخطيط الرسمية

- This checklist is a phased execution plan, not the product constitution.
- Tasks must be executed in alignment with the official blueprint and the Memory Map.
- Payments, contracts, sensitive permissions, and security work must not proceed without staged review.

References:
- [Official Product Blueprint](docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md)
- [Memory Map](docs/VVIP_TIGER_MEMORY_MAP.md)
- [Profile Source of Truth Decision](docs/VVIP_TIGER_PROFILE_SOURCE_OF_TRUTH.md)

## VVIP TIGER — بدء التنفيذ النهائي بعد اعتماد الخطة الكاملة

Session: استفسارات 1/6 — 7/7/2026
Mode: Final execution, not brainstorming
Reference: docs/VVIP_TIGER_MEMORY_MAP.md
Current Stack: Clerk + Supabase + GitHub
Direction: Mobile First, AWS-ready, premium global execution

---

## 0. قواعد التنفيذ

- [x] اعتماد نهاية مرحلة الإضافات.
- [x] اعتماد بداية التنفيذ الفعلي.
- [x] عدم فتح أفكار جديدة أثناء التنفيذ.
- [x] عدم إعادة نقاش القرارات المعتمدة إلا بطلب صريح من مالك المشروع.
- [x] اعتماد docs/VVIP_TIGER_MEMORY_MAP.md كمرجع رسمي.
- [ ] تنفيذ كل خطوة بعد فحص Git.
- [ ] عدم حذف أي ملف مهم بدون سبب واضح ونسخة آمنة.
- [ ] عدم وضع أي مفاتيح سرية داخل ملفات الواجهة أو GitHub.

---

## 1. حالة المشروع عند بداية التنفيذ

- [x] المسار الحالي: جذر المستودع (`git rev-parse --show-toplevel`)
- [x] الفرع الحالي: main
- [x] المشروع متزامن مع origin/main
- [x] working tree كان clean قبل إنشاء ملفات التوثيق
- [x] تم فحص ls و tree -L 2
- [x] تم إنشاء docs/VVIP_TIGER_MEMORY_MAP.md
- [ ] تم إنشاء IMPLEMENTATION_CHECKLIST.md
- [ ] تم عمل commit للتوثيق الرسمي

---

## 2. التوثيق الرسمي

الهدف: تثبيت عقل المشروع ومنع النسيان والتشتت.

- [x] إنشاء مجلد docs
- [x] إنشاء VVIP_TIGER_MEMORY_MAP.md
- [ ] مراجعة Memory Map
- [ ] إنشاء IMPLEMENTATION_CHECKLIST.md
- [ ] مراجعة Checklist
- [ ] حفظ الملفات في Git commit

Commit المقترح:
docs: add official VVIP TIGER execution plan

---

## 3. تدقيق ملفات المشروع الحالية

الهدف: معرفة الملفات الرسمية، ملفات الاختبار، والملفات القديمة.

- [ ] مراجعة index.html
- [ ] مراجعة private-profile.html
- [ ] مراجعة public-profile.html
- [ ] مراجعة clerk-test.html
- [ ] مراجعة clerk-private-profile.html
- [ ] مراجعة auth.js
- [ ] مراجعة auth-supabase.js
- [ ] مراجعة auth-clerk-index.js
- [ ] مراجعة scripts/supabase-config.js
- [ ] مراجعة scripts/supabase-auth-bridge.js
- [ ] مراجعة scripts/require-auth.js
- [ ] مراجعة scripts/profile-loader.js
- [ ] مراجعة social-ui.js
- [ ] مراجعة styles.css
- [ ] مراجعة enhanced-components.css
- [ ] مراجعة supabase-schema.sql
- [ ] مراجعة supabase/migrations
- [ ] مراجعة approved

مخرجات هذه المرحلة:
- [ ] تحديد صفحة الدخول الرسمية
- [ ] تحديد صفحة البروفايل الخاص الرسمية
- [ ] تحديد صفحة البروفايل العام الرسمية
- [ ] تحديد ملفات الاختبار التي تبقى مؤقتًا
- [ ] تحديد أي تداخل بين Clerk و Supabase و Firebase

---

## 4. المصادقة Auth

القرار المعتمد: Clerk هو نظام الدخول الرسمي.

- [ ] تثبيت Clerk كمسار الدخول الرسمي
- [ ] عدم بناء تسجيل يدوي جديد
- [ ] عدم إعادة Firebase Auth
- [ ] ربط Clerk مع Supabase profile
- [ ] تحديد ملف Clerk الرسمي
- [ ] حماية الصفحات الخاصة
- [ ] منع فتح private profile بدون تسجيل دخول
- [ ] إنشاء أو قراءة profile في Supabase بعد دخول المستخدم
- [ ] توثيق Clerk to Supabase flow

---

## 5. قاعدة البيانات Supabase

الجداول الأساسية المطلوبة:

- [ ] profiles
- [ ] sectors
- [ ] user_sector_access
- [ ] posts
- [ ] post_images
- [ ] contact_requests
- [ ] support_tickets
- [ ] ticket_messages
- [ ] admin_notes
- [ ] roles
- [ ] user_roles
- [ ] admin_activity_logs
- [ ] subscriptions
- [ ] account_status_history
- [ ] reports_snapshots

قواعد مهمة:
- [ ] كل مستخدم له Clerk ID
- [ ] كل مستخدم له Supabase profile
- [ ] كل منشور مربوط بقطاع
- [ ] السعر إجباري وأكبر من صفر
- [ ] الحد الأقصى 7 صور لكل منشور
- [ ] الحد الأقصى 4 منشورات أسبوعيًا لكل حساب
- [ ] حذف تلقائي بعد 120 يومًا
- [ ] لا فيديو
- [ ] الصور فقط

---

## 6. القطاعات المعتمدة

- [ ] Auto parts and car services
- [ ] Materials and supplies
- [ ] Real estate

مهام التنفيذ:
- [ ] إنشاء جدول sectors
- [ ] إدخال القطاعات الثلاثة
- [ ] ربط المنشورات بالقطاع
- [ ] ربط الإدارة بالقطاع
- [ ] دعم البحث حسب القطاع
- [ ] دعم التقارير حسب القطاع

---

## 7. نظام المنشورات

القواعد المعتمدة:
- [ ] 4 منشورات أسبوعيًا
- [ ] 7 صور كحد أقصى
- [ ] السعر مطلوب
- [ ] السعر أكبر من صفر
- [ ] لا فيديو
- [ ] حذف تلقائي بعد 120 يومًا

مهام التنفيذ:
- [ ] تصميم جدول posts
- [ ] تصميم جدول post_images
- [ ] إضافة حالات المنشور: draft, pending, active, rejected, expired, deleted
- [ ] إضافة expires_at
- [ ] إضافة created_by
- [ ] إضافة sector_id
- [ ] إضافة price
- [ ] إضافة currency
- [ ] إضافة حقول مراجعة الإدارة

---

## 8. نظام الصور

- [ ] تحديد bucket في Supabase Storage
- [ ] اعتماد مسار صور منظم
- [ ] منع رفع الفيديو
- [ ] تحديد أنواع الصور المقبولة
- [ ] تحديد حجم أقصى
- [ ] تجهيز قص وضغط الصور من الواجهة
- [ ] حفظ الصورة النهائية فقط بعد القص
- [ ] ربط الصور بجدول post_images

---

## 9. Tiger Care Contact Request

القرار المعتمد:
طلب تواصل رسمي مع إدارة VVIP TIGER بدل إظهار أرقام الإدارة.

- [ ] تصميم contact_requests
- [ ] تصميم support_tickets
- [ ] تصميم ticket_messages
- [ ] تصميم admin_notes
- [ ] إضافة حالات: new, in_review, waiting_user, escalated, resolved, closed
- [ ] إضافة الأولوية: low, normal, high, urgent
- [ ] ربط الطلب بالقطاع
- [ ] ربط الطلب بالمستخدم
- [ ] ربط الطلب بالفريق المسؤول
- [ ] إضافة SLA tracking
- [ ] إضافة رسالة داخل التطبيق
- [ ] إضافة رسالة البريد: تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.
- [ ] تجهيز Dashboard لاحق للإدارة

---

## 10. الأدوار والصلاحيات

الأدوار الأولية:
- [ ] Owner / Super Admin
- [ ] Platform Admin
- [ ] Sector Manager
- [ ] Support / Tiger Care Team
- [ ] Moderator
- [ ] Regular User

مهام التنفيذ:
- [ ] تصميم roles
- [ ] تصميم user_roles
- [ ] ربط الدور بالمستخدم
- [ ] ربط بعض الأدوار بالقطاع
- [ ] فصل صلاحيات الإدارة عن المستخدمين
- [ ] تسجيل كل تغيير إداري في logs

---

## 11. Admin Activity Logs

- [ ] تصميم admin_activity_logs
- [ ] تسجيل تغيير حالة الحساب
- [ ] تسجيل قبول أو رفض منشور
- [ ] تسجيل قبول أو رفض بروفايل
- [ ] تسجيل ملاحظات الإدارة
- [ ] تسجيل التصعيد
- [ ] تسجيل تغيير حالة التذكرة
- [ ] تسجيل العمليات الحساسة

---

## 12. الاشتراك والفترة المجانية

القرارات:
- [ ] فترة مجانية 4 أشهر
- [ ] الاشتراك لاحقًا
- [ ] لا تنفيذ دفع الآن إلا بقرار جديد
- [ ] تجهيز البنية فقط

المهام:
- [ ] إضافة trial_start_at
- [ ] إضافة trial_end_at
- [ ] إضافة subscription_status
- [ ] تصميم subscriptions
- [ ] عدم تعطيل المشروع الحالي بسبب الدفع

---

## 13. Mobile First UI

- [ ] مراجعة index.html على الموبايل
- [ ] مراجعة private-profile.html على الموبايل
- [ ] مراجعة public-profile.html على الموبايل
- [ ] تقليل الزحمة
- [ ] تحسين أول شاشة
- [ ] تحسين الأزرار
- [ ] تحسين شكل الصور
- [ ] تحسين المسافات
- [ ] تحسين الخطوط
- [ ] إزالة أي شكل تجريبي أو غير احترافي

---

## 14. لوحة الإدارة الأولية

أقسام مستقبلية مطلوبة:
- [ ] Users
- [ ] Profiles
- [ ] Posts
- [ ] Sectors
- [ ] Tiger Care Requests
- [ ] Support Tickets
- [ ] Reports
- [ ] Admin Logs
- [ ] Settings

---

## 15. الاختبار QA

- [ ] فتح الصفحة الرئيسية
- [ ] تسجيل دخول Clerk
- [ ] حماية private profile
- [ ] إنشاء profile في Supabase
- [ ] قراءة profile
- [ ] عرض public profile
- [ ] إنشاء منشور تجريبي
- [ ] منع السعر الفارغ
- [ ] منع السعر صفر
- [ ] منع أكثر من 7 صور
- [ ] منع الفيديو
- [ ] منع أكثر من 4 منشورات أسبوعيًا
- [ ] إرسال Tiger Care request
- [ ] فحص Git status بعد كل مرحلة

---

## 16. ترتيب التنفيذ القادم

1. مراجعة Memory Map
2. مراجعة Implementation Checklist
3. عمل commit للتوثيق
4. فتح supabase-schema.sql
5. مقارنة الجداول الحالية مع الجداول المطلوبة
6. إنشاء خطة schema نظيفة
7. إنشاء migration رسمي
8. ربط Clerk user مع Supabase profile
9. اختبار الدخول والبروفايل
10. الانتقال لنظام القطاعات والمنشورات

---

## 17. أوامر Git لهذه المرحلة

فحص الحالة:
git status

عرض الملفات المعدلة:
git diff --name-only

إضافة الملفات:
git add docs/VVIP_TIGER_MEMORY_MAP.md IMPLEMENTATION_CHECKLIST.md

Commit:
git commit -m "docs: add official VVIP TIGER execution plan"

---

## 18. ملاحظة تنفيذية

هذا الملف ليس قائمة أفكار.
هذا الملف هو خريطة التنفيذ الرسمية بعد اعتماد الخطة الكاملة.

أي تعديل مستقبلي يجب أن يكون بسبب تنفيذ أو قرار واضح من مالك المشروع.

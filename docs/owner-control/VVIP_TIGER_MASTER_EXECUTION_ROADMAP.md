# VVIP TIGER — Master Execution Roadmap

هذه النسخة المقروءة للمالك. المرجع المنظم الرسمي هو [VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml](./VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml).

مرجع هندسة المنصة الموحدة والنموذج التشغيلي والإداري مرتبط رسميًا عبر:

- [VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.yaml](./VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.yaml)
- [VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.md](./VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.md)

## الحالة العامة

- المشروع: VVIP TIGER
- الإصدار: 1.0.0
- التاريخ: 2026-07-10
- المرجعية: Owner Master Execution Roadmap
- اللغة: Arabic First
- السوق: Jordan First

## قواعد التنفيذ

- مرحلة واحدة في كل مرة.
- لا تعديل مباشر على `main`.
- لا SQL تلقائي على الإنتاج.
- لا Clerk أو Supabase أو Payments أو Production أو Migrations أو RLS أو Storage Policies خارج النطاق المعتمد.
- لا نجاح وهمي لأي اختبار أو دمج.
- لا تبدأ المرحلة التالية قبل إغلاق الحالية.

## الحالة الحالية

المرحلة الحالية الرسمية المغلقة هي:

- `P00` — إغلاق Discovery Experience Shell — PR #22

الحالة الفعلية بعد الدمج والتحقق:

- PR #22 = MERGED
- `main` = `origin/main`
- working tree clean
- وثيقة الإكمال موجودة
- الأنظمة الحساسة لم تُلمس

## المرحلة المسموح بها الآن

- `P01` — التدقيق الشامل للمستودع وإنشاء Gap Matrix

## خارطة المراحل

### P00

- الاسم: إغلاق Discovery Experience Shell — PR #22
- الحالة: `completed`
- النتيجة: merged / post_merge_verified
- الخلاصة: تم إغلاق مرحلة Discovery Experience Shell بالكامل وتم توثيق الإغلاق في `VVIP_TIGER_PR22_DISCOVERY_SHELL_COMPLETION.md`.

### P01

- الاسم: التدقيق الشامل للمستودع وإنشاء Gap Matrix
- الحالة: `pending`
- النطاق:
  - فحص جميع صفحات HTML وCSS وJavaScript.
  - فحص جميع فروع وPRs ومراحل المالك.
  - مطابقة المنجز مع Owner Master Reference.
  - تحديد المكتمل والجزئي وغير المنفذ والمكرر.
  - اكتشاف الروابط والأزرار والصفحات الميتة.
  - اكتشاف بقايا Firebase أو Auth قديم.
  - اكتشاف ملفات Prototype أو Backup التي قد تعمل بالخطأ.
  - إنشاء `VVIP_TIGER_IMPLEMENTATION_GAP_MATRIX.md`.

### P02

- الاسم: تثبيت App Shell وهندسة الصفحات والتنقل
- الحالة: `pending`
- النطاق:
  - فصل صفحة الدخول عن واجهة المنصة الداخلية.
  - تحديد Public Routes وPrivate Routes.
  - توحيد Header وMobile Navigation.
  - منع الأزرار والروابط الميتة.
  - صفحات 404 و403 وحالات الخطأ.

### P03

- الاسم: إكمال Clerk ↔ Supabase Profile Identity Bridge
- الحالة: `pending`
- النطاق:
  - اعتماد Clerk كطبقة الهوية الوحيدة.
  - استخدام `clerk_user_id` في تحميل الملف.
  - تثبيت Atomic Profile Resolver.
  - حالات الحساب active / pending / suspended / closed.

### P04

- الاسم: Onboarding وأنواع الحسابات
- الحالة: `pending`
- النطاق:
  - Buyer Viewer.
  - Buyer Standard.
  - Individual Seller.
  - Parts Shop.
  - Maintenance Center.
  - Electrical/Hybrid Center.
  - General Service Center.
  - Dealer/Distributor.
  - Company/Institution.
  - Service Provider.
  - Personal VIP.

### P05

- الاسم: الملف العام والملف الخاص وإدارة الحساب
- الحالة: `pending`
- النطاق:
  - Public Profile.
  - Private Profile.
  - Edit Profile.
  - Unique Username.
  - Account Settings.
  - Temporary Deactivation.
  - Multi-step Account Deletion.
  - Logout للجلسة فقط.

### P06

- الاسم: Owner Control Center — النسخة المرجعية الآمنة
- الحالة: `pending`
- النطاق:
  - صفحة خاصة بالمالك فقط.
  - عرض Phase Tracker.
  - عرض `phase-status.json`.
  - عرض آخر PR وCommit لكل مرحلة.
  - Read-only في النسخة الأولى.

### P07

- الاسم: تصميم مخطط البيانات الكامل — Review Only
- الحالة: `pending`
- النطاق:
  - Profiles.
  - Account Types.
  - Sectors.
  - Listings.
  - Listing Media.
  - Subscriptions and Trials.
  - One-to-One Messages.
  - Reports and Moderation.
  - Tiger Care Tickets.
  - Audit Logs.

### P08

- الاسم: تطبيق Migrations وRLS وStorage Policies الآمنة
- الحالة: `pending`
- النطاق:
  - تطبيق migrations على بيئة آمنة أولًا.
  - RLS لكل جدول.
  - Storage buckets للصور.
  - سياسات الرفع والقراءة والحذف.
  - Rollback verification.

### P09

- الاسم: محرك إنشاء وتعديل وحذف الإعلانات
- الحالة: `pending`
- النطاق:
  - 4 إعلانات أسبوعيًا لكل حساب.
  - صورة واسم وسعر حقول إلزامية.
  - السعر أكبر من صفر.
  - 80% حقول منظمة و20% وصف قصير.
  - Draft / Pending Review / Published / Rejected / Suspended / Sold.
  - حذف الإعلان والصور بعد 120 يومًا.

### P10

- الاسم: حقول القطاعات الثلاثة والتصنيفات
- الحالة: `pending`
- النطاق:
  - قطع السيارات والخدمات والمستلزمات فقط.
  - لا بيع سيارات كاملة.
  - المواد والتموين والمستلزمات.
  - العقارات.

### P11

- الاسم: Media Pipeline للصور
- الحالة: `pending`
- النطاق:
  - حد أقصى 7 صور لكل إعلان.
  - Crop / Zoom / Position / Compression.
  - Fixed aspect ratios.
  - حذف الصور عند حذف الإعلان أو انتهاء 120 يومًا.

### P12

- الاسم: Supabase Discovery Backend Adapter
- الحالة: `pending`
- النطاق:
  - ربط Discovery Shell بالبيانات الحقيقية.
  - Server-side pagination.
  - فلاتر القطاعات.
  - المدينة والمنطقة والسعر والترتيب.
  - Search normalization للعربية.

### P13

- الاسم: Feed وبطاقات الإعلان وصفحة التفاصيل
- الحالة: `pending`
- النطاق:
  - Feed موحد.
  - بطاقة: صورة واسم وسعر فقط بصورة أساسية.
  - صفحة تفاصيل كاملة.
  - Favorites وView History.

### P14

- الاسم: المحادثات والتفاعلات الخاصة واحد إلى واحد
- الحالة: `pending`
- النطاق:
  - One-to-One Chat فقط.
  - لا مجموعات.
  - Rate limits.
  - Evidence logs.

### P15

- الاسم: المشاركة الخاصة والدعوات
- الحالة: `pending`
- النطاق:
  - مشاركة الإعلان لمستخدم واحد فقط.
  - حتى 20 دعوة في الجلسة.
  - لا مشاركة جماعية.

### P16

- الاسم: صلاحيات النشر متعددة القطاعات
- الحالة: `pending`
- النطاق:
  - حساب موحد للتصفح والبحث والتواصل.
  - صلاحية نشر حسب القطاع.
  - طلب إضافة قطاع.
  - موافقة مدير القطاع.

### P17

- الاسم: التجربة المجانية والاشتراكات والحدود
- الحالة: `pending`
- النطاق:
  - تجربة مجانية 4 أشهر.
  - Packages حسب القطاع.
  - Entitlements.
  - حدود النشر.
  - Grace periods.

### P18

- الاسم: بوابة الدفع والإيصالات
- الحالة: `pending`
- النطاق:
  - اختيار مزود دفع مناسب للأردن.
  - Hosted payment flow.
  - Webhooks موثوقة.
  - عدم تخزين بيانات البطاقة.

### P19

- الاسم: مركز الإشعارات
- الحالة: `pending`
- النطاق:
  - In-app notifications.
  - رسائل جديدة.
  - حالة الإعلان.
  - حالة الاشتراك.
  - Tiger Care updates.

### P20

- الاسم: Tiger Care ونظام طلب التواصل الرسمي
- الحالة: `pending`
- النطاق:
  - Help Center.
  - Support Tickets.
  - Reports and Complaints.
  - Missing Category Requests.
  - Rejection Appeals.

### P21

- الاسم: Moderation وTrust & Safety
- الحالة: `pending`
- النطاق:
  - إساءة وشتائم.
  - احتيال ونصب.
  - انتحال شخصية.
  - Duplicate detection.
  - Pre-publish filtering.
  - Trust Score.

### P22

- الاسم: لوحات الإدارة والقطاعات والتقارير
- الحالة: `pending`
- النطاق:
  - Platform Owner Dashboard.
  - Sector Manager Dashboard.
  - Content Review Queue.
  - Permissions Queue.
  - Tiger Care Dashboard.

### P23

- الاسم: سياسة عدم النشاط والاحتفاظ والحذف
- الحالة: `pending`
- النطاق:
  - 30 يومًا عدم نشاط: تقرير وتواصل.
  - 15 يومًا إضافية دون رد: تعطيل مؤقت.
  - استمرار عدم الرد: إلغاء أو حذف وفق السياسة.

### P24

- الاسم: AI Assistance عبر Backend آمن
- الحالة: `pending`
- النطاق:
  - اقتراح اسم القطعة.
  - تنظيم الوصف.
  - اقتراح كلمات البحث.
  - كشف الاحتيال والإساءة.
  - Backend or Edge Functions.

### P25

- الاسم: Analytics وAd Storage Backend
- الحالة: `pending`
- النطاق:
  - مشاهدات الإعلانات.
  - عمليات البحث.
  - النقر على التواصل.
  - Privacy-safe analytics.

### P26

- الاسم: PWA وMobile App Readiness
- الحالة: `pending`
- النطاق:
  - Web App Manifest.
  - Service Worker.
  - Offline safe states.
  - Installability.
  - Touch navigation.

### P27

- الاسم: Accessibility وRTL واللغات وتجربة المستخدم
- الحالة: `pending`
- النطاق:
  - Arabic RTL.
  - English readiness.
  - Keyboard navigation.
  - Screen reader labels.
  - Reduced motion.

### P28

- الاسم: Performance وScalability Hardening
- الحالة: `pending`
- النطاق:
  - Database indexes.
  - Query plans.
  - Pagination everywhere.
  - Load tests تدريجية.
  - خطة توسع نحو ملايين المستخدمين.

### P29

- الاسم: Clerk / Supabase Security Hardening Final Rewrite
- الحالة: `pending`
- النطاق:
  - إعادة مراجعة Clerk configuration.
  - إعادة مراجعة Supabase RLS.
  - Storage policies.
  - CSP.
  - Security headers.
  - Penetration testing.

### P30

- الاسم: Legal وPrivacy وPlatform Policies
- الحالة: `pending`
- النطاق:
  - Terms of Use.
  - Privacy Policy.
  - Marketplace Disclaimer.
  - Prohibited Content.
  - Refund Policy.

### P31

- الاسم: Staging وEnd-to-End وDisaster Recovery
- الحالة: `pending`
- النطاق:
  - Staging منفصل.
  - Seed data غير حقيقية.
  - E2E registration.
  - Backup restore.
  - Incident drill.
  - Rollback release.

### P32

- الاسم: Launch Readiness Review
- الحالة: `pending`
- النطاق:
  - Technical readiness.
  - Security readiness.
  - Legal readiness.
  - Support readiness.
  - Go/No-Go checklist.

### P33

- الاسم: الإطلاق التدريجي للقطاعات الثلاثة
- الحالة: `pending`
- النطاق:
  - Internal pilot.
  - Closed beta.
  - Limited Jordan launch.
  - Feature flags.
  - Capacity checkpoints.

### P34

- الاسم: Post-Launch Operations and Growth
- الحالة: `pending`
- النطاق:
  - 24/7 monitoring المناسب.
  - Error and uptime alerts.
  - Security incident response.
  - Growth analytics.
  - Future AWS readiness.

## الانتقال

لا تنتقل المنصة إلى المرحلة التالية إلا عندما تكون المرحلة الحالية:

- merged
- post_merge_verified
- completed

ويكون `main` نظيفًا ومتزامنًا، وتوجد وثيقة إكمال رسمية.

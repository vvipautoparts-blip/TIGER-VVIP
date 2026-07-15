# VVIP TIGER — Unified Platform and Operating Model

هذا المستند هو النسخة المقروءة للمالك والإدارة.

المرجع الرسمي المنظم هو:

- [docs/owner-control/VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.yaml](./VVIP_TIGER_UNIFIED_PLATFORM_AND_OPERATING_MODEL.yaml)

## الحالة والحدود

- الحالة الحالية: P02 in_progress
- المرحلة التالية: P03 pending
- نوع هذه الحزمة: Documentation-only
- لا تبدأ مرحلة جديدة من هذا المستند
- لا استبدال لخارطة التنفيذ الرئيسية، بل ربط مباشر معها

## مراجع مرتبطة إلزاميًا

- [docs/owner-control/VVIP_TIGER_UNIFIED_UI_AND_NAVIGATION_STANDARD.md](./VVIP_TIGER_UNIFIED_UI_AND_NAVIGATION_STANDARD.md)
- [docs/owner-control/vvip-unified-ui-tokens.json](./vvip-unified-ui-tokens.json)
- [docs/owner-control/VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.md](./VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.md)
- [docs/owner-control/VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.yaml](./VVIP_TIGER_IMAGE_AND_MEDIA_STANDARD.yaml)

## الحقيقة الأساسية للمنصة

- VVIP TIGER منصة واحدة
- حساب واحد
- تسجيل دخول واحد
- ملف عام وملف خاص لنفس الحساب
- بحث موحد
- Feed موحد
- Navigation موحد
- Tiger Care موحد
- رسائل وإشعارات موحدة

### القطاعات الثلاثة

1. السيارات وقطع الغيار والخدمات
2. المواد والتموين والمستلزمات
3. العقارات

هذه القطاعات تصنيفات وفلاتر داخل منصة واحدة، وليست شركات منفصلة أو تطبيقات منفصلة أو بوابات دخول منفصلة أو هويات منفصلة.

## هندسة المسارات والتجربة

- entry: index.html — Phase P02
- authentication: Clerk — existing and P03 review
- onboarding: reserved — P04
- home_feed: unified platform home — P02 and P13
- discovery_marketplace: unified search and filters — P02 and P12
- public_profile: public identity visible to others — P05
- private_profile: private account management (protected) — P05
- create_listing: reserved — P09
- messages: one-to-one only — P14
- sharing: one-to-one only — P15
- notifications: P19
- tiger_care: internal support module, not a separate company — P20
- owner_control_center: owner only — P06
- admin_dashboards: protected — P22

### سياسة المسارات غير الجاهزة

أي Route غير جاهز يجب أن يكون:

- reserved
- disabled
- coming_later

ولا يجب أن يذهب إلى 404 لمسار معروف محجوز، ولا يدعي أنه يعمل.

## رحلة المستخدم

تسجيل الدخول
→ Clerk
→ فحص هل الحساب جديد
→ Onboarding في P04
→ اختيار نوع الحساب
→ دخول App Shell الموحد
→ تصفح جميع القطاعات
→ النشر حسب صلاحية القطاع
→ تواصل فردي
→ الاتفاق النهائي خارج مسؤولية المنصة

### أنواع الحساب

- Buyer Viewer
- Buyer Standard
- Individual Seller
- Parts Shop
- Maintenance Center
- Electrical/Hybrid Center
- General Service Center
- Dealer/Distributor
- Company/Institution
- Supplier
- Retailer
- Office
- Broker
- Service Provider
- Personal VIP
- Admin-approved account types

مهم: لا تنفيذ تخزين أنواع الحساب أو صلاحياتها في P02. التنفيذ في P04 وP16.

## الهيكل الإداري

- platform_owner: أعلى حوكمة وتحكم
- general_manager: الإدارة العامة والتشغيل
- sector_managers:
  - automotive
  - materials_and_supplies
  - real_estate
- city_region_managers: تنسيق النشاط المحلي ومتابعة الفرق واحتياجات السوق ورفع التقارير، بدون unrestricted admin power
- field_supervisors (اختياري): متابعة المندوبين ومراجعة الأداء والتدريب الميداني
- delegates_ambassadors: تعريف التجار والمكاتب، دعم التسجيل والتفعيل، التدريب الأولي، جمع ملاحظات السوق، رفع طلبات الدعم

### صلاحيات المندوب أو السفير (قيود)

- no_unrestricted_delete
- no_final_moderation_approval
- no_financial_admin_access
- no_owner_access

### وظائف تشغيلية منفصلة

- customer_service
- tiger_care
- technical_support
- moderation
- complaints_and_appeals
- security_and_privacy
- legal_and_financial_review
- reporting_and_analytics

## علاقة مدير القطاع ومدير المنطقة (Matrix)

- مدير القطاع مسؤول عن قواعد القطاع وتصنيفاته وجودته
- مدير المنطقة مسؤول عن النشاط الجغرافي والفرق المحلية
- المندوب قد يكون متخصصا بقطاع أو يعمل عبر أكثر من قطاع بموافقة
- اعتماد المنشور أو العقوبة لا يمنح تلقائيا لمن يستفيد ماليا من العمولة
- القرارات الحساسة تحتاج فصل صلاحيات وموافقة موثقة
- الخلافات ترفع إلى المدير العام أو الجهة المختصة

## إطار العمولات المؤجل

الحالة: TBD

لا تثبيت حاليا لأي من التالي:

- نسبة المندوب
- نسبة المشرف
- نسبة مدير المنطقة
- نسبة مدير القطاع
- مبلغ العمولة
- مدة العمولة
- سقف العمولة
- عدد المندوبين

الأطراف المحتملة:

- delegate
- field_supervisor
- city_region_manager
- sector_manager_if_approved

شروط استحقاق مستقبلية:

- verified attribution
- real account
- paid and confirmed activation
- no fraud
- no duplicate account
- no refunded payment
- approval workflow passed
- payout waiting period completed

متطلبات النظام:

- commission ledger
- attribution record
- approval history
- audit trail
- payout status
- payout hold period
- maximum cap
- clawback
- refund reversal
- fraud detection
- duplicate account prevention
- conflict of interest control
- tax and accounting review
- legal review
- owner approval

قواعد حاكمة:

- لا عمولة على مجرد التسجيل
- لا عمولة لحساب وهمي
- لا عمولة قبل تحقق الدفع
- لا يقرر المستفيد ماليا وحده اعتماد الحدث الذي يولد عمولته
- يجب فصل الصلاحية الإدارية عن المنفعة المالية

مراحل التنفيذ المستقبلية:

- P17: subscriptions and entitlements
- P18: payments and financial events
- P22: admin dashboards and approvals
- P25: analytics
- P30: legal, tax and privacy review
- P31: staging and financial testing

## الأعداد والكوادر

- planning_estimate_only: true
- final_count: TBD

يحدد العدد لاحقا حسب:

- عدد المستخدمين
- عدد المحافظات والمدن
- حجم المنشورات
- حجم البلاغات
- حجم طلبات Tiger Care
- الميزانية
- سرعة الاستجابة
- مؤشرات الأداء

مهم: أي رقم سابق مثل 18 موظفا ليس التزاما نهائيا.

## قواعد المنتج المقفلة

- 4 منشورات أسبوعيا لكل حساب
- 7 صور كحد أقصى لكل إعلان
- لا فيديو نهائيا
- حذف الإعلان وصوره تلقائيا بعد 120 يوما
- الاسم إلزامي
- السعر إلزامي وأكبر من صفر
- دعم الكسور العشرية
- البحث حسب المدينة والمنطقة
- 80% حقول منظمة و20% وصف قصير
- المستخدم يستطيع تعديل أو حذف منشوره
- التواصل فردي فقط
- لا مجموعات
- لا غرف عامة
- لا إعادة نشر جماعي
- المشاركة الفردية فقط
- تجربة مجانية 4 أشهر
- التصفح موحد لكل القطاعات
- النشر التجاري يخضع لصلاحية القطاع
- 1% من صافي الربح لباب خير وإصلاح وإحسان
- المنصة ليست طرفا في البيع أو الدفع أو التوصيل أو العقود

## الخصوصية والحماية

- البريد خاص بالدخول ولا يكون هو الهوية العامة
- username هو الهوية العامة
- الملف العام لا يعرض البريد أو معلومات Clerk أو بيانات الإدارة
- الملف الخاص محمي
- ملاحظات الإدارة داخلية
- الرسائل خاصة
- بيانات العمولات داخلية
- بيانات المندوبين والمديرين ليست عامة بلا حاجة
- أقل صلاحية ممكنة
- كل إجراء إداري مهم له Audit Log
- لا أرقام إدارة مباشرة للمستخدمين
- التواصل الإداري عبر Tiger Care

## الأمانة والإحسان

- لا تضليل
- لا نجاح وهمي
- لا أسعار أو توفر وهمي
- لا عمولة على احتيال
- لا استغلال للمستخدم
- عدالة في المراجعة
- حق الاعتراض
- لغة محترمة
- حماية الخصوصية
- منع الضرر
- فصل المصالح المالية عن قرارات العقوبة والاعتماد
- جودة وإتقان
- 1% للخير وفق سياسة مالية شفافة لاحقا

الطابع الإيماني يظهر في السلوك والسياسة والحماية، وليس في ملء الأكواد بعبارات شكلية.

## المراجعة التخصصية

لكل قرار توثيق إلزامي للحقول التالية:

- Security Impact
- Performance Impact
- Privacy Impact
- UX Impact
- Amanah and Ihsan Impact
- Legal Impact
- Financial Impact
- Relevant Specialist
- Human Approval Required
- Target Phase
- Evidence
- Rollback Requirement

المراجعات البشرية المطلوبة مستقبلا:

- Legal specialist
- Accountant / tax specialist
- Payments specialist
- Database and RLS specialist
- Authentication specialist
- Security specialist
- Privacy specialist

قاعدة نزاهة: لا يدعى حدوث مراجعة بشرية إلا إذا حدثت فعلا.

## الربط المرجعي

- [docs/owner-control/VVIP_TIGER_OWNER_MASTER_REFERENCE.md](./VVIP_TIGER_OWNER_MASTER_REFERENCE.md)
- [docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml](./VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml)
- [docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md](./VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md)
- [docs/owner-control/P02_APP_SHELL_AND_NAVIGATION.md](./P02_APP_SHELL_AND_NAVIGATION.md)
- [docs/owner-control/VVIP_TIGER_SPECIALIST_REVIEW_GATE.md](./VVIP_TIGER_SPECIALIST_REVIEW_GATE.md)
- [docs/change-control/20260711-p02-app-shell-navigation.json](../change-control/20260711-p02-app-shell-navigation.json)

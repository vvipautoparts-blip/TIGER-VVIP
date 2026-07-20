# القرار المعماري العالمي

## واقع المستودع
التطبيق الحالي متعدد الصفحات وثابت ويحتوي على Clerk وواجهات Marketplace ومكونات محلية. هذا الأصل يحفظ كـLegacy Shell، لكنه لا يعد Backend عالميًا.

## البدائل
1. توسيع التطبيق الثابت: أسرع مؤقتًا، لكنه يراكم منطقًا حساسًا في المتصفح ولا يناسب الصلاحيات والتوسع.
2. إعادة بناء كاملة مباشرة: نظيفة نظريًا، لكنها تخاطر بضياع السلوك الموجود وتأخير طويل.
3. **الاختيار المعتمد: Strangler Migration**: إبقاء الصفحات المستقرة، وإنشاء طبقة خدمة ووحدات عالمية خلف Contracts، ثم نقل الرحلات واحدة واحدة مع Feature Flags.

## الحدود
- Identity Adapter: Clerk.
- Data/Authorization Adapter: Supabase/Postgres مع RLS.
- Search Adapter: واجهة مستقلة لمزود بحث مُدار.
- Media Pipeline: رفع مباشر موقّع، quarantine، تحويل مشتقات، وسياسات Storage.
- Notification Adapter: داخل التطبيق/بريد/Push مع deduplication.
- Project Control: Backend owner-only؛ لا وصول مباشر من المتصفح.

## عدم التعارض
خارطة P القديمة لا تحذف. تربط بخارطة G عبر `legacy_phase_mapping.csv`. لا تغيّر حالة قديمة إلا بقرار موثق ودليل.

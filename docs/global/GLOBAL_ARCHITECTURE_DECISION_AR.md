# القرار المعماري العالمي

## سلطة المنتج الحالية

**VVIP TIGER FUSION 2026** هو `product authority` الحالي للمنتج، ويُقرأ عبر:

`docs/fusion/FUSION_CURRENT_AUTHORITY.md`

والمرجع التصميمي الأعلى:

`docs/superpowers/specs/2026-08-13-vvip-tiger-fusion-2026-owner-constitution-FINAL.md`

هذا القسم يحسم قرارات المنتج؛ أما هذه الوثيقة فتحكم **migration architecture** وطريقة الانتقال الهندسي من الـLegacy Shell إلى البنية العالمية.

## واقع المستودع

التطبيق الحالي متعدد الصفحات وثابت ويحتوي على Clerk وواجهات Marketplace ومكونات محلية. هذا الأصل يحفظ كـLegacy Shell مؤقتًا أثناء الانتقال، لكنه لا يعد Backend عالميًا ولا يملك سلطة إعادة القرارات القديمة التي ألغاها FUSION.

## البدائل

1. توسيع التطبيق الثابت: أسرع مؤقتًا، لكنه يراكم منطقًا حساسًا في المتصفح ولا يناسب الصلاحيات والتوسع.
2. إعادة بناء كاملة مباشرة: نظيفة نظريًا، لكنها تخاطر بضياع السلوك الموجود وتأخير طويل.
3. **الاختيار المعتمد: Strangler Migration**: إبقاء الأجزاء المثبتة مؤقتًا خلف حدود واضحة، وإنشاء طبقة خدمة ووحدات عالمية خلف Contracts، ثم نقل الرحلات واحدة واحدة مع Feature Flags واختبارات رجوع.

## الحدود

- Identity Adapter: Clerk.
- Data/Authorization Adapter: Supabase/Postgres مع RLS/default deny.
- Search Adapter: واجهة مستقلة لمحرك TIGER Search Fabric.
- Media Pipeline: رفع مباشر موقّع، quarantine، تحويل مشتقات، وسياسات Storage ضمن Hybrid Media Fabric.
- Notification Adapter: داخل التطبيق/بريد/Push مع deduplication وسياسات خصوصية.
- Project/Owner Control: Backend/server-confirmed capabilities فقط؛ لا وصول سيادي مباشر من المتصفح.
- Finance: Global Money Fabric فوق ledger مزدوج القيد مع idempotency وsellability gates.

## عدم التعارض

خارطة P القديمة لا تحذف لمجرد أنها قديمة؛ تحفظ فقط كدليل تاريخي/هجرة عند الحاجة. أي mapping قديم هو migration evidence وليس product authority.

إذا تعارض Legacy Shell أو وثيقة P/G قديمة مع FUSION، تكون سلطة القرار لـFUSION، بينما تبقى Strangler Migration هي آلية النقل الآمن دون إعادة بناء فوضوية أو حذف أعمى.

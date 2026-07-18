# VVIP TIGER — التصميم العالمي وحوكمة المنصة وخطة استعادة P08

- الحالة: معتمد تصميميًا بانتظار مراجعة المالك للمستند المكتوب
- التاريخ: 2026-07-18
- النوع: Design and Governance Specification
- النطاق: توثيق فقط في هذا Pull Request
- ممنوع في هذا PR: Runtime، SQL، Clerk configuration، Supabase production، secrets

## A) الملخص التنفيذي

VVIP TIGER منصة موحدة بهوية واحدة، حساب واحد، وتسجيل دخول واحد. تجربة المستخدم الأساسية مشتركة عبر Home وMarketplace/Search وProfile ضمن نفس النظام، مع اعتبار القطاعات الثلاثة فلاتر تنظيمية داخل منصة واحدة وليست تطبيقات منفصلة:

1. قطع وخدمات السيارات.
2. المواد والمستلزمات.
3. العقارات.

اختيار القطاع إلزامي فقط عند إنشاء الإعلان لضمان جودة التصنيف والبحث، بينما التصفح العام يبقى موحدًا. إطلاق الأردن هو Launch Market الأول المضبوط، مع هندسة عالمية منذ البداية تسمح بالتوسع دون إعادة بناء جذرية. العربية (RTL) هي الافتراضية، والإنجليزية مدعومة ضمن التصميم العالمي.

## B) مصادر الحقيقة وترتيب الأولوية

### ترتيب الأولوية المعتمد

1. تعليمات المالك الأحدث المعتمدة.
2. الميثاق المرجعي الأحدث.
3. قرارات ADR والمواصفات المعتمدة.
4. الاختبارات والعقود التقنية.
5. الكود القائم.
6. الوثائق القديمة التي لم تعد معتمدة.

### قاعدة فض التعارض

1. لا يتم اختيار تفسير عشوائي عند التعارض.
2. يوثَّق التعارض نصيًا مع ذكر المصدرين المتعارضين.
3. يُطبَّق القرار الأحدث الموثق زمنيًا ومعياريًا.
4. لا يُحذف التاريخ؛ القرار السابق يُوسم بصراحة على أنه Superseded.

### حقائق مؤكدة من المستودع

1. توجد مواثيق تنفيذ جراحي وأمني صريحة تمنع التعديل العشوائي وتفرض fail-closed وأقل صلاحية.
2. يوجد Product Scope Freeze يوثق منصة موحدة وثلاثة قطاعات كفلاتر وقفلًا ماليًا لإطلاق 60 يومًا.
3. توجد وثائق P08 وتدقيقات أمنية وسيناريوهات مراجعة تمنع ادعاء الجاهزية دون أدلة.
4. توجد اختبارات متعددة مرتبطة بـP08 والأمن والـUX والقيود المعمارية.

### افتراضات تشغيلية وليست حقائق مثبتة

1. أي ادعاء بأن المنصة تتحمل 4M مستخدم فعليًا غير مقبول بلا اختبارات حمل موثقة.
2. أي إصلاح Clerk بلا Console وNetwork evidence يبقى فرضية لا قرارًا.

## C) النطاق الحالي وغير المشمول

### النطاق الحالي

1. Auth بواسطة Clerk.
2. Supabase للبيانات والتخزين والإدارة.
3. ملفات عامة وخاصة.
4. Feed وMarketplace/Search.
5. إعلانات صور فقط.
6. تواصل واحد لواحد.
7. Tiger Care والإدارة والصلاحيات.
8. Web/PWA الآن، وAndroid/iPhone لاحقًا ضمن هدف الإطلاق.

### غير المشمول في إطلاق 60 يومًا

1. الدفع.
2. الاشتراكات المالية.
3. العمولات.
4. Escrow.
5. التوصيل.
6. العقود القانونية داخل المنصة.
7. الفيديو.
8. المجموعات أو Group Chat أو Public Repost.

## D) الحوكمة وقاعدة التنفيذ الجراحي

### مسار التنفيذ الإلزامي

Branch -> Tests -> PR -> Review -> Merge

### قواعد حوكمة غير قابلة للتخفيف

1. لا تعديل مباشر على main.
2. Backup وRollback قبل التغييرات الحساسة.
3. Migrations يجب أن تكون Idempotent وقابلة للتراجع.
4. Security Review Gate إلزامية.
5. Performance Review Gate إلزامية.
6. Database Review Gate إلزامية.
7. Auth Review Gate إلزامية.
8. UX/RTL/Accessibility Review Gate إلزامية.
9. Legal/Privacy Review Gate إلزامية.
10. DevOps Review Gate إلزامية.
11. Islamic Ethics Review Gate إلزامية.
12. Definition of Done موحد: لا أسرار، لا أخطاء جديدة، اختبارات صلة ناجحة، Diff محدود، Rollback موثق، Evidence مرفق.

## E) تجربة المستخدم

التجربة المستهدفة: مألوفة وسريعة وعملية، مع مرجعية هيكلية من Facebook (تنقل وبطاقات وتدرج معلومات) وعمق بحث وفلاتر قريب من OpenSooq، دون نسخ الهوية أو العلامة أو الواجهة حرفيًا.

### مبادئ UX

1. هوية VVIP TIGER مستقلة.
2. Mobile First.
3. RTL صحيح افتراضيًا مع دعم LTR.
4. Bottom Navigation: الرئيسية، السوق/البحث، الملف الشخصي.
5. البطاقة تعرض: الصورة، الاسم، السعر، الموقع.
6. التفاصيل داخل السياق (Modal/Expand) بدل نقل قسري.
7. أزرار صغيرة واضحة للتواصل والمفضلة.
8. حالات Loading وEmpty وError وRetry وOffline إلزامية.
9. منع الشاشة البيضاء أو الفشل الصامت.
10. استهداف WCAG 2.2 AA قدر الإمكان.

## F) تصميم البحث

### مكونات Search Experience

1. حقل بحث موحد.
2. اقتراحات بحث.
3. Recent Searches محليًا بطريقة تراعي الخصوصية.
4. فلتر القطاع.
5. الفئة والتصنيف الفرعي.
6. الموقع: الدولة، المدينة، المنطقة.
7. نطاق السعر.
8. الحالة.
9. السمات المنظمة الخاصة بكل قطاع.
10. ترتيب النتائج: الأحدث، السعر، الملاءمة.
11. إزالة الفلاتر فرديًا أو كليًا.
12. عرض عدد النتائج.
13. Empty State يقترح توسيع النطاق.
14. Cursor Pagination أو Infinite Scroll مضبوط.
15. حفظ حالة البحث عند الرجوع.
16. منع تحميل جميع النتائج دفعة واحدة.
17. Search Adapter يبدأ بـPostgreSQL indexes وينتقل لاحقًا إلى محرك متخصص فقط بعد قياسات فعلية.

## G) الإعلانات والصور

### قواعد الوسائط

1. الصور فقط، لا فيديو.
2. حد أقصى 7 صور.
3. نسبة 4:3.
4. أدوات Crop وZoom وReposition وRotate.
5. Reorder واختيار Cover.
6. تخزين النسخة المعالجة فقط.
7. التخلص من الأصل بعد نجاح المعالجة وفق السياسة المعتمدة.

### قواعد البيانات والمحتوى

1. الصورة والاسم والسعر حقول إلزامية.
2. السعر أكبر من صفر ويسمح بالكسور.
3. 4 إعلانات أسبوعيًا لكل مستخدم، والزيادة بصلاحية إدارية.
4. المستخدم يستطيع حذف الإعلان أو الصور.
5. دورة الحياة تتبع القرار الأحدث في الميثاق.
6. فصل واضح بين انتهاء الاشتراك وحد الحذف النهائي.
7. عدم إعادة صياغة قاعدة متجاوزة على أنها قاعدة حالية.

## H) الحسابات والأدوار والصلاحيات

### أنواع الهوية المعتمدة

1. Buyer Viewer.
2. Buyer Standard.
3. Individual Seller.
4. Parts Shop.
5. Maintenance Center.
6. Electrical/Hybrid Center.
7. General Service Center.
8. Dealer/Distributor.
9. Company/Institution.
10. Service Provider.
11. Personal VIP.

### الصلاحيات التشغيلية

1. Sales.
2. Marketing.
3. Campaign Manager.
4. Area/Regional Manager.
5. Tiger Care.
6. Moderator.
7. Admin.

### قاعدة التحكم

يعتمد النظام RBAC/Permission-Based Access فعليًا، ولا يعتمد اسم الدور النصي وحده كسلطة تنفيذية.

## I) التواصل والخصوصية

1. تواصل خاص واحد لواحد فقط.
2. لا مجموعات.
3. لا غرف.
4. لا Broadcast.
5. لا Public Repost.
6. الإعجابات والتعليقات والاستفسارات ضمن الخصوصية والسياسة المعتمدة.
7. دعوة صديق واحدة أو دعوات خاصة ضمن الحد المعتمد تشغيليًا.
8. منع كشف البريد والهاتف دون موافقة وصلاحية.
9. Data Minimization إلزامي.
10. سياسات Retention وDeletion موثقة.
11. Export/Delete Account ضمن المتطلبات القانونية.

## J) الطابع الديني والأخلاقي

### مبادئ قيمية

1. الأمانة.
2. الإحسان.
3. العدل.
4. الرحمة.
5. الصدق.
6. عدم الغش.
7. حفظ الخصوصية.

### ضوابط إلزامية

1. أسماء الله الحسنى والآيات القرآنية ليست أسماء Variables أو Tables أو Error Codes أو Security Modules.
2. لا استخدام للنصوص المقدسة كزينة تقنية أو ادعاء حماية.
3. لا عرض نص مقدس قرب محتوى قد يكون غير ملائم أو قابلًا للحذف/الإساءة.
4. أي صفحة تتضمن أسماء الله أو آيات تحتاج مراجعة شرعية ولغوية مستقلة.
5. الحماية الفعلية تقنية: Encryption، RLS، Least Privilege، Audit Logs، Rate Limits، Backups.
6. يمكن إنشاء صفحة مستقلة لقيم المنصة وباب الخير بعد مراجعة مستقلة.
7. نية تخصيص 1% للعمل الخيري سياسة مستقبلية منفصلة، وليست التزامًا ماليًا داخل MVP دون قرار قانوني ومالي.

## K) الهندسة العالمية

1. Locale Architecture قابلة لإضافة الدول.
2. دعم RTL/LTR.
3. Unicode كامل.
4. Time Zones.
5. العملات وتنسيق الأسعار.
6. الوحدات والمقاييس.
7. الدول والمدن والمناطق.
8. سياسات الخصوصية حسب الدولة.
9. Data Residency قرار لاحق قائم على القانون.
10. لا ربط للمنطق بالأردن بما يمنع التوسع.
11. الأردن Launch Market أولي وليس حدود النظام.

## L) هدف أربعة ملايين مستخدم

### تعريف الهدف

هدف 4M هو Capacity Planning للسنة الأولى وليس رقمًا مضمونًا.

### مبادئ التوسع

1. Stateless frontend and services.
2. CDN.
3. Edge caching للملفات العامة.
4. Object Storage للصور.
5. Database indexes.
6. Connection pooling.
7. Cursor pagination.
8. Background jobs.
9. Queues للمهام الثقيلة.
10. Rate limiting.
11. Horizontal scaling.
12. Observability.
13. Load tests تدريجية.
14. Disaster recovery.
15. Backups and restore drills.
16. منع Microservices المبكرة بلا حاجة مثبتة.
17. البداية Modular Monolith أو فصل منطقي واضح قابل للاستخراج لاحقًا.

## M) الإنترنت الضعيف والأداء

### توجهات الأداء

1. HTML/CSS/JS أولي صغير قدر الإمكان.
2. Critical CSS.
3. Code splitting عند اعتماد build system.
4. Lazy loading.
5. Responsive images وsrcset.
6. AVIF/WebP مع fallback.
7. ضغط الصور.
8. Skeletons.
9. Retry with exponential backoff للطلبات المناسبة فقط.
10. Timeouts.
11. Offline/poor-network notice.
12. Service Worker لا يخزن أسرارًا أو صفحات خاصة دون سياسة صحيحة.
13. Cache headers للموارد الثابتة.
14. عدم Cache بيانات حساسة.
15. منع Layout Shift.
16. مراقبة Core Web Vitals.

### Budgets أولية (تخطيطية)

1. LCP أقل من 2.5 ثانية على اتصال متوسط ضمن بيئة القياس.
2. CLS أقل من 0.1.
3. INP أقل من 200ms قدر الإمكان.

لا تُعرض هذه القيم كنتائج فعلية قبل وصف بيئة القياس وتنفيذ الاختبارات.

## N) الأمن والحماية

1. Zero Trust.
2. Least Privilege.
3. Supabase RLS لكل جدول حساس.
4. لا service_role في Frontend.
5. لا Clerk Secret Key في Frontend.
6. CSP.
7. HSTS في الإنتاج.
8. Secure Headers.
9. CSRF بحسب المعمارية.
10. XSS prevention.
11. Input validation client and server.
12. Output encoding.
13. SQL injection prevention.
14. File type validation by content, not extension only.
15. Image decompression bomb protection.
16. Malware scanning عندما تصبح البنية داعمة.
17. Rate limits.
18. Bot and abuse protection.
19. Account enumeration protection.
20. Session security.
21. Audit logs بلا Tokens أو كلمات مرور أو بيانات حساسة.
22. Secrets manager.
23. Dependency scanning.
24. SAST/DAST ضمن CI مستقبلًا.
25. Backup encryption.
26. Incident response.
27. Moderation evidence logs بصلاحيات وRetention واضحين.

## O) الإدارة والمراقبة

1. Tiger Care dashboard.
2. مراجعة الإعلانات.
3. إدارة البلاغات.
4. إدارة المستخدمين.
5. القيود والحظر.
6. سجل الأدلة.
7. Audit trail.
8. Metrics.
9. Logs.
10. Traces.
11. Alerts.
12. Error tracking.
13. Privacy-safe analytics.
14. Feature flags.
15. Rollback controls.
16. فصل صلاحيات الدعم عن صلاحيات الإدارة العليا.

## P) P08 Clerk Recovery Design (توثيق فقط)

### الحالة الحالية الموثقة لهذه المواصفة

1. الواجهة الأساسية تعمل كصفحة Static HTML محلية.
2. بوابة Clerk في مسار auth قد تظهر فشل تحميل حسب البلاغ التشغيلي الحالي.
3. مؤشرات Issues (مثل ملاحظات id/name) لا تكفي وحدها لإثبات Root Cause.
4. لا يتم اعتماد أي إصلاح قبل جمع أدلة Console وNetwork.

### منهج الاستعادة الإلزامي

1. Reproduce.
2. Capture Console errors.
3. Capture failed Network requests.
4. Inspect Clerk SDK loading.
5. Verify Publishable Key presence without printing it.
6. Verify allowed origins and redirect URLs.
7. Verify Clerk.load and mount order.
8. Verify CSP and browser restrictions.
9. Compare against a working Clerk page in the repository.
10. Form one root-cause hypothesis.
11. Add a failing test.
12. Apply the smallest fix.
13. Run focused and full tests.
14. Open a separate Runtime Draft PR.

### قيود إضافية

1. تحذير id/name يُعالج فقط إذا ثبت أنه في كودنا ومتصّل سببيًا بالمشكلة.
2. يمنع وضع أي Secret في HTML.
3. أي تغيير في Clerk Dashboard يحتاج موافقة وتوثيقًا منفصلًا.

## Q) فصل التنفيذ إلى Pull Requests

### PR 1 (الحالي)

1. Documentation/Governance only.
2. هذا المستند فقط، مع فهرس توثيقي عند الحاجة.
3. لا Runtime.

### PR 2 (لاحق)

1. P08 Clerk root-cause fix.
2. أصغر تغيير ممكن.
3. اختبار فاشل قبل الإصلاح ثم ناجح بعده.
4. لا خلط مع ميزات أخرى.

### PRs لاحقة

1. UX/Search.
2. Media pipeline.
3. Supabase/RLS.
4. Performance and observability.
5. Globalization.

ممنوع تحويل هذه الحزم إلى PR عملاق واحد.

## R) الاختبارات ومعايير القبول

### أنواع الاختبارات المطلوبة

1. Unit.
2. Integration.
3. Auth.
4. RLS.
5. E2E.
6. RTL.
7. Accessibility.
8. Responsive.
9. Slow network.
10. Offline degradation.
11. Security.
12. Image upload.
13. Search.
14. Moderation.
15. Load testing.
16. Backup restore.

### معيار القبول لأي PR

1. لا أسرار.
2. لا أخطاء جديدة.
3. الاختبارات المرتبطة بالنطاق ناجحة.
4. Diff محدود ومفهوم.
5. Rollback موثق.
6. Evidence مرفق.
7. مراجعات التخصصات المطلوبة مكتملة.
8. لا ادعاء غير مثبت.

## S) المخاطر وخطة التراجع

| الخطر | الاحتمال | الأثر | الوقاية | الكشف | الاستجابة | التراجع |
|---|---|---|---|---|---|---|
| تضخم النطاق | مرتفع | مرتفع | Scope lock لكل PR | مراجعة حجم diff | تجميد الإضافات غير المعتمدة | الرجوع لآخر PR ضيق |
| تعارض الوثائق | متوسط | مرتفع | ترتيب مصادر الحقيقة | فحص التعارض قبل الدمج | توثيق Superseded | revert commit الوثائقي المتعارض |
| سوء استخدام النصوص الدينية | متوسط | مرتفع | ميثاق قيم وضوابط نشر | مراجعة شرعية/لغوية | إزالة الاستخدام غير المنضبط | rollback للمحتوى المخالف |
| تسريب مفاتيح | منخفض/متوسط | حرج | Secret scan + redaction | CI scan + review | rotate/revoke وتحقيق | عزل التغيير وتسريع الإبطال |
| فشل Clerk | متوسط | مرتفع | منهج Root-cause + test-first | Console/Network evidence | إصلاح جراحي | rollback PR الإصلاح |
| ضعف الشبكة | مرتفع | مرتفع | skeletons + timeouts + retry policy | telemetry + field feedback | degraded mode منضبط | تعطيل السلوك غير المستقر Feature-Flag |
| ضغط الصور غير المنضبط | متوسط | متوسط/مرتفع | سياسة 7 صور + 4:3 + معالجة | فحوص upload/perf | تحسين pipeline | rollback media change |
| إساءة الاستخدام | متوسط | مرتفع | rate limits + moderation | alerts + reports | حظر/تقييد + تحقيق | ضبط السياسات والعودة لآخر stable |
| اختناق قاعدة البيانات | متوسط | مرتفع | indexes + pagination + pooling | slow query metrics | tuning مرحلي | rollback query/adapter change |
| تكلفة البنية | متوسط | متوسط | capacity planning تدريجي | cost dashboards | ضبط autoscaling/retention | تعطيل المسارات الأعلى تكلفة |
| الخصوصية الدولية | متوسط | مرتفع | legal/privacy gate | تدقيق امتثال دوري | مواءمة سياسة الدولة | تعليق ميزة جغرافيًا |

## T) القرارات النهائية

1. VVIP TIGER منصة واحدة موحدة.
2. حساب واحد لكل مستخدم.
3. القطاعات الثلاثة فلاتر داخل المنصة.
4. التواصل فردي فقط واحد لواحد.
5. الإعلانات صور فقط، حد أقصى 7 صور، نسبة 4:3.
6. الحد الأسبوعي 4 إعلانات لكل مستخدم مع صلاحيات إدارية للزيادة.
7. الاعتماد المعماري: Clerk للهوية وSupabase للبيانات/التخزين/الإدارة.
8. الأردن أولًا في الإطلاق، مع هندسة عالمية من اليوم الأول.
9. لا مدفوعات أو اشتراكات مالية أو عمولات ضمن MVP الحالي.
10. الدين إطار قيم وحوكمة محترمة، وليس أسماء تقنية أو ادعاء حماية.
11. هدف 4M هو هدف تخطيط استيعابي يحتاج إثباتًا باختبارات تحميل فعلية.
12. الأداء والأمن وتجربة المستخدم شروط إطلاق لا بنود تجميلية.
13. PR التوثيقي الحالي لا يتضمن أي Runtime أو SQL أو إعداد Clerk/Supabase إنتاجي.

## سجل تعارضات موثقة (Superseded Register)

1. أي وثيقة أقدم تقترح تعدد حسابات لكل قطاع تُعد Superseded بقاعدة الحساب الموحد.
2. أي طرح أقدم يوحي بمنصة طرف في الدفع/التسليم/العقود ضمن الإطلاق الأولي يُعد Superseded بقفل النطاق المالي.
3. أي صياغة قد تُفهم على أنها وعد جاهزية 4M فورية تُعد Superseded بقاعدة Capacity Planning القائم على الاختبار.
4. أي إصلاح سريع لـClerk بلا أدلة Console/Network واختبار فاشل أولًا يُعد Superseded بمنهج الاستعادة الجراحية في هذا المستند.
5. أي مراجع Auth تاريخية مبنية على Firebase في وثائق قديمة تُعد Superseded ضمن مسار الهوية المعتمد حاليًا على Clerk في هذا التصميم.

## اتجاه تنفيذي بعد موافقة المالك

1. اعتماد هذا المستند كمرجع Governance للتجزئة المرحلية.
2. بدء PR Runtime مستقل لـP08 Clerk recovery وفق تسلسل التشخيص الموثق.
3. ربط كل PR تنفيذي ببوابات الأمن والأداء والخصوصية والأخلاقيات قبل الدمج.

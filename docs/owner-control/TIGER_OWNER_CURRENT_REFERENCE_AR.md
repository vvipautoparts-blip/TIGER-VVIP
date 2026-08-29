# مرجع مالك TIGER الحالي — CURRENT ONLY

**الحالة:** `CURRENT OWNER ENTRYPOINT / CURRENT_ONLY / FIRST_REFERENCE / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**آخر اعتماد:** 2026-08-29

هذه هي نقطة الدخول الحالية للمالك، والمرجع الأول الإلزامي قبل أي إجراء هو:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

> **الأحدث الذي يعتمده المالك هو السلطة الوحيدة في نطاقه. كل قديم متعارض يُحذف من الشجرة الحالية ومن Runtime/UI/API/Config/Tests/CI/Current Docs/Launch Gates ولا يعود كـfallback أو archive أو trash أو legacy/compatibility path داخل المشروع. الأثر التاريخي يبقى في Git history فقط.**

## قرارات المنتج الحالية

- هوية المنتج الأساسية: `SOCIAL_NETWORK_FIRST`.
- المرجع الحالي لتجربة المنتج: `TIGER NEXUS 2026`.
- TIGER شبكة اجتماعية عالمية متخصصة بالقطاعات المفعلة فقط؛ لا يوجد نشر عام بلا قطاع وغرض معتمد.
- الكائن المنشور الحالي هو `Living Sector Object` ويجب أن يحمل قطاعًا مفعّلًا وIntent من `OFFER / NEED / SERVICE / OPPORTUNITY` ما لم يعتمد المالك نوعًا جديدًا لاحقًا.
- الصفحة الرئيسية هي Social Feed، وMarketplace/اكتشاف القطاعات وحدة داخل الشبكة وليست الصفحة الرئيسية.
- مدخل الإنشاء الاجتماعي الحالي: **ماذا تعرض أو تحتاج؟**، مع Progressive Creation بدل نموذج امتحاني شامل.
- `☰` هو `TIGER Command` الدائم، و`صلاحياتي` Passport بشري مشتق فقط من حالة صلاحيات مؤكدة من الخادم؛ الحالة null/unvalidated لا تعرض أي إجراء مميز.
- العاملون معنا يستخدمون نفس العالم ونفس المنتج مع صلاحيات سياقية إضافية: `Same World — Different Authority`.
- النشر العادي المؤهل مجاني وغير مربوط ببطاقة أو اشتراك أو خانة مدفوعة أو plan أو entitlement.
- لا توجد quota تجارية/أسبوعية ثابتة حالية لعدد المنشورات.
- الحد الحالي لإعلان Marketplace العادي: 7 صور.
- لا توجد مدة منتج/محتوى للمنشور أو الإعلان أو رصيد/بطاقة الظهور.
- TTLs التقنية الأمنية فقط مثل OTP/session/signed URL/anti-replay/cache/temporary quote/reservation تبقى لأنها حماية تقنية وليست مدة منتج.
- الظهور المدفوع الحالي: `TIGER PULSE RING / PULSE VAULT` بمستويات **2 / 10 / 25 / 45 JOD** فقط.
- كل مبلغ له تخصيص ظهور server-authoritative مختلف، ويظهر للمستخدم قبل الدفع؛ الظهور لا يقاس بالأيام ولا ينتهي بمرور الزمن أو بسبب الانتظار قبل الاستخدام.
- Pulse Vault يسمح ببقاء الظهور غير المخصص حتى يختار المستخدم كائنًا مؤهلًا ويخصص/يفعّل الظهور وفق سياسة الخادم.
- أوضاع توزيع NEXUS الحالية: `NOW / SMART / PRECISE`؛ تغير طريقة التوزيع فقط ولا تغير كمية الظهور المشتراة ولا تتجاوز الأهلية.
- الاستهلاك الحالي للظهور يبقى `RESERVE → SERVE → VERIFY → CONSUME`؛ الظهور غير المؤهل، bot، الخلفية، التكرار المحجوب، فشل الحجز أو التمرير غير المؤهل = صفر استهلاك.
- إذا لم يوجد GENERAL_MANAGER أو SECTOR_MANAGER أو MARKETER منسوب للبيع، يحصل المستخدم على خصم خدمة ذاتية **7%** ظاهر قبل الدفع.
- إذا وجد بائع معتمد، لا يوجد خصم 7%، ويستحق العمولة **الشخص صاحب البيع فقط** من الأدوار الثلاثة.
- VVIP TIGER ليس طرفًا في صفقة البائع/المشتري أو مزود الخدمة/المستفيد.

## قاعدة الحذف الحالية — لا تخبئة ولا تراش

أي Runtime/UI/API/Config/Test/CI/Current Doc/Launch Gate/Generated Artifact قديم يتعارض مع آخر اعتماد للمالك يُحذف من الشجرة الحالية بعد إثبات التعارض والاستبدال.

ممنوع حفظ التعارض داخل `legacy/` أو `archive/` أو `trash/` أو hidden compatibility layer أو fallback أو نسخة تاريخية داخل الشجرة الحالية. Git history فقط يحتفظ بالأثر التاريخي.

ملفات migrations المطبقة تاريخيًا لا يعاد تحريرها لتزييف التاريخ؛ يتم تحييد أثرها القديم بـ forward migration عند الحاجة.

## التوزيع المالي الحالي — 100%

من القيمة التي تم تحصيلها فعليًا من المستخدم بعد الخصم الصحيح إن وجد:

- OWNER: **5%**
- PARTNER_1: **5%**
- PARTNER_2: **5%**
- PARTNER_3: **5%**
- ACTUAL_OPERATIONS: **43%**
- TAX_RESERVE: **16%**
- SALES_ADMINISTRATION: **21%**
- TOTAL: **100%**

تفصيل ACTUAL_OPERATIONS 43%:

`8% مخاطر + 8% صيانة + 8% تطوير + 8% دعم فني + 8% إعلانات + 3% CSR`.

تفصيل SALES_ADMINISTRATION 21%:

`7% GENERAL_MANAGER + 7% SECTOR_MANAGER + 7% MARKETER`، لكن في كل عملية شراء **فائز واحد فقط** يأخذ 7%، والباقي يرحل للمالك مع reason codes واضحة.

عند الشراء الذاتي بلا بائع: خصم المستخدم 7% أولًا، لا عمولة لأي دور مبيعات، و21% من القيمة المحصلة بعد الخصم ترحل للمالك مع توثيق غياب الأدوار.

التسوية للعمولات المؤهلة كل 14 يومًا، ووجهة الصرف مطلوبة خلال 12 ساعة من منح الدور إلا إذا مدد المالك المهلة. تصفير الرصيد بعد التسوية لا يعني حذف سجل الحركات؛ الـledger يبقى غير قابل للمحو.

## السلطات الحالية فقط

1. `TIGER_OWNER_BINDING_CURRENT.md` — المرجع الأول ودستور Latest-Only.
2. `TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md` — تجربة المنتج الحالية: Social-first / Sector-only / Living Sector Object / TIGER Command / Pulse Vault.
3. `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — Social Core ما لم يتعارض مع NEXUS الأحدث في نطاق تجربة المنتج.
4. `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — الظهور المدفوع 2/10/25/45 بلا مدة، ويقرأ الآن عبر Pulse Vault في تجربة NEXUS.
5. `TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md` — التوزيع المالي 100%.
6. `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — حوكمة التنظيف.
7. `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — سلطة `post-launch-autonomy` المستقبلية المحمية.
8. `project-control/authority/authority-registry.v1.json` — Authority Graph الآلي.
9. `config/fusion/current-authority.json` — عقد المنتج الآلي.
10. `config/finance/current-distribution.json` — عقد التوزيع المالي الآلي.
11. exact Git SHA/tree + matching CI evidence — حقيقة التنفيذ.

أي ملف آخر يتعارض مع هذه السلطات لا يصبح مرجعًا؛ يُحذف من الشجرة الحالية بعد إثبات التعارض.

## TIGER AION — سلطة ما بعد الإطلاق المحمية

مرجع السلطة الحالي الكامل:

`docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

النطاق الآلي: `post-launch-autonomy`.

لا توجد aliases تشغيلية بديلة أو fallback مخولة داخل هذا النطاق.

حالة التنفيذ المثبتة على فرع AION هي:

- `BRANCH_A0_TO_A9_VERIFIED`؛
- `PRODUCTION_NOT_ACTIVATED`؛
- AION لا يمنح أي تفويض لتغيير `main` أو Production من هذا المرجع؛
- checkpoint المثبت: `ca76f5e1d8dcf60521b0d25545ed0c1c12d015ec`.

هذه الإشارة تحفظ اتصال مرجع المالك بسلطة TIGER AION دون تحويل حالة الفرع إلى تصريح Production أو تجاوز بوابة الإطلاق العالمي.

## قاعدة التنظيف

أمر `نظف / cleanup` يعني PHOENIX CLEANROOM كاملًا.

`NO PROOF OF RECLAMATION → NO DESTRUCTIVE DISPOSAL`، لكن هذه الحماية لا تبرر إبقاء معلومة قديمة متعارضة داخل المنصة.

## مسار التنفيذ

`OWNER CURRENT AUTHORITY → RED CONTRACT → IMPLEMENT → DELETE SUPERSEDED CURRENT-TREE MATERIAL → GREEN EXACT-HEAD CI → REVIEW → PROTECTED MERGE → VERIFICATION`

لا كتابة مباشرة على `main` ولا تجاوز للبوابات الأمنية/القانونية/الإنتاجية.

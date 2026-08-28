# مرجع مالك TIGER الحالي — CURRENT ONLY

**الحالة:** `CURRENT OWNER ENTRYPOINT / CURRENT_ONLY / FIRST_REFERENCE / NO_FALLBACK / NO_IN_TREE_ARCHIVE`  
**آخر اعتماد:** 2026-08-28

هذه هي نقطة الدخول الحالية للمالك، والمرجع الأول الإلزامي قبل أي إجراء هو:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

> **الأحدث الذي يعتمده المالك هو السلطة الوحيدة في نطاقه. كل قديم متعارض يُحذف من الشجرة الحالية ومن Runtime/UI/API/Config/Tests/CI/Current Docs/Launch Gates ولا يعود كـfallback أو archive داخل المشروع. الأثر التاريخي يبقى في Git history فقط.**

## قرارات المنتج الحالية

- هوية المنتج الأساسية: `SOCIAL_NETWORK_FIRST`.
- Marketplace وحدة داخل المنصة الاجتماعية.
- النشر العادي مجاني وغير مربوط ببطاقة أو اشتراك أو خانة مدفوعة أو plan أو entitlement.
- لا توجد quota تجارية/أسبوعية ثابتة حالية لعدد المنشورات.
- الحد الحالي لإعلان Marketplace العادي: 7 صور.
- لا توجد مدة منتج/محتوى للمنشور أو الإعلان أو رصيد/بطاقة الظهور.
- TTLs التقنية الأمنية فقط مثل OTP/session/signed URL/anti-replay/cache/temporary quote تبقى لأنها حماية تقنية وليست مدة منتج.
- الظهور المدفوع الحالي: `TIGER PULSE RING` بمستويات **2 / 10 / 25 / 45 JOD** فقط.
- كل مبلغ له تخصيص ظهور server-authoritative مختلف، ويظهر للمستخدم قبل الدفع؛ الظهور لا يقاس بالأيام ولا ينتهي بمرور الزمن.
- إذا لم يوجد GENERAL_MANAGER أو SECTOR_MANAGER أو MARKETER منسوب للبيع، يحصل المستخدم على خصم خدمة ذاتية **7%** ظاهر قبل الدفع.
- إذا وجد بائع معتمد، لا يوجد خصم 7%، ويستحق العمولة **الشخص صاحب البيع فقط** من الأدوار الثلاثة.
- VVIP TIGER ليس طرفًا في صفقة البائع/المشتري أو مزود الخدمة/المستفيد.

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
2. `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — Social Core.
3. `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — الظهور المدفوع 2/10/25/45 بلا مدة.
4. `TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md` — التوزيع المالي 100%.
5. `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — حوكمة التنظيف.
6. `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — بوابة الحذف المدمر.
7. `project-control/authority/authority-registry.v1.json` — Authority Graph الآلي.
8. `config/fusion/current-authority.json` — عقد المنتج الآلي.
9. `config/finance/current-distribution.json` — عقد التوزيع المالي الآلي.
10. exact Git SHA/tree + matching CI evidence — حقيقة التنفيذ.

أي ملف آخر يتعارض مع هذه السلطات لا يصبح مرجعًا؛ يُحذف من الشجرة الحالية بعد إثبات التعارض.

## قاعدة التنظيف

أمر `نظف / cleanup` يعني PHOENIX CLEANROOM كاملًا.

`NO PROOF OF RECLAMATION → NO DESTRUCTIVE DISPOSAL`، لكن هذه الحماية لا تبرر إبقاء معلومة قديمة متعارضة داخل المنصة.

## مسار التنفيذ

`OWNER CURRENT AUTHORITY → RED CONTRACT → IMPLEMENT → DELETE SUPERSEDED CURRENT-TREE MATERIAL → GREEN EXACT-HEAD CI → REVIEW → PROTECTED MERGE → VERIFICATION`

لا كتابة مباشرة على `main` ولا تجاوز للبوابات الأمنية/القانونية/الإنتاجية.

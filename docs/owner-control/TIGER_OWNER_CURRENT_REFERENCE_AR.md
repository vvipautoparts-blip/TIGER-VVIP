# مرجع مالك TIGER الحالي — CURRENT ONLY

**الحالة:** `CURRENT OWNER ENTRYPOINT / CURRENT_ONLY / FIRST_REFERENCE / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**آخر اعتماد:** 2026-08-29

هذه هي نقطة الدخول الحالية للمالك، والمرجع الأول الإلزامي قبل أي إجراء هو:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

> **الأحدث الذي يعتمده المالك هو السلطة الوحيدة في نطاقه. كل قديم متعارض يُحذف من الشجرة الحالية ومن Runtime/UI/API/Config/Tests/CI/Current Docs/Launch Gates ولا يعود كـfallback أو archive داخل المشروع. الأثر التاريخي يبقى في Git history فقط.**

## TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 — المرجعية العليا الوحيدة

المرجع السيادي/الأمني/الإصداري الأعلى الحالي:

`docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`

القواعد الحاكمة:

- `OWNER_ROOT` جذر سلطة عالمي واحد وليس حساب دولة.
- **ZERO DEFAULT COUNTRY**.
- **ZERO DEFAULT CURRENCY**.
- لا مزود دفع أو كيان قانوني أو ملف ضريبي أو Data Region أو Market افتراضي.
- `MARKET + CAPABILITY` هي وحدة التفعيل؛ الدولة ليست مفتاح تشغيل واحدًا.
- التفعيل والتنفيذ الحساسان Proof-First: Evidence حديثة، Policy موقعة، Genome صحيح، Exact Release، وسلطة مالك صالحة حسب العملية.
- أي حقيقة Critical مفقودة أو منتهية أو stale أو غير قابلة للتحقق أو متعارضة أو revoked => `DENY / FAIL_CLOSED`.
- **NO SOVEREIGN FALLBACK**: لا رجوع تلقائي إلى الأردن/أمريكا/السودان أو JOD/USD أو مزود/Market/Release/Proof آخر.
- السيرفر/قاعدة البيانات/CDN/IP/لغة المستخدم/رقم الهاتف لا يفعّل Market ولا يغير هوية `OWNER_ROOT`.
- العمليات الحساسة للمالك تستهدف مصادقة مقاومة للتصيد ومدعومة بمفتاح/عتاد مناسب وصلاحية تنفيذ قصيرة ومحددة، لا Super Admin دائم.
- الحقيقة التشفيرية تصبح Evidence-generated عبر Crypto Digital Twin/CBOM، ولا Custom Cryptography ولا Custom PQC.
- Preview/Draft/Experimental ليست مرجع Production سياديًا؛ Technology Maturity Firewall يمنع ذلك.
- القرار الجديد **يلغي المرجعية المعمارية السيادية السابقة إلغاءً تامًا من Current Tree**؛ لا Archive ولا Legacy ولا fallback. أي مكوّن تقني سابق يبقى فقط كجزء فرعي داخل SPGF وليس كمرجع موازٍ.

## قرارات المنتج الحالية

- هوية المنتج الأساسية: `SOCIAL_NETWORK_FIRST`.
- Marketplace وحدة داخل المنصة الاجتماعية.
- النشر العادي مجاني وغير مربوط ببطاقة أو اشتراك أو خانة مدفوعة أو plan أو entitlement.
- لا توجد quota تجارية/أسبوعية ثابتة حالية لعدد المنشورات.
- الحد الحالي لإعلان Marketplace العادي: 7 صور.
- لا توجد مدة منتج/محتوى للمنشور أو الإعلان أو رصيد/بطاقة الظهور.
- TTLs التقنية الأمنية فقط مثل OTP/session/signed URL/anti-replay/cache/temporary quote/owner execution lease/evidence freshness/execution seal تبقى لأنها حماية تقنية وليست مدة منتج.
- الظهور المدفوع الحالي: `TIGER PULSE RING` بمستويات المنتج `PULSE_2 / PULSE_10 / PULSE_25 / PULSE_45`؛ السعر والعملة السياديان يحددهما **Signed Market Pricing Contract** المصرح به، ولا توجد عملة عالمية افتراضية.
- كل مستوى له تخصيص ظهور server-authoritative مختلف؛ الظهور لا يقاس بالأيام ولا ينتهي بمرور الزمن.
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
2. `TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md` — المرجعية العليا الوحيدة للسيادة/الإثبات/الأمن/الإصدار.
3. `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — Social Core.
4. `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — الظهور المدفوع بلا مدة مع تسعير سيادي لكل Market.
5. `TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md` — التوزيع المالي 100%.
6. `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — حوكمة التنظيف.
7. `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — سلطة `post-launch-autonomy` المستقبلية المحمية.
8. `project-control/authority/authority-registry.v1.json` — Authority Graph الآلي.
9. `config/fusion/current-authority.json` — عقد المنتج الآلي.
10. `config/sovereignty/spgf-v1.json` — عقد SPGF الآلي الأعلى.
11. `config/finance/current-distribution.json` — عقد التوزيع المالي الآلي.
12. exact Git SHA/tree + matching executed CI/proof evidence — حقيقة التنفيذ.

أي ملف آخر يتعارض مع هذه السلطات لا يصبح مرجعًا؛ يُحذف من الشجرة الحالية بعد إثبات التعارض.

## TIGER AION — سلطة ما بعد الإطلاق المحمية

مرجع السلطة الحالي الكامل:

`docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

النطاق الآلي: `post-launch-autonomy`.

لا توجد aliases تشغيلية بديلة أو fallback مخولة داخل هذا النطاق.

هذه الإشارة لا تمنح أي تفويض لتغيير `main` أو Production ولا تتجاوز بوابة الإطلاق العالمي.

## قاعدة التنظيف

أمر `نظف / cleanup` يعني PHOENIX CLEANROOM كاملًا.

`NO PROOF OF RECLAMATION → NO DESTRUCTIVE DISPOSAL`، لكن هذه الحماية لا تبرر إبقاء معلومة قديمة متعارضة داخل المنصة.

## مسار التنفيذ

`OWNER CURRENT AUTHORITY → RED CONTRACT → IMPLEMENT → DELETE SUPERSEDED CURRENT-TREE MATERIAL → GREEN EXACT-HEAD CI/EVIDENCE → REVIEW → PROTECTED MERGE → VERIFICATION`

لا كتابة مباشرة على `main` ولا تجاوز للبوابات الأمنية/القانونية/الإنتاجية.

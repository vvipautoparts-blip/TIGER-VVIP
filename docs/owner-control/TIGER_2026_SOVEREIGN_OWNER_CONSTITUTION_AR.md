# دستور المالك السيادي لـTIGER 2026

**الحالة:** `CURRENT_ONLY / OWNER APPROVED / EXECUTION AND TRUTH AUTHORITY`

**تاريخ الاعتماد:** 2026-08-20

**النطاق:** هذا الدستور يثبت اتجاه VVIP TIGER، قواعد الحقيقة، الأمن، الخصوصية، التكلفة، الإغلاق، ومنع الادعاءات الوهمية. لا يحل محل المواصفات المتخصصة؛ بل يحكمها ويحدد متى تُقبل نتائجها.

## 1. مراتب الحقيقة

ترتيب الحقيقة غير قابل للعكس:

1. bytes المستودع الحالي والـruntime الفعلي.
2. exact commit SHA وexact tree SHA.
3. أدلة CI/Rehearsal/Artifact المطابقة لنفس الـSHA.
4. `docs/MASTER_PROJECT_STATE.md`.
5. هذا الدستور وسلطات المالك المتخصصة.
6. خطط التنفيذ والمواصفات.
7. سجلات المصدر والمحادثات والأرشيف.

المسار الملزم لكل متطلب:

`Requirement → Code → Test → Rehearsal → Evidence → Exact SHA → Release Passport`

لا تعني الموافقة أن الكود نُفذ. ولا يعني وجود الكود أنه متحقق. الحالات الوحيدة هي:

- `DESIGNED`
- `IMPLEMENTED`
- `VERIFIED`
- `PRODUCTION_ELIGIBLE`

أي دليل قديم بعد تغيّر byte واحد يصبح `STALE` لذلك الرأس حتى يُعاد إنتاجه.

## 2. قرار التجميد والإغلاق

`DESIGN BASELINE FROZEN`

`STOP DESIGN EXPANSION → START CLOSURE`

لا تدخل تقنية جديدة لمجرد أنها حديثة. مسار قبول أي تقنية هو:

`Problem proven → Requirement measurable → Current architecture insufficient → Benefit measurable → Cost acceptable → Security acceptable → Migration defined → Exit strategy defined`

إذا لم يكتمل هذا المسار فالقرار:

`REJECTED — UNNECESSARY COMPLEXITY`

هذا يمنع تحويل TIGER إلى Technology Zoo ويحافظ على أقل تعقيد وأقل تكلفة تشغيلية ممكنة.

## 3. هوية المنتج وحدوده

- TIGER شبكة اجتماعية عالمية أولًا.
- Marketplace وحدة إعلانات مبوبة وبحث واكتشاف وتواصل مباشر داخل الشبكة، مستلهمة من سهولة OpenSooq دون نسخ علامته أو كوده أو واجهته.
- التجربة الاجتماعية تستفيد من المألوف في Facebook دون نسخ حرفي أو تضليل أو انتهاك ملكية فكرية.
- TIGER لا تتوسط في دفع السلع أو الخدمات بين المستخدمين، ولا تضمن الصفقة ولا تحفظ ثمنها.
- المدفوعات داخل TIGER تخص خدمات الإعلان والرصيد والحملات التي تملكها المنصة فقط.
- النظام الإعلاني الحالي هو One Global Core + Sovereign Country Contracts + Verified Distribution Credits.
- الإسناد التجاري الحالي هو TIGER SOVEREIGN SALES DNA؛ القديم المتعارض لا يعود كـfallback.
- سلطة الهوية اتحادية واحدة؛ لا تُنشأ سلطة كلمات مرور محلية موازية.

## 3.1 TIGER SYNAPSE User Intent — نية المستخدم

نية المستخدم `OWNER APPROVED` ولا يجوز نسيانها، لكن الحقيقة الحالية `NOT ACTIVE IN RUNTIME` حتى يثبت الكود والاختبار والدليل تفعيلها.

المسار الملزم:

`Intent Capture → Consent → Normalize → Explainable Match → Safe Action → Evidence`

قواعد التفعيل:

- المستخدم هو صاحب النية؛ يستطيع رؤيتها وتعديلها وإيقافها ومسحها.
- الإشارات الصريحة أولًا: ما يكتبه المستخدم، البحث، الفلاتر، اختيار هدف المنشور/الإعلان، والمتابعة التي يطلبها بنفسه.
- التحويل يكون إلى descriptor محدود ومفسر، لا ملف نفسي سري ولا ادعاء قراءة أفكار.
- الذاكرة المؤقتة هي الأصل؛ أي حفظ عابر للجلسات يحتاج غرضًا ومدة وموافقة ومسحًا واضحًا.
- المطابقة تعرض `why this` وتسمح بالرفض والتصحيح.
- نية المستخدم لا تمنح role أو permission، ولا تتجاوز RLS، ولا تفك الحظر أو الخصوصية.
- لا تتخذ قرارًا ماليًا أو أمنيًا أو قانونيًا نهائيًا.
- لا تستخدم خصائص حساسة للاستهداف إلا بعقد قانوني وموافقة وسياسة دولة مثبتة.
- أول تفعيل آمن يبدأ بعقد pure/typed للنية، ثم Composer والبحث والـFeed وMarketplace، ثم التحقق server-side والقياس والخصوصية.
- إذا غابت الثقة أو الموافقة أو صلاحية البيانات فالحالة `NO_INTENT / FAIL_CLOSED`.

## 4. قاعدة «نحن فن احتراف»

المعيار ليس كثرة الشعارات. الاحتراف يعني:

- قرار يمكن تفسيره.
- كود صغير الحدود.
- فشل مغلق.
- اختبار يعيد إنتاج الخطر.
- دليل يمكن تدقيقه.
- تشغيل يمكن استعادته.
- تكلفة يمكن قياسها.
- واجهة راقية وسهلة وميسّرة.
- قيادة وإدارة ومالية تحكمها سجلات غير قابلة للالتباس.

تُرفض أرقام الأداء والأمان والتكلفة التي لم تُقَس في بيئة معرّفة.

## 5. نموذج أمن «الحرباية» المشروع

المقصود بالحرباية دفاع تكيفي، لا هجوم مضاد ولا خداع غير قانوني. النظام يغيّر مستوى الحماية بحسب المخاطر:

`NORMAL → ELEVATED → CHALLENGED → RESTRICTED → QUARANTINED → RECOVERING`

الإشارات الممكنة: فشل التحقق، replay، معدل الطلب، سمعة الجهاز/الجلسة، تغيرات جغرافية غير معتادة، إساءة API، عبث artifact، سلوك scraping، وسلامة الحساب.

الاستجابات: rate limits أدق، step-up authentication، تقليل الصلاحيات، إبطال جلسة، تدوير capability، عزل job/file، حظر endpoint، تنبيه مدقق، أو kill switch محدود.

ممنوع:

- hack-back أو إتلاف جهاز المهاجم.
- جمع بصمة خفية بلا أساس قانوني وموافقة لازمة.
- اتخاذ قرار مالي/أمني نهائي من AI وحده.
- إخفاء فشل أمني من السجل.

## 6. صعوبة الاختراق والوصول الداخلي

لا يوجد نظام يُوصف بأنه «غير قابل للاختراق»، ولا يجوز قول «صفر ثغرات». البناء المقبول يجعل الاختراق أصعب، أثره أصغر، واكتشافه واستعادته أسرع.

قواعده:

- نفترض أن المتصفح وجهاز العميل قابلان للفحص والتعديل.
- لا يوجد secret أو service-role key أو private signing key في HTML/JS/Storage/Logs.
- minification أو obfuscation عائق نسخ فقط وليسا حدًا أمنيًا.
- الأسرار والقرارات الحساسة والصلاحيات تبقى server-side.
- RLS وFORCE RLS وbounded RPCs وleast privilege هي الحواجز الفعلية.
- كل object حساس يعاد تفويضه عند القراءة والفعل؛ معرفة ID لا تمنح الوصول.
- tokens قصيرة العمر، audience-bound، قابلة للإبطال، ولا تُطبع في السجلات.
- idempotency وnonce وreplay denial وgeneration fencing واجبة عند الحدود المناسبة.
- CSP وTrusted Types وSRI/asset integrity وsecure headers تمنع فئات من العبث في الويب حيث يدعمها المسار.
- build once، SBOM، provenance، artifact digest، exact-SHA promotion.
- فصل Dev وStaging وProduction بالبيانات والأسرار والتخزين والـqueues والـanalytics.
- logs/metrics/traces/audit لا تحمل أسرارًا أو محتوى خاصًا بلا ضرورة.

شرط الإطلاق الأمني:

- `P0 = 0`
- `P1 = 0`
- `Critical = 0`
- `High = 0`

المقصود لا Critical/High غير مقبول أو غير mitigated وفق سياسة موثقة.

## 7. حماية الصور ولقطات الشاشة

الحقيقة التقنية الملزمة: **لا توجد حماية تمنع التصوير بنسبة 100%** بعد ظهور المحتوى على شاشة يملكها المستخدم؛ الكاميرا الخارجية، جهاز آخر، صلاحيات نظام التشغيل، أو جهاز مخترق يمكنه التقاط ما يراه الإنسان.

لذلك يُمنع ادعاء `منع التصوير 100%`.

طبقات تقليل التسريب:

1. أقل محتوى لازم، مع redaction افتراضي للخاص والحساس.
2. صلاحية قصيرة للروابط والـcapabilities وعدم جعل URL سرًا دائمًا.
3. watermark شخصي ديناميكي للعرض الحساس يتضمن معرفًا مستعارًا ووقتًا/جلسة دون كشف PII زائد.
4. watermark غير ثابت موضعيًا لرفع تكلفة القص الآلي.
5. تصنيف `PUBLIC / PRIVATE / SENSITIVE / SECURITY` وسياسة عرض لكل فئة.
6. إخفاء/طمس المحتوى عند الخلفية أو فقدان التركيز حيث تسمح المنصة.
7. منع النسخ/السحب والقائمة السياقية كعائق UX فقط، وليس كحماية أمنية.
8. Android `FLAG_SECURE` وواجهات iOS الحساسة عند وجود تطبيق Native فعلي؛ لا تُدّعى على PWA.
9. إشعار قانوني وموافقة وسياسة إساءة واستجابة بلاغات.
10. canary/honey watermark قانوني ومحدود لكشف مصدر تسريب، من دون بيانات خفية مضللة.
11. مراقبة scraping/download anomalies مع rate limits وحظر قابل للتدقيق.
12. اختبار أن الـthumbnail، Realtime، cache، logs، push، وBy-ID لا تسرب أصلًا خاصًا.

أي DRM أو screenshot API أو منع browser shortcut لا يُعامل ضمانًا.

## 8. أقل تكلفة تشغيلية صحيحة

- Static/CDN-first للسطح العام.
- Managed PostgreSQL/Supabase هو السلطة الدائمة الحالية.
- serverless/managed workers عند ثبوت الحاجة، مع scale-to-zero إن أمكن.
- لا Kubernetes أو Kafka أو multi-cloud أو active-active بلا قياس يثبت الحاجة.
- ذاكرة/cache عامة قصيرة ومحدودة فقط؛ لا cache خاص أو سلطة جلسة موازية.
- budgets وquotas وalerts وkill switches لكل مزود مرتفع الكلفة.
- S3-compatible lifecycle وderivatives مضبوطة ومنع تخزين نسخ غير لازمة.
- قياس cost per active user / request / GB / notification / verified campaign unit.
- لا شراء مزود أو التزام مالي غير محدود لإغلاق بوابة Repository.
- تحسين التكلفة لا يضعف RLS أو backup أو audit أو recovery.

## 9. بوابات التنفيذ الملزمة

الترتيب:

1. Gate 2 — Media Security Boundary.
2. Gate 3 — Messaging / Realtime.
3. Gate 4 — Notification Intelligence.
4. Gate 5 — Adaptive Network Fabric.
5. Gates 6–7 — Exact-SHA Staging + Dual Device Reality Lab.
6. Gate 8 — Identity Fortress.
7. Gate 9 — Marketplace Integrity.
8. Gate 10 — Financial Atomicity للحملات والإعلانات فقط.
9. Gate 11 — Global Resilience / AWS / WAF / Backup / DR.
10. Gate 12 — Observability / Owner Command Center.
11. Gate 13 — Legal / Country Activation.
12. Gate 14 — Load / Stress / Chaos / Security / Release.

لا تُبدأ بوابة فوق dependency حمراء. يمكن تجهيز تصميم/اختبار بوابة لاحقة، لكن لا يُدّعى إغلاقها.

## 10. الأختام الثمانية

### Product Seal

Social، Messaging، Media، Notifications، Marketplace، Search، Campaigns، Country، PWA تعمل End-to-End بلا زر وهمي أو Mock في مسار Production.

### Security Seal

Zero Trust، الهوية، RLS، abuse controls، secrets، supply chain، threat model، scans، وpentest ضمن سياسة القبول.

### Financial Seal

Ledger دقيق وappend-only، idempotency، Sales DNA، campaign credits، refunds/chargebacks/reconciliation، ومنع double spend.

`Payment Provider = Ledger = Credits = Verified Consumption`

أي فرق مالي غير مفسر يحجب الإطلاق.

### Reliability Seal

Cursor، Local-First، Offline/Retry، reconciliation، backpressure، graceful degradation، load/chaos، backup/restore وRPO/RTO المقاس.

### Data & Legal Seal

Classification، retention، secure deletion، lineage، privacy، consent، export/delete، وعقد تفعيل دولة.

### Supply Chain & Release Seal

`Git SHA → Tests → Security → SBOM → Artifact Digest → Migration Set → Staging Evidence → Release Passport → Canary → Production`

لا rebuild غير موثق بين Staging وProduction.

### Operations Seal

Logs، Metrics، Traces، Audit، SLI/SLO، Error Budget، Alerts، Runbooks، Service Catalog، Asset Inventory، Owner Command Center، وkill switches محمية.

### Sovereign Launch Seal

لا إطلاق قبل:

- `P0 = 0`
- `P1 = 0`
- `Critical = 0`
- `High = 0`
- `Financial Difference = 0`
- `Unknown Production Assets = 0`
- Staging/Android/iPhone/Weak Network/Load/DR/Release Passport/Canary = PASS.

## 11. الاستمرارية وعدم النسيان

كل جلسة تبدأ:

`READ → VERIFY → PLAN → EXECUTE → VERIFY → CHECKPOINT → CONTINUE`

كل قرار يُسجل مع:

- requirement id.
- owner authority.
- status.
- affected files.
- code/test/rehearsal.
- evidence location.
- exact SHA external binding.
- dependencies.
- rollback/forward recovery.
- blockers.

سجل المصدر يحفظ النص كما ورد، لكنه لا يصبح سلطة runtime. المرجع الحالي يلخص القرار الملزم ويشير إلى المصدر دون تكرار سلطات متعارضة.

## 12. المعايير الخارجية والرادار

Crosswalk المطلوب:

`Standard Requirement → TIGER Control → Code → Test → Evidence → Exact SHA`

baseline المعتمد يتتبع OWASP ASVS، NIST CSF، SLSA، WCAG 2.2 AA، وcrypto inventory/agility. الإصدارات تُتحقق عند بوابة الإصدار ولا تُعامل أبدية.

TIGER Technology Radar يُراجع كل 3–6 أشهر: EOL، الثغرات، runtimes، browsers/mobile، cloud، standards، AI security، PQC/crypto agility، القوانين، والتكلفة. التغيير يحتاج دليلًا، لا حماسًا.

## 13. حاجز Production

هذا الدستور لا يجيز وحده:

- الدمج إلى main.
- تطبيق migration على Production.
- تفعيل أسرار مزود.
- إرسال Push حقيقي.
- دفع مال حقيقي.
- نشر عالمي.
- حذف بيانات أو تاريخ Git أو DNS أو credential.

التنفيذ الخارجي يحتاج شروط بوابته ودليله وصلاحيته الخاصة.

## 14. العبارة النهائية

> **TIGER لا تدّعي الكمال؛ TIGER تبني سلطة واحدة، حدودًا صغيرة، دفاعًا تكيفيًا، دليلًا مطابقًا، واستعادةً مجرّبة. نحن نصنع فن الاحتراف عندما تكون كل كلمة قابلة للعودة إلى كود واختبار ودليل.**

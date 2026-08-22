# VVIP TIGER — مرجع المالك الحالي

> **هذه الوثيقة هي المرجع البشري الوحيد للحالة الحالية للمشروع.**
> الحقيقة التنفيذية النهائية هي ملفات GitHub الحالية + الـexact SHA/tree + أدلة CI المطابقة لنفس الـSHA.
> أي وثيقة أخرى أو تقرير أو Ledger أو محادثة أو Archive هو **Evidence فقط** ولا يملك سلطة تغيير هذه الوثيقة أو الـruntime.
> مدخل المالك الدائم للعودة إلى هذه الحقيقة هو `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`، وهو فهرس توجيهي لا سلطة موازية.

## 0. مؤشر التنفيذ الحالي — Final Release Closure

- **العمل الحالي:** PR #320 على الفرع `feat/final-release-closure-20260822`، فوق مسار ONE FIELD/Social convergence، وليس فوق `main` أو Production مباشرة.
- **السلطة الدستورية الحالية:** `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` + قرارات المالك الحالية؛ وأي PR أو SHA تاريخي هو Evidence فقط ولا يملك حق إحياء منطق متعارض.
- **حد المنصة الملزم:** `DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`.
- **النموذج الثلاثي الملزم:** `SHARE = DISTRIBUTE`، و`••• = CONTROL`، و`CONTACT = HANDOFF → TIGER STOPS`.
- **قاعدة Capability → UI:** أي إجراء غير منفذ بعقد runtime/authorization/policy حقيقي لا يظهر كزر حي أو disabled أو coming-soon؛ غياب القدرة يعني غياب الزر.
- **قاعدة المال:** مالية TIGER الحالية تخص الإعلان/أرصدة وحملات الإعلان والخدمات المملوكة للمنصة فقط، ولا تعتمد على حدوث صفقة خارجية أو نجاحها أو قيمتها.
- **حظر الصفقة الخارجية:** لا تفاوض أو اتفاق أو Order/Checkout أو تحصيل قيمة الصفقة أو Escrow أو Fulfillment أو Shipping أو Settlement أو ضمان أو عمولة على قيمة الصفقة أو Success Fee.
- **S1 exact implementation checkpoint التاريخي:** `794de87b2055b9dddf8dfbdbc366d83ba122b1b0`؛ شجرتها `cae245647b50e2cc9c88fc08427cf560add16219`؛ `VVIP Quality Gate #2096 = PASS` و`TIGER Social DB Rehearsal #497 = PASS` على نفس الـSHA؛ LC03 #760 وLC04 #555 وLC05 #528 وLC06 #526 = PASS.
- **حالة S1 التاريخية:** `VERIFIED` على checkpoint أعلاه؛ لا يمثل الرأس الحالي، و`main` وProduction لم يتغيرا بسببه.
- **S2 exact implementation checkpoint التاريخي:** `cf78f57721c008e866160ee2c55b883d7daabb59`؛ شجرتها `c826496c3e5be9c1b64c6c97230ccb559654613e`؛ `VVIP Quality Gate #2098 = PASS` و`TIGER Social DB Rehearsal #499 = PASS` على نفس الـSHA؛ LC03 #762 وLC04 #557 وLC05 #530 وLC06 #528 = PASS.
- **حالة S2 التاريخية:** `VERIFIED` على checkpoint أعلاه؛ لا يمثل الرأس الحالي، و`main` وProduction لم يتغيرا بسببه.
- **V0 exact implementation checkpoint التاريخي:** `4bc6252bbc217b4a65a0bdd54c8756b4b5a4ffee`؛ شجرتها `d42f0a8176d368e6de8e873dd795356108da7942`؛ `VVIP Quality Gate #2071 = PASS` و`TIGER Social DB Rehearsal #465 = PASS` على نفس الـSHA.
- **حالة S0 التاريخية:** `VERIFIED` على checkpoint أعلاه؛ لا يمثل الرأس الحالي، و`main` وProduction لم يتغيرا بسببه.
- **حالة الرأس الحالي (دالة fail-closed):** تكون `VERIFIED` **إذا وفقط إذا** نجحت الأدلة المطلوبة على رأس PR الحالي نفسه وشجرته نفسها؛ وفي غير ذلك تكون `IN_PROGRESS` أو `BLOCKED`. رأس PR الحالي وشجرته وقرار الحالة يُستمدّون حصراً من GitHub exact-head CI attestations خارج هذه الوثيقة، ولا يُستنتج `VERIFIED` من هذه الوثيقة أو من SHA تاريخي.
- **نقطة دليل تنفيذ Social Core من Task 7:** `9f2dce40b352f67d80c81b60515442c860c58048`؛ **شجرتها:** `85ca87aa64714b3cac3a73ac0beefeb7e9df26fd`. هذه نقطة evidence تاريخية وليست رأس PR الحالي ولا قرار التحقق النهائي للوثائق.
- **دليل الاختبارات المركزة للتعليقات/الردود التاريخي:** `109/109 PASS`، بلا fail أو skipped أو todo.
- **TIGER Social DB Rehearsal التاريخي:** `PASS` على نقطة Task 7 نفسها (التشغيل البعيد #103).
- **VVIP Quality Gate التاريخي:** `PASS` على نقطة Task 7 نفسها (التشغيل البعيد #1474)؛ والتحقق المحلي المعزول الكامل `VVIP_QUALITY_GATE=PASS`. لا يغني أيٌّ من ذلك عن attestations الرأس الحالي.
- **هوية المنتج الحالية:** `SOCIAL_NETWORK_FIRST` مع انتشار سوقي `GLOBAL_FIRST`؛ Marketplace وPulse وحدتان داخل المنتج، وMarketplace سطح اكتشاف/اتصال لا محرك صفقة.
- **سلطة المنتج الحالية:** `docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` ضمن precedence الأحدث في `OWNER_AUTHORITY_REGISTRY.md`.
- **سلطة الإعلان المدفوع الحالية:** `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`؛ النشر العادي المتوافق مجاني، وتمويل الإعلان منفصل عن قيمة/نتيجة أي صفقة خارجية.
- **Sales DNA التاريخي:** أي صياغة عامة تربط TIGER بقيمة "عملية بيع" أو عمولة نتيجة صفقة خارجية هي `HISTORICAL_EVIDENCE_ONLY`/`SUPERSEDED` ولا تملك Runtime Authority. أي مفهوم مالي حالي يجب أن يقتصر على خدمات الإعلان والمنصة المملوكة لـTIGER.
- **الواجهة الحالية:** TIGER Social Home مع Header مضغوط، تبويبات اجتماعية، Composer، ومنشورات وتفاعلات اجتماعية مألوفة مع هوية TIGER مستقلة؛ الميزات غير المنفذة لا تقدم كأزرار وهمية.
- **الرؤية الابتكارية المعتمدة:** **TIGER SYNAPSE v2** — Temporal Intent Operating System يوحّد النية اللحظية، المطابقة القابلة للتفسير، إثبات الحاضر، الكشف المتبادل، والتواصل المباشر داخل Living Surface واحدة، مع بقاء Contact Handoff حدًا نهائيًا لدور TIGER في الصفقات الخارجية.
- **نسيج السلطة والإثبات المعتمد:** **TIGER VERITY FABRIC** — Authority Graph + Hermetic Build Core + Release DNA/Proof Root + Typed P01–P20 Evidence + Fresh Runtime Witnesses.
- **مرجع SYNAPSE الحالي:** `docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md` في نطاقه غير المتعارض مع قرارات المالك الأحدث.
- **حالة SYNAPSE:** `APPROVED / PARTIALLY IMPLEMENTED` وفق الأدلة المنفذة؛ لا يجوز تحويل عناصر غير منفذة إلى UI أو ادعاء جاهزية.
- **حالة VERITY FABRIC:** `APPROVED / PARTIALLY VERIFIED` وفق الأدلة المطابقة للـexact SHA؛ ما لم يثبت على الرأس الحالي يبقى غير مكتمل.
- **قاعدة المالك النهائية:** أحدث قرار `CURRENT_ONLY` يلغي سلطة كل قديم متعارض ويخرجه من المنصة الحالية والحزمة العامة ومسارات التنفيذ؛ الأثر الضروري يبقى `HISTORICAL_ONLY` خارج المنصة بلا أي سلطة.
- **سلطة المعاينة:** لا يُعتمد أي فيديو أو رابط نشر تاريخي أو رابط Pages سابق بوصفه معاينة لهذا العمل.
- **شرط الرابط الصحيح:** Preview مستقل مبني من exact head الخاص بفرع/PR الحالي (حاليًا PR #320)، يعمل على الهاتف، ولا يغيّر `main` أو Production.
- **الحقيقة السلبية:** عدم وجود رابط Preview صحيح أفضل من نشر رابط قديم أو غير مطابق؛ لا يجوز اختلاق الجاهزية أو إعادة استخدام رابط متقاعد.

## 1. هوية المشروع والسلطة

- **المنصة:** VVIP TIGER.
- **المستودع:** `vvipautoparts-blip/TIGER-VVIP`.
- **مدخل المالك الدائم:** `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`.
- **مرجع المالك البشري:** `docs/MASTER_PROJECT_STATE.md` فقط.
- **سجل السلطة الحاكم:** `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`.
- **العقد الآلي المطابق:** `project-control/production-handover/current-authority.v1.json`.
- **وضع المرجعية:** `CURRENT_ONLY`.
- **التاريخ والأرشيف:** أدلة غير تنفيذية وغير مخولة باتخاذ قرار تشغيل.
- **قاعدة القرار:** لا يوجد اعتماد على اسم فرع أو وصف PR وحده؛ الاعتماد يكون على exact commit SHA + exact tree + أدلة تحقق من نفس المصدر.

## 2. وظيفة المنصة وحدودها

VVIP TIGER شبكة اجتماعية عالمية للإعلان والاكتشاف والربط المباشر. وظيفتها الأساسية هي **تقريب المسافة فقط** بين نية المستخدم والجهة أو الشخص أو المحتوى أو الإعلان أو المنتج المدرج أو مقدم الخدمة المناسب.

المسار الدستوري الملزم هو:

`DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`

يتواصل الأطراف بعد الـHandoff ويتفقون ويتعاملون مباشرة وعلى مسؤوليتهم. المنصة ليست وسيطًا أو سمسارًا أو وكيلًا أو ممثلًا أو كفيلًا أو ضامنًا أو حافظةً للأموال أو طرفًا في الصفقة، ولا تتولى التفاوض أو الاتفاق أو السعر أو Order/Checkout أو دفع قيمة الصفقة أو Escrow أو Settlement أو Fulfillment أو التوصيل أو الشحن أو التسليم أو نقل الملكية أو الضمان أو تنفيذ الخدمة أو النزاعات أو التعويض.

لا توجد عمولة على قيمة الصفقة الخارجية ولا Success Fee ولا إيراد مشروط بحدوثها أو نجاحها. مصدر الدخل التشغيلي المعتمد هو خدمات الإعلان والظهور وأرصدة/حملات الإعلان والخدمات المملوكة لـTIGER نفسها فقط. لا يدخل مبلغ صفقة البائع والمشتري أو مقدم الخدمة والمستفيد في نظام TIGER المالي. بنية الأسواق والتسجيل عالمية وليست مرتبطة بدولة واحدة.

النموذج الثلاثي لواجهة التفاعل:

- `SHARE = DISTRIBUTE` — توزيع المحتوى فقط وفق capability/policy حقيقية.
- `••• = CONTROL` — تحكم سياقي بالمحتوى وتفضيلات الاكتشاف، لا مسار صفقة.
- `CONTACT = HANDOFF → TIGER STOPS` — تسليم قناة التواصل ثم انتهاء دور TIGER.

قاعدة الواجهة: `Capability → Authorization/Policy → Runtime Availability → UI`. لا Capability حقيقية = لا زر.

## 3. الـStack التقني المعتمد

### الواجهة العامة

- HTML.
- CSS.
- JavaScript.
- TypeScript في المسارات التي تحتاج typing/typed actions.
- لا يوجد `package.json` جذري يمثل التطبيق كله؛ المشروع Hybrid ولا تُفرض عليه أداة dependency واحدة على جميع الأسطح.

### البيانات والـBackend

- **Database:** Supabase/PostgreSQL.
- **سلطة Schema/Migrations الوحيدة:** `supabase/migrations/`.
- **Supabase Edge Functions:** `supabase/functions/`.
- SQL الخاص باختبارات rehearsal/security يسمح به داخل `tests/sql/` فقط ولا يمثل migration authority.
- لا يسمح بوجود SQL تنفيذي في جذر المستودع.

### Media Finalization

- **المسار:** `services/media-finalizer/`.
- **Runtime:** Node.js 24 داخل AWS Lambda container.
- **Image engine:** `sharp` وفق dependency authority الخاصة بالخدمة.
- الخدمة هي Server-Side Final Gate للوسائط ولا تستبدل HEIC client-local decode.

### CI/CD

- **السلطة:** GitHub Actions.
- **Quality Gate:** `scripts/quality-gate.sh`.
- **Repository Cleanroom:** `tools/vvip_cleanroom.py`.
- **Production artifact builder:** `tools/vvip_public_release.py`.
- الـworkflows تعمل بعقود fail-closed ولا تعتمد على قائمة أسماء feature branches كسلطة دائمة.

## 4. معمارية الـRuntime العامة

- Public runtime يستخدم أقل عدد ممكن من entrypoints والسلطات.
- `tools/vvip_public_release.py` يبني artifact عبر **Exact Allowlist**؛ لا يوجد نشر لجذر المستودع.
- أي ملف غير موجود صراحة في الـallowlist لا يدخل Production artifact.
- `scripts/runtime/vvip-static-delivery.js` هو سلطة تسجيل Service Worker.
- Service Worker المعتمد هو `sw-vvip-static.js` فقط.
- لا يسمح بوجود Firebase/Replit/auto-push binding كمسار نشر أو تشغيل موازٍ.
- لا يسمح بعودة wrapper/rollback/fallback يخلق authority ثانية حول الـruntime السيادي.

## 5. قاعدة البيانات والأمان

- كل تغيير دائم في Schema يمر عبر `supabase/migrations/`.
- Migration versions يجب أن تكون unique عالميًا داخل المسار.
- Local rebuild من migrations هو دليل إلزامي قبل الاعتماد.
- RLS/privileges/security reconciliation تخضع لاختبارات أمنية وإعادة بناء محلية من المصدر.
- Client environment غير موثوق ولا تمنح صلاحية لمجرد نجاح التحقق في الواجهة.
- أي حذف Production data يتطلب classification + retention allowlist + backup proof + dry-run evidence.
- لا يسمح بأمر حذف شامل مبني فقط على `deleted_at` دون سياسة احتفاظ لكل جدول.
- صيانة PostgreSQL تعتمد على evidence للحجم والـbloat؛ العمليات التي تقفل الجداول لا تنفذ كإجراء تنظيف افتراضي.

## 6. HEIC والخصوصية والوسائط

- ملف HEIC الأصلي يبقى محليًا على جهاز المستخدم أثناء decode/transform المعتمد.
- HEIC decode يعمل داخل WASM/Worker وليس كـserver fallback.
- Worker يملك timeout/termination وcrash/OOM recovery.
- Color handling يطبّع الإخراج إلى sRGB وفق pipeline المعتمد.
- Metadata الحساسة مثل EXIF/XMP لا يسمح بتسريبها إلى النسخة النهائية.
- السيرفر يعيد التحقق من magic bytes/MIME/structure/dimensions/metadata/polyglot properties.
- السيرفر يعيد كتابة JPEG/WebP موثوق أو يرفض الملف fail-closed.
- لا يعتبر اسم الملف أو امتداده أو `Content-Type` القادم من Client مصدر ثقة.

## 7. Security Supply Chain

- Current-tree secrets تُفحص داخل Cleanroom/CI.
- Full Git history يملك Gate مستقل: `.github/workflows/zero-residue-full-history.yml`.
- Full-history scanner يستخدم Gitleaks بإصدار مثبت وchecksum مثبت.
- التقرير Redacted ولا يطبع قيمة السر كدليل تشغيلي.
- وجود Secret تاريخي حقيقي يعني: `REVOKE/ROTATE -> VERIFY -> HISTORY REMEDIATION`.
- `git-filter-repo` أو أي history rewrite لا ينفذ تلقائيًا ولا يسبق إبطال credential المتأثر.
- Oversized historical Git objects تدخل نفس Gate وتحتاج معالجة موثقة إذا تجاوزت الحد المعتمد.

## 8. البيئة والتكوين

`/.env.example` هو النموذج الوحيد للقيم المطلوبة ولا يحتوي أسرارًا حقيقية.

المتغيرات العامة الحالية:

- `TIGER_ENVIRONMENT`
- `TIGER_CLERK_PUBLISHABLE_KEY`
- `TIGER_SUPABASE_URL`
- `TIGER_SUPABASE_PUBLISHABLE_KEY`
- `TIGER_DEFAULT_COUNTRY_CODE`
- `TIGER_MEDIA_FINALIZER_URL`

القيم السرية لا تدخل Git ولا Production artifact العام. القيم الخاصة ببيئة Production تأتي من secret/config authority الخاصة ببيئة التشغيل.

## 9. Docker وموارد البناء

- لا يوجد `docker system prune -a --volumes -f` كإجراء Production افتراضي.
- أي prune يقتصر على Runner/بيئة disposable مثبتة الهوية.
- Shared أو Production volumes محمية من blanket prune.
- build/cache cleanup لا يملك صلاحية حذف persistent application data.
- Media Finalizer image يبنى من Dockerfile الخاص بالخدمة ويخضع لفحص artifact/dependency/runtime قبل النشر.

## 10. Third-Party وDNS والهوية

Repository inspection لا يساوي Live Provider inspection. لذلك الحالات التالية تحتاج **LIVE_PROVIDER_EVIDENCE** قبل الإغلاق:

- AWS resources/configuration.
- DNS records وsubdomain ownership.
- TLS/certificate bindings.
- Clerk/identity principals.
- Email provider.
- Messaging provider.
- Analytics provider.
- Error tracking provider.
- External webhooks.
- SSH/service-account/privileged credentials.

أي حذف DNS أو webhook أو credential يحتاج ownership proof وdependency proof قبل التنفيذ.

## 11. Telemetry وLogging

- Production logging لا يسمح بطباعة أسرار أو tokens أو PII بلا ضرورة تشغيلية وقانونية.
- Debug output المباشر يدخل static/runtime scan قبل release.
- Test analytics/error events تعزل عن Production baseline.
- Logs retention وanalytics retention يحددان من مزود الخدمة واحتياجات الأمن والامتثال.
- مستوى logging لا يخفض بشكل أعمى إلى `ERROR` فقط إذا كان ذلك يزيل security/operational observability المطلوبة.

## 12. Production Artifact

الـProduction artifact لا يساوي repository checkout.

المسار المعتمد:

`EXACT SOURCE SHA/TREE -> QUALITY/SECURITY GATES -> EXACT-ALLOWLIST BUILD -> SBOM -> PROVENANCE/ATTESTATION -> SEALED ARTIFACT -> AWS DEPLOY -> RUNTIME EVIDENCE`

شروط artifact:

- build once من exact source.
- لا إعادة بناء غير موثقة بين الاختبار والنشر.
- manifest/checksums قابلة للتحقق.
- CycloneDX SBOM.
- provenance attestation.
- forbidden-production-marker scan.
- لا docs/tests/sql/tools/project-control داخل public artifact.

## 13. AWS Production

AWS هو Production provider المعتمد.

AWS لا يستقبل نسخًا يدوية من ملفات المستودع. التسليم يكون للـsealed artifact الناتج من release authority فقط.

أي AWS deployment يحتاج:

- exact artifact identity.
- environment/config validation.
- least-privilege runtime identity.
- network/TLS/DNS validation.
- health/readiness checks.
- production smoke evidence.
- observability evidence.
- rollback/recovery plan على مستوى Release، من دون إعادة legacy runtime authority.

لا تعتبر المنصة `Global Launch Ready` لمجرد نجاح build أو CI جزئي.

## 14. بروتوكول Zero-Residue — 20 بوابة

العقد الآلي الكامل موجود في `project-control/production-handover/current-authority.v1.json`، وترتيبه ملزم:

1. **P01:** exact source identity وrepository topology.
2. **P02:** runtime stack وauthority inventory.
3. **P03:** dead code/dependency/duplicate analysis.
4. **P04:** routes/APIs/middleware/workers/runtime authority convergence.
5. **P05:** environment/config convergence.
6. **P06:** current-tree secret scan.
7. **P07:** full Git-history secrets وoversized objects.
8. **P08:** DB schema/migrations/RLS convergence.
9. **P09:** DB retention/test-data/seed sanitation.
10. **P10:** storage orphan/media sanitation.
11. **P11:** container/build-cache/local-staging residue control.
12. **P12:** cron/workers/queues/background authority inventory.
13. **P13:** third-party/webhook/sandbox reconciliation.
14. **P14:** DNS/TLS/subdomain-takeover prevention.
15. **P15:** identity/SSH/service-account privileged-access rotation review.
16. **P16:** telemetry/logging/error-tracking/analytics convergence.
17. **P17:** CI/workflow/artifact/cache/release evidence convergence.
18. **P18:** branches/tags/PR/repository governance convergence.
19. **P19:** single current owner authority convergence.
20. **P20:** AWS exact-SHA sealed handover + fresh runtime proof.

كل بوابة `fail_closed=true`. غياب الدليل يعني أن البوابة غير مكتملة، وليس نجاحًا ضمنيًا.

## 15. العمليات المدمرة

العمليات التالية `default_enabled=false`:

- Production database deletion.
- Git history rewrite.
- DNS deletion.
- Credential revocation.
- Docker volume prune.
- Branch deletion.
- Tag deletion.

لا تتحول أي منها إلى Enabled إلا بدليل صريح يثبت النطاق والمالك والاعتماد والنسخة الاحتياطية/الاحتفاظ عند الحاجة.

## 16. Git وPR Governance

- `main` لا يستقبل تغييرات مباشرة تتجاوز الحوكمة.
- PR #261 وPR #262 وPR #271 تمثل طبقات/نقاط تنفيذ تاريخية في تطور الـstack؛ لا تُستخدم أي منها كسلطة current لمجرد رقمها أو نجاح تاريخي سابق.
- **PR #320** هو مسار الإغلاق/convergence الحالي على `feat/final-release-closure-20260822`، مع بقاء exact-head evidence هو الحَكم وليس رقم PR ذاته.
- لا يندمج مسار متعارض مثل PR #313 wholesale؛ أي مادة مفيدة منه يعاد تقييمها وانتقاؤها فقط إذا كانت متوافقة مع سلطة المالك الحالية واختبارات fail-closed.
- branch/tag deletion لا يحدث لمجرد العمر أو الاسم؛ يحتاج merged/stale proof وعدم وجود PR/runtime/release dependency.
- لا يسمح auto-push أو background Git mutation غير خاضع للمراجعة.

## 17. حالة الإطلاق الحالية

**الحالة:** `PRE-PRODUCTION / ZERO-RESIDUE HANDOVER IN PROGRESS`.

**Global Launch Ready:** `NO` حتى تملك P01–P20 أدلة مكتملة ومطابقة للـexact release SHA/artifact، وتنجح protected staging وProduction runtime verification الفعلية، إضافةً إلى أدلة rollback/DR/observability/device/legal المطلوبة.

هذه العبارة Fail-Closed: لا يحولها أي وصف بشري إلى `YES`. التحويل يعتمد على الأدلة التنفيذية فقط.

## 18. تعليمات المالك للمواصلة

أي مهندس أو Agent أو مزود يستلم المشروع يعمل بهذا الترتيب فقط:

`RESOLVE CURRENT REFS -> READ THIS FILE -> READ OWNER_AUTHORITY_REGISTRY -> READ MACHINE CONTRACT -> VERIFY EXACT SHA/TREE -> RUN REQUIRED GATES -> CHANGE ONE AUTHORITY PATH -> VERIFY -> PRODUCE EVIDENCE -> UPDATE THIS CURRENT REFERENCE ONLY WHEN THE CURRENT CONTRACT CHANGES`

لا تُنشأ وثيقة حالة منافسة. لا يُعاد اعتماد مسار تشغيل موازٍ. لا تستخدم وثائق Evidence لتجاوز source code أو CI أو live-provider evidence. وكل منطق خارجي للصفقات يتوقف عند `CONTACT HANDOFF → TIGER STOPS`.
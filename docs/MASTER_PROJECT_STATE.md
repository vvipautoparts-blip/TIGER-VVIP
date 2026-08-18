# VVIP TIGER — مرجع المالك الحالي

> **هذه الوثيقة هي المرجع البشري الوحيد للحالة الحالية للمشروع.**
> الحقيقة التنفيذية النهائية هي ملفات GitHub الحالية + الـexact SHA/tree + أدلة CI المطابقة لنفس الـSHA.
> أي وثيقة أخرى أو تقرير أو Ledger أو محادثة أو Archive هو **Evidence فقط** ولا يملك سلطة تغيير هذه الوثيقة أو الـruntime.
> مدخل المالك الدائم للعودة إلى هذه الحقيقة هو `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`، وهو فهرس توجيهي لا سلطة موازية.

## 0. مؤشر التنفيذ الحالي على فرع Social Core

- **العمل الحالي:** PR #271 على الفرع `feat/tiger-one-living-surface-impl-20260818`، فوق فرع المواصفة وليس فوق `main` مباشرة.
- **حالة S0:** `IN_PROGRESS / BASE-SYNC-AND-OWNER-RECONCILIATION`؛ لا تصبح `VERIFIED` حتى تُنشر المصالحة وتنجح تشغيلات GitHub على الرأس المنشور نفسه.
- **آخر نقطة منشورة قبل هذه المصالحة:** رأس PR #271 هو `df6c898058281e15ead00caec45916a602e34dde` وشجرته `9673d3820355928ac556a81e753ae06e143cbf03`، وقاعدة المواصفة هي `54d7fe33310fc83380ed2fce941b581e91856263`. لا يُنسخ SHA جديد إلى هذه الوثيقة بوصفه ذاتيًا؛ يُقرأ الرأس الحالي من GitHub ويُطابق بأدلة CI.
- **الدليل المحلي الجاري للمصالحة:** اختبارات Social Core + السلطة المركزة `109/109 PASS` بلا skip/todo، واختبار سلطة FUSION وحدود عدم الوساطة `9/9 PASS`، وQuality Gate الكامل على شجرة المصالحة المحلية `VVIP_QUALITY_GATE=PASS`. تبقى نتيجة الرأس البعيد واجبة التجديد بعد نشر المصالحة، ولا تحل الأدلة المحلية محل CI المطابق للـSHA المنشور.
- **حالة CI البعيدة:** الرأس المنشور قبل المصالحة لم يسجل تشغيل `pull_request`. لا تُعامل الحالة بوصفها GREEN حتى ينجح كل من `VVIP Quality Gate` و`TIGER Social DB Rehearsal` على SHA واحد مطابق بعد حل التعارض.
- **هوية المنتج الحالية:** `SOCIAL_NETWORK_FIRST` مع انتشار سوقي `GLOBAL_FIRST`؛ Marketplace وPulse وحدتان داخل المنتج.
- **سلطة المنتج الحالية:** `docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md`.
- **سلطة الإعلان المدفوع الحالية:** `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`؛ النشر العادي المتوافق مجاني.
- **حالة فرع Sales DNA المنفصل:** تمت مراجعته ولم يُدمج في PR #271. صياغته العامة لكل "عملية بيع" ونقص قيد خدمة الإعلان التي تملكها TIGER يتعارضان مع دور المنصة، كما أن Quality Gate لذلك الفرع ليس أخضر؛ يبقى خارج `CURRENT` حتى إعادة تصميمه لخدمات إعلان TIGER فقط وإغلاق فجوات النزاهة والاختبارات.
- **الواجهة الحالية:** TIGER Social Home مع Header مضغوط، تبويبات اجتماعية، Composer، عرض Stories، ومنشورات وتفاعلات اجتماعية مألوفة مع هوية TIGER مستقلة.
- **الرؤية الابتكارية المعتمدة:** **TIGER SYNAPSE v2** — Temporal Intent Operating System يوحّد النية اللحظية، المطابقة القابلة للتفسير، إثبات الحاضر، الكشف المتبادل، والتواصل المباشر داخل Living Surface واحدة.
- **نسيج السلطة والإثبات المعتمد:** **TIGER VERITY FABRIC** — Authority Graph + Hermetic Build Core + Release DNA/Proof Root + Typed P01–P20 Evidence + Fresh Runtime Witnesses.
- **مرجع SYNAPSE الحالي:** `docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md`.
- **حالة SYNAPSE:** `APPROVED / PLANNED / NOT IMPLEMENTED beyond S0`؛ اعتماد الاتجاه لا يعني أن المزايا موجودة في الـruntime أو أن Preview جاهز.
- **حالة VERITY FABRIC:** `APPROVED / PLANNED / NOT IMPLEMENTED beyond existing foundations`؛ تبقى عقود TSRF وF05 والحزم الحالية أساسًا موجودًا، لكنها لا تثبت أن نسيج VERITY الكامل أو Gate Compiler قد نُفذا.
- **قرار المالك المثبت:** اعتمد المالك النسخة المكتوبة لخيار C بتاريخ 2026-08-18؛ أصبحت SYNAPSE v2 + VERITY FABRIC سلطة `CURRENT_ONLY` في نطاقها، مع بقاء التنفيذ `NOT IMPLEMENTED` حتى ظهور أدلة الكود والاختبارات.
- **خطة البرنامج الحالية:** `docs/superpowers/plans/2026-08-18-tiger-synapse-v2-verity-fabric-program-execution.md`.
- **مؤشر التنفيذ الحالي:** `docs/superpowers/plans/2026-08-18-s0-social-comments-quality-gate.md` — مصالحة رأس فرع PR #271 ثم إكمال التعليقات/الردود وإعادة Quality Gate إلى GREEN.
- **ترتيب حماية المالك:** بعد نجاح S0 مباشرة يبدأ V0 لتحويل مرجع المالك وقاعدة إلغاء القديم إلى Authority Graph قابل للتحقق آليًا، قبل توسيع محرك النوايا.
- **قاعدة المالك النهائية:** أحدث قرار `CURRENT_ONLY` يلغي سلطة كل قديم متعارض ويخرجه من المنصة الحالية والحزمة العامة ومسارات التنفيذ؛ الأثر الضروري يبقى `HISTORICAL_ONLY` خارج المنصة بلا أي سلطة.
- **سلطة المعاينة:** لا يُعتمد أي فيديو أو رابط نشر تاريخي أو رابط Pages سابق بوصفه معاينة لهذا العمل.
- **شرط الرابط الصحيح:** Preview مستقل مبني من exact head الخاص بـPR #271، يعمل على الهاتف، ولا يغيّر `main` أو Production.
- **الحقيقة السلبية:** عدم وجود رابط Preview صحيح أفضل من نشر رابط قديم أو غير مطابق؛ لا يجوز اختلاق الجاهزية أو إعادة استخدام رابط متقاعد.

## 1. هوية المشروع والسلطة

- **المنصة:** VVIP TIGER.
- **المستودع:** `vvipautoparts-blip/TIGER-VVIP`.
- **مدخل المالك الدائم:** `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`.
- **مرجع المالك البشري:** `docs/MASTER_PROJECT_STATE.md` فقط.
- **العقد الآلي المطابق:** `project-control/production-handover/current-authority.v1.json`.
- **وضع المرجعية:** `CURRENT_ONLY`.
- **التاريخ والأرشيف:** أدلة غير تنفيذية وغير مخولة باتخاذ قرار تشغيل.
- **قاعدة القرار:** لا يوجد اعتماد على اسم فرع أو وصف PR وحده؛ الاعتماد يكون على exact commit SHA + exact tree + أدلة تحقق من نفس المصدر.

## 2. وظيفة المنصة وحدودها

VVIP TIGER شبكة اجتماعية عالمية تتضمن وحدات للإعلان والاكتشاف والربط المباشر. في Marketplace والخدمات، دور المنصة هو عرض الإعلانات والبحث واكتشاف العروض وتقريب البائع من المشتري ومقدم الخدمة من المستفيد، ثم إتاحة التواصل المباشر بين الأطراف.

يتواصل الأطراف ويتفقون ويتعاملون مباشرة وعلى مسؤوليتهم. المنصة ليست وسيطًا أو سمسارًا أو وكيلًا أو ممثلًا أو كفيلًا أو ضامنًا أو حافظةً للأموال أو طرفًا في الصفقة، ولا تتولى الاتفاق أو السعر أو دفع الصفقة أو تسويتها أو عمولتها أو التوصيل أو الشحن أو التسليم أو نقل الملكية أو الضمان أو تنفيذ الخدمة أو النزاعات أو التعويض.

مصدر الدخل التشغيلي المعتمد حاليًا هو خدمات الإعلان والظهور التي تملكها TIGER نفسها، ومنها Pulse وفق سلطة 3/10/20 JOD. لا يدخل مبلغ صفقة البائع والمشتري أو مقدم الخدمة والمستفيد في نظام TIGER المالي. بنية الأسواق والتسجيل عالمية وليست مرتبطة بدولة واحدة.

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
- PR #261 يمثل طبقة sovereign runtime authority convergence الحالية في الـstack.
- PR #262 يمثل طبقة Zero-Residue Production Handover التابعة لها.
- #262 لا يندمج مباشرة إلى `main`؛ يحافظ على ترتيب الـstack.
- PR #271 يمثل طبقة Social Core الحالية في stack مستقل؛ لا يُقاس بفيديو أو رابط نشر سابق ولا يُقدّم كجاهز قبل GREEN exact-head evidence.
- branch/tag deletion لا يحدث لمجرد العمر أو الاسم؛ يحتاج merged/stale proof وعدم وجود PR/runtime/release dependency.
- لا يسمح auto-push أو background Git mutation غير خاضع للمراجعة.

## 17. حالة الإطلاق الحالية

**الحالة:** `PRE-PRODUCTION / ZERO-RESIDUE HANDOVER IN PROGRESS`.

**Global Launch Ready:** `NO` حتى تملك P01–P20 أدلة مكتملة ومطابقة للـexact release SHA/artifact، وتنجح AWS runtime verification الفعلية.

هذه العبارة Fail-Closed: لا يحولها أي وصف بشري إلى `YES`. التحويل يعتمد على الأدلة التنفيذية فقط.

## 18. تعليمات المالك للمواصلة

أي مهندس أو Agent أو مزود يستلم المشروع يعمل بهذا الترتيب فقط:

`RESOLVE CURRENT REFS -> READ THIS FILE -> READ MACHINE CONTRACT -> VERIFY EXACT SHA/TREE -> RUN REQUIRED GATES -> CHANGE ONE AUTHORITY PATH -> VERIFY -> PRODUCE EVIDENCE -> UPDATE THIS CURRENT REFERENCE ONLY WHEN THE CURRENT CONTRACT CHANGES`

لا تُنشأ وثيقة حالة منافسة. لا يُعاد اعتماد مسار تشغيل موازٍ. لا تستخدم وثائق Evidence لتجاوز source code أو CI أو live-provider evidence.

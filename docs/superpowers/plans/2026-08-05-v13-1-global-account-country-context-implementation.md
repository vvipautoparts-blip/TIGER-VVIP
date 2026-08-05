# V13.1 Global Account Country Context — خطة التنفيذ

**التاريخ:** 2026-08-05  
**المنهج:** TDD، فرع معزول، PR متدرج فوق PR #110، أدلة CI قبل الدمج  
**حالة الإنتاج:** `BLOCKED_PENDING_CONTRACTS_TESTS_EVIDENCE`

## الهدف

تنفيذ الأساس البرمجي لسياق حساب عالمي متعدد الأسواق، مع فصل دولة هوية الحساب عن السوق النشط وعن الحقول المحكومة بالخادم، ومنع أي افتراض تلقائي للأردن أو غيره.

## القيود

- لا تعديل مباشر على `main`.
- لا Migration في هذه الشريحة.
- لا تفعيل دولة إنتاجية.
- لا قيم قانونية أو ضريبية أو استضافة مخترعة.
- لا Dependency جديدة.
- لا عرض لتغيير السوق قبل تأكيد الاستمرارية.
- Fixtures الدول في الاختبارات ليست Country Seals إنتاجية.
- PR #111 يبقى تابعًا لـPR #110 حتى دمج الدستور.

---

## المهمة 1 — إنشاء الفرع والـPR المتدرج

- [x] إنشاء الفرع `feat/v13-1-global-account-country-context-20260805` من Head دستور V13.1.
- [x] فتح PR #111 كمسودة.
- [x] تسجيل الاعتماد الصريح على PR #110.
- [x] تثبيت حدود النطاق: لا Migration ولا تفعيل إنتاجي.

## المهمة 2 — دورة RED الأولى: عقد السياق العالمي

**الملف:**

- `tests/v13-1-global-account-country-context.test.cjs`

**الاختبارات:**

- [x] الوحدات التنفيذية المطلوبة غير موجودة في بداية الدورة.
- [x] لا سوق افتراضي ضمني، بما في ذلك `JO`.
- [x] استقلال `identityCountry` عن `activeMarketCountry`.
- [x] تغيير السوق مع بقاء الحساب ودولة الهوية.
- [x] رفض الدولة غير النشطة أو غير المختومة.
- [x] منع العميل من تعيين `legalEntityCountry` أو `dataResidencyRegion`.
- [x] ثبات Snapshot الإعلان بعد تغيير سوق الحساب.
- [x] قصر التخزين المحلي على Allowlist غير حساسة.
- [x] Fail-Closed عند غياب Backend الإنتاجي.
- [x] عدم كشف Candidate عند فشل الحفظ المحلي.

**دليل RED:**

- [x] تشغيل Node CJS: 101 اختبارًا.
- [x] نجاح 91 اختبارًا سابقًا.
- [x] فشل 10 اختبارات جديدة بسبب غياب الوحدات المقصودة.
- [x] بقاء بقية البوابات سليمة.

## المهمة 3 — GREEN الأولى: الوحدات الأساسية

**الملفات:**

- `scripts/context/v13-country-catalog.js`
- `scripts/context/v13-global-account-context.js`
- `scripts/context/v13-country-context-repository.js`
- `scripts/context/v13-country-context-controller.js`

**التنفيذ:**

- [x] كتالوج دول بحالات V13.1.
- [x] شرط `ACTIVE` مع ختم دولة غير فارغ.
- [x] عقد حساب عالمي immutable.
- [x] منع الحقول المحكومة بالخادم من مدخل العميل.
- [x] سياق معاملة مشتق من السوق المختار.
- [x] Snapshot إعلان immutable.
- [x] مستودع معاينة محلية بAllowlist.
- [x] مستودع إنتاج Fail-Closed.
- [x] Controller يحفظ قبل أن يكشف التغيير.

**دليل GREEN الأولى:**

- [x] Node CJS: 101/101 PASS.
- [x] Python: 27 PASS و4 Subtests.
- [x] Cleanroom: 17 PASS و4 Subtests.
- [x] PR35/PR36: 110/110 PASS.
- [x] Listing Contract: 13/13 PASS.
- [x] Project Control وV13.1 والأمن وQA: PASS.

## المهمة 4 — دورة RED الثانية: حد الإنتاج

**الملف:**

- `tests/v13-1-global-account-country-context-production.test.cjs`

**الاختبارات:**

- [x] إرسال أمر تغيير السوق الإنتاجي مع:

```text
accountId
requestedActiveMarketCountry
expectedRevision
```

- [x] إظهار السياق الجديد بعد تأكيد Backend فقط.
- [x] إبقاء السياق الأصلي عند `REVISION_CONFLICT`.

**دليل RED:**

- [x] Node CJS: 103 اختبارًا.
- [x] نجاح 101.
- [x] فشل الاختبارين الجديدين بـ`PERSISTENCE_UNAVAILABLE`.
- [x] تأكيد أن السبب هو اقتصار الـController على `saveSelection`.

## المهمة 5 — GREEN الثانية: دعم الاستمرارية الإنتاجية

**الملف:**

- `scripts/context/v13-country-context-controller.js`

**التنفيذ الأدنى:**

- [x] اكتشاف `saveSelection` لمسار المعاينة.
- [x] اكتشاف `saveActiveMarket` لمسار الإنتاج.
- [x] إنشاء أمر إنتاج محدود ومجمد.
- [x] استخدام Revision السياق الحالي كـ`expectedRevision`.
- [x] عدم كشف Candidate عند رفض Backend أو فشل الحفظ.
- [x] الحفاظ على توافق الاختبارات المحلية السابقة.

**دليل GREEN الثانية على SHA `1d74f0b511737ed9bb169e5a7b799c62626386f4`:**

- [x] Node CJS: 103/103 PASS.
- [x] اختبار الاستمرارية الإنتاجية: PASS.
- [x] اختبار تعارض Revision: PASS.
- [x] PR35/PR36: 110/110 PASS.
- [x] Listing Contract: 13/13 PASS.
- [x] Python وCleanroom: PASS.
- [x] `GATE_v13_1_authority_integrity=PASS`.
- [x] Secret findings: 0.
- [x] Dangerous SQL: CRITICAL=0 / HIGH=0.
- [x] QA Smoke: PASS.
- [x] Isolated worktree: CLEAN.
- [x] Official workspace: UNCHANGED.

## المهمة 6 — توثيق العقد

- [x] كتابة وثيقة التصميم.
- [x] كتابة خطة التنفيذ والأدلة.
- [x] توضيح الفرق بين Fixtures الاختبارية والأختام الرسمية.
- [x] توضيح أن Backend وMigration وRLS مؤجلة.
- [x] توضيح خطة الرجوع.

## المهمة 7 — التحقق النهائي على Head التوثيق

- [ ] VVIP Quality Gate: SUCCESS.
- [ ] Node CJS: 103/103 PASS.
- [ ] Project Control Integrity: SUCCESS.
- [ ] Dependency Review: SUCCESS.
- [ ] CodeQL: SUCCESS.
- [ ] Secret findings: 0.
- [ ] Dangerous SQL: CRITICAL=0 / HIGH=0.
- [ ] Isolated worktree: CLEAN.
- [ ] Official workspace: UNCHANGED.

لا تُحوّل هذه الخانات إلى مكتملة إلا بعد نتيجة GitHub Actions على آخر SHA الذي يتضمن الوثائق.

## المهمة 8 — تجهيز PR للمراجعة

- [ ] تحديث وصف PR #111 بنتيجة RED→GREEN النهائية.
- [ ] إبقاء PR كمسودة ما دام PR #110 غير مدمج.
- [ ] بعد دمج #110: إعادة ضبط Base/تحديث الفرع عند الحاجة وتشغيل CI من جديد.
- [ ] تحويل PR إلى Ready فقط بعد نجاح Head النهائي وعدم وجود تعارض.
- [ ] عدم الدمج دون المراجعة المطلوبة وحماية الفرع.

## الشرائح المؤجلة

1. تصميم Schema دائم للحساب العالمي وسياقات الدولة.
2. Migration مستقلة مع RLS وقيود Server-Controlled.
3. RPC/API غير متزامن لتغيير السوق مع optimistic concurrency وAudit.
4. Country Seal رسمي للأردن بعد المدخلات القانونية والضريبية والاستضافة.
5. ربط واجهة اختيار السوق.
6. ربط إنشاء الإعلان بالـSnapshot الدائم.
7. ربط الفوترة والضريبة والعملة بختم الدولة.
8. خطة ترحيل البيانات القديمة دون افتراض `JO`.

## خطة الرجوع

- Revert كامل لـPR #111.
- لا توجد Migration تحتاج Down Migration.
- لا توجد بيانات إنتاجية أو أختام دول رسمية أُنشئت في هذه الشريحة.
- لا يوجد تغيير في `main` قبل الدمج.

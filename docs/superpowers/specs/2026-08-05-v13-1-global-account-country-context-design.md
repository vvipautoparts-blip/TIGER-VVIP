# VVIP TIGER V13.1 — تصميم سياق الحساب العالمي والدول

**التاريخ:** 2026-08-05  
**الحالة:** CONTRACT_FIRST_RUNTIME_FOUNDATION  
**الاعتماد:** دستور V13.1 في PR #110  
**فرع التنفيذ:** `feat/v13-1-global-account-country-context-20260805`

## 1. الهدف

إنشاء طبقة تنفيذية صغيرة وقابلة للاختبار تمنع خلط هوية الحساب بالسوق الذي يعمل فيه المستخدم، وتؤسس لعقود الدولة والفوترة والضريبة وإقامة البيانات دون اختراع قيم إنتاجية أو تنفيذ Migration مبكرة.

هذه الشريحة لا تفعّل دولة، ولا تربط Backend حقيقيًا، ولا تعدّل قاعدة البيانات. وظيفتها تثبيت الحدود البرمجية التي يجب أن تستهلكها الشرائح اللاحقة.

## 2. المبادئ الحاكمة

1. الحساب عالمي واحد ولا يُنشأ حساب مستقل لكل دولة.
2. `identityCountry` يمثل دولة هوية/تسجيل الحساب، ولا يفرض السوق النشط.
3. `activeMarketCountry` اختيار صريح ومستقل، ولا يحصل على قيمة افتراضية ضمنية، بما في ذلك `JO`.
4. لا يقبل السوق النشط إلا دولة حالتها `ACTIVE` ولها `countrySealVersion` غير فارغ.
5. `legalEntityCountry` و`dataResidencyRegion` حقول محكومة بالخادم ولا يجوز للعميل تعيينها.
6. السعر والعملة وختم الدولة في سياق المعاملة تُشتق من السوق النشط المعتمد.
7. إعلان جديد يلتقط Snapshot ثابتًا لسوقه؛ تغيير السوق لاحقًا لا يعيد تصنيف الإعلان القديم.
8. أي غياب أو فشل في Backend الإنتاجي يؤدي إلى Fail-Closed، ولا يُعرض تغيير غير محفوظ للمستخدم.
9. التخزين المحلي مخصص للمعاينة الآمنة فقط ويحتوي Allowlist غير حساسة.
10. لا تُعد هذه الشريحة دليلًا على جاهزية الإنتاج أو اكتمال ختم الأردن أو أي دولة أخرى.

## 3. نموذج السياق

### 3.1 حقول الحساب

```text
schemaVersion
constitutionId
accountId
identityCountry
activeMarketCountry
legalEntityCountry
dataResidencyRegion
transactionContext
revision
createdAt
updatedAt
```

### 3.2 سياق المعاملة

لا ينشأ `transactionContext` قبل اختيار سوق نشط صالح. وعند إنشائه يتضمن:

```text
marketCountry
currency
countrySealVersion
```

لا تحتوي هذه الطبقة على معدل ضريبة أو سعر إعلان أو كمية ظهور؛ هذه القيم يجب أن تأتي لاحقًا من ختم الدولة المعتمد، وفق دستور V13.1.

### 3.3 Snapshot الإعلان

```text
schemaVersion
constitutionId
listingId
marketCountry
currency
countrySealVersion
accountContextRevision
capturedAt
```

الـSnapshot كائن immutable، ويحتفظ بدولة السوق والعملة وإصدار الختم كما كانت لحظة إنشاء الإعلان.

## 4. كتالوج الدول

الحالات المعتمدة في العقد:

```text
DRAFT
LEGAL_APPROVED
TAX_CONFIGURED
ACTIVE
SUSPENDED
```

الدولة لا تصبح قابلة للاختيار كسوق لمجرد وجودها في الكتالوج. يلزم تحقق الشرطين:

```text
activationState = ACTIVE
countrySealVersion != null/empty
```

الأسماء والعملات وأختام الدول المستخدمة في الاختبارات Fixtures غير إنتاجية ولا تمثل موافقة قانونية أو ضريبية.

## 5. حدود الثقة

### 5.1 مدخلات العميل المسموحة

عند إنشاء سياق الحساب يقبل العميل فقط الحقول اللازمة لهوية الحساب واختيار السوق، ولا يقبل حقول السلطة الخلفية.

### 5.2 الحقول المحكومة بالخادم

```text
legalEntityCountry
dataResidencyRegion
billingCountry
taxCountry
```

يرفض العقد أي محاولة لإرسال هذه الحقول ضمن مدخل العميل برسالة:

```text
UNTRUSTED_SERVER_CONTROLLED_FIELD
```

### 5.3 عدم التخمين

لا تُستخدم لغة المتصفح أو عنوان IP أو موقع الجهاز لإسناد سوق نشط تلقائيًا. يمكن لاحقًا استعمالها كاقتراح واجهة فقط، لكن القرار يظل صريحًا ويخضع للتحقق والحفظ.

## 6. طبقة الاستمرارية

### 6.1 مستودع المعاينة المحلية

يحفظ فقط:

```text
schemaVersion
identityCountry
activeMarketCountry
revision
updatedAt
```

ولا يحفظ:

- `accountId`.
- البريد أو رموز الجلسة.
- الكيان القانوني.
- إقليم إقامة البيانات.
- دولة الفوترة أو الضريبة.
- أي مفتاح أو سر أو بيانات اعتماد.

المفتاح المحلي:

```text
vvip:v13:country-context-selection:v1
```

أي Payload يحتوي حقولًا إضافية أو صيغة غير صحيحة يُرفض ويُزال Fail-Closed.

### 6.2 مستودع الإنتاج

واجهة الإنتاج في هذه الشريحة Contract فقط:

```text
loadContext(accountId)
saveActiveMarket({
  accountId,
  requestedActiveMarketCountry,
  expectedRevision
})
```

يستخدم `expectedRevision` للتحكم المتفائل بالتزامن. لا تُقبل نتيجة Backend غير مؤكدة، ولا يُعامل Promise على أنه نجاح ضمن هذا الحد المتزامن المؤقت.

تنفيذ النقل غير المتزامن، المصادقة، RLS، RPC، Audit الدائم، وقاعدة البيانات مؤجل إلى PR مستقل.

## 7. سلوك الـController

التسلسل الإجباري لتغيير السوق:

1. التحقق من العقد والكتالوج والمستودع.
2. إنشاء Candidate immutable عبر عقد السياق.
3. حفظ Candidate في مستودع المعاينة، أو إرسال أمر إنتاجي محدود للمستودع الإنتاجي.
4. عند تأكيد الحفظ فقط، إعادة السياق الجديد.
5. عند أي رفض أو تعارض أو فشل، إعادة السياق الأصلي نفسه دون كشف Candidate.

يدعم الـController حدين صريحين:

- `saveSelection(candidateContext)` للمعاينة المحلية.
- `saveActiveMarket(command)` للإنتاج.

## 8. الملفات التنفيذية

```text
scripts/context/v13-country-catalog.js
scripts/context/v13-global-account-context.js
scripts/context/v13-country-context-repository.js
scripts/context/v13-country-context-controller.js
tests/v13-1-global-account-country-context.test.cjs
tests/v13-1-global-account-country-context-production.test.cjs
```

الوحدات بصيغة UMD/CommonJS حتى تعمل في اختبارات Node ويمكن ربطها لاحقًا بواجهة المتصفح دون إدخال Dependency جديدة.

## 9. ما هو خارج النطاق

- أي Migration أو تعديل Schema.
- إنشاء جدول حسابات أو سياقات دول في Supabase.
- تفعيل الأردن أو الإمارات أو غيرهما إنتاجيًا.
- تحديد ضرائب أو أسعار أو كميات ظهور.
- تحديد مكان استضافة فعلي.
- تحويل Fixtures الاختبارية إلى Country Seal رسمي.
- ربط واجهة المستخدم النهائية.
- تنفيذ API/RPC غير متزامن.
- ترحيل الإعلانات القديمة.

## 10. الأمن والرجوع

- Default deny للسوق غير النشط أو غير المختوم.
- Fail-Closed عند غياب Backend.
- Allowlist صارمة للتخزين المحلي.
- كائنات السياق والـSnapshot مجمدة.
- عدم كشف التغيير قبل تأكيد الاستمرارية.
- يمكن الرجوع عن الشريحة كاملة عبر Revert للـPR؛ لا توجد Migration أو بيانات إنتاجية مرتبطة بها.

## 11. معيار القبول

تُقبل الشريحة عندما تثبت الاختبارات الآتية:

- عدم وجود سوق افتراضي ضمني.
- استقلال دولة الهوية عن السوق.
- بقاء الحساب نفسه عند تغيير السوق.
- رفض الدولة غير النشطة أو غير المختومة.
- منع العميل من تعيين حقول السلطة الخلفية.
- ثبات Snapshot الإعلان.
- قصر التخزين المحلي على Allowlist.
- فشل الإنتاج مغلقًا عند غياب Backend.
- تمرير أمر الإنتاج مع `expectedRevision`.
- الاحتفاظ بالسياق الأصلي عند رفض الحفظ.
- نجاح Quality Gate وProject Control وDependency Review وCodeQL على Head النهائي.

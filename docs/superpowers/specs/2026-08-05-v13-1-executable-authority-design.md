# VVIP TIGER V13.1 Executable Authority Design

## 1. السلطة

هذه الوثيقة تحول V13.1 وقرارات المالك النهائية بتاريخ 2026-08-05 إلى عقود واختبارات قابلة للتنفيذ.

ترتيب السلطة:

1. قرار المالك النهائي الأحدث.
2. `project-control/v13.1/contracts/owner_constitution.json`.
3. اختبارات V13.1 والمدقق Fail-Closed.
4. سجل التعارضات وManifest البصمات.
5. عقود الدول والقطاعات وواجهات Runtime.
6. الوثائق التاريخية وملفات Word.

أي حكم قديم متعارض يصنف `SUPERSEDED_BY_V13_1_OWNER_FINAL` ولا يبقى فعالًا بصمت.

## 2. القرارات النهائية

### 2.1 وسائط الإعلان

- الحد العالمي النهائي: **7 صور لكل إعلان**.
- لا زيادة صور بسبب الدفع أو الباقة أو نوع الحساب.
- الفيديو غير مفعّل حاليًا.

### 2.2 الظهور

- `global_fixed_impressions = null`.
- 250 و400 وأي رقم عالمي ثابت ممنوع.
- كمية الظهور وسعره يحددان داخل ختم الدولة فقط.

### 2.3 الدردشة والتوصيل والوساطة

القدرات الثلاث:

- متاحة لجميع المستخدمين.
- لا تحتاج موافقة المالك أو الشركاء.
- لا تحتاج منحة فردية.
- تخضع لضوابط الأمن والخصوصية والحالات التشغيلية المعتادة عند تنفيذ Runtime، من دون تحويل هذه الضوابط إلى موافقات وصول.

العقد الملزم لكل قدرة:

```json
{
  "availability_policy": "FULL_GENERAL_AVAILABILITY",
  "access_scope": "ALL_USERS",
  "owner_or_partner_grant_required": false,
  "user_self_access_allowed": true
}
```

### 2.4 التحويل إلى واتساب

واتساب ليس خدمة مراسلة داخل VVIP TIGER. الوظيفة الوحيدة هي فتح تطبيق واتساب المثبّت على جهاز المستخدم بواسطة رابط عميق خارجي.

السياسة الملزمة:

- متاح لجميع المستخدمين.
- لا يحتاج أي موافقة.
- لا يحتاج تفعيلًا من المالك أو الشركاء.
- لا توجد منح فردية.
- المنصة لا ترسل أو تستقبل أو تقرأ أو تخزن رسائل واتساب.
- المنصة لا تدير حساب واتساب.
- لا يوجد WhatsApp API كنظام نقل رسائل داخل المنصة.

العقد الملزم:

```json
{
  "implementation_state": "FULLY_PREPARED",
  "integration_mode": "EXTERNAL_HANDOFF_ONLY",
  "handoff_type": "DEVICE_APP_DEEP_LINK",
  "target_application": "WHATSAPP_INSTALLED_ON_USER_DEVICE",
  "availability_policy": "FULL_GENERAL_AVAILABILITY",
  "access_scope": "ALL_USERS",
  "approval_required": false,
  "user_self_access_allowed": true,
  "internal_message_transport": false,
  "platform_sends_messages": false,
  "platform_receives_messages": false,
  "platform_reads_messages": false,
  "platform_stores_messages": false,
  "platform_manages_whatsapp_account": false,
  "whatsapp_api_integration": false
}
```

حقول الموافقات والمنح محظورة داخل عقد واتساب، ومنها:

- `approval_policy`
- `required_approver_groups`
- `grant_required`
- `grant_authority_roles`
- `unanimous_approval_required`

## 3. الثوابت المعمارية الأخرى

- الحساب عالمي وسياق السوق ودولة الإعلان والفوترة والكيان القانوني وسياسة البيانات مستقلة.
- الذكاء الاصطناعي لا يمنح صلاحية ولا يحرك مالًا ولا يفتح دولة.
- الصلاحيات الحساسة مرفوضة افتراضيًا وتنفذ في الخادم وRLS.
- الحركات المالية اللاحقة تحتاج دفتر قيد مزدوج وتصحيحًا بقيود عكسية.
- لا تعديل مباشر على `main`.
- كل تغيير عبر PR واختبارات وCI وأدلة وخطة رجوع.
- لا أسرار أو قيم قانونية أو ضريبية أو مصرفية مخترعة.

## 4. مكونات السلطة التنفيذية

### 4.1 دستور المالك

`project-control/v13.1/contracts/owner_constitution.json`

هو الإسقاط التنفيذي الأعلى للقرارات النهائية.

### 4.2 سجل التعارضات

`project-control/v13.1/contracts/conflict_registry.json`

يسجل ويمنع على الأقل:

- `GLOBAL_IMAGE_LIMIT_10`
- `GLOBAL_FIXED_IMPRESSIONS_250`
- `GLOBAL_FIXED_IMPRESSIONS_400`
- `CHAT_FORBIDDEN`
- `DELIVERY_FORBIDDEN`
- `MEDIATION_FORBIDDEN`

### 4.3 Manifest البصمات

`project-control/v13.1/authority-manifest.json`

يحفظ SHA-256 للدستور وسجل التعارضات. أي تغيير بلا تحديث متعمد للبصمة يفشل CI.

### 4.4 المدقق

`project-control/scripts/validate_v13_1_authority.mjs`

يفحص:

- الهوية والأسبقية.
- سبع صور وعدم الارتباط بالسعر.
- غياب رقم ظهور عالمي.
- الوصول العام للدردشة والتوصيل والوساطة.
- التحويل الخارجي إلى واتساب بلا موافقات.
- عدم وجود دور مراسلة للمنصة في واتساب.
- اتساق سجل التعارضات.
- بصمات SHA-256.
- بقاء حالة الإنتاج العامة صادقة أثناء التنفيذ.

## 5. رموز الفشل الأساسية

- `V13_CONSTITUTION_MISSING`
- `V13_CONSTITUTION_INVALID`
- `V13_IMAGE_LIMIT_NOT_SEVEN`
- `V13_IMAGE_LIMIT_PRICE_DEPENDENT`
- `V13_GLOBAL_FIXED_IMPRESSIONS_FORBIDDEN`
- `V13_CAPABILITY_ACCESS_RESTRICTED`
- `V13_WHATSAPP_EXTERNAL_HANDOFF_REQUIRED`
- `V13_WHATSAPP_APPROVAL_FORBIDDEN`
- `V13_SILENT_LEGACY_CONFLICT`
- `V13_CONFLICT_REGISTRY_MISSING`
- `V13_MANIFEST_MISSING`
- `V13_MANIFEST_HASH_MISMATCH`
- `V13_PRODUCTION_CLAIM_WITHOUT_SEALS`

## 6. استراتيجية الاختبار

### الاختبارات الإيجابية

تثبت أن:

- الصور 7.
- الظهور العالمي غير ثابت.
- القدرات الأربع متاحة لجميع المستخدمين دون موافقات.
- واتساب تحويل خارجي فقط.
- المنصة لا تتعامل مع رسائل واتساب.
- سجل التعارضات والبصمات صحيحان.

### الاختبارات السلبية

تفشل عند:

- إعادة 10 صور.
- إضافة زيادة صور مدفوعة.
- تثبيت 250 أو 400 عالميًا.
- تقييد الدردشة أو التوصيل أو الوساطة بالموافقات.
- تحويل واتساب إلى اتصال داخلي أو API مراسلة.
- إضافة أي شرط موافقة أو منحة إلى واتساب.
- حذف تعارض مطلوب.
- تغيير ملف محمي دون تحديث SHA-256.
- الادعاء بإطلاق إنتاجي بلا الأختام المطلوبة.

## 7. حدود هذه الشريحة

هذه الشريحة تثبت الدستور والعقود والاختبارات والمدقق. `runtime_changed = false` و`database_changed = false` يظلان صحيحين حتى بدء خطط Runtime مستقلة.

لا يجوز تفسير ذلك على أن سياسة الوصول محجوبة؛ السياسة محسومة بالوصول العام. لكنه لا يبرر الادعاء بأن كل واجهة Runtime أصبحت منشورة قبل تنفيذها واختبارها.

## 8. برنامج التنفيذ اللاحق

1. الحساب العالمي وسياقات الدول.
2. الصلاحيات وRLS.
3. دورة الإعلان وسبع صور.
4. الظهور وختم الدولة.
5. المحفظة والدفتر المالي.
6. القطاعات السبعة والبحث.
7. Runtime الدردشة.
8. Runtime التوصيل.
9. Runtime الوساطة.
10. زر التحويل الخارجي إلى واتساب.
11. الشاشات وإمكانية الوصول.
12. الأمن والتعافي وSLO.
13. حزمة الأردن والPilot المحكوم.

كل شريحة تستخدم TDD وPR وGitHub Actions وأدلة مستقلة.

# V13.1 Executable Authority Implementation Plan

> **Execution method:** TDD, isolated branch, draft PR, GitHub Actions, evidence before merge.

## Goal

تثبيت V13.1 بوصفه السلطة النهائية القابلة للقراءة آليًا، مع القرارات التالية:

- 7 صور لكل إعلان، بلا زيادة مدفوعة.
- لا رقم ظهور عالمي ثابت.
- الدردشة والتوصيل والوساطة متاحة لجميع المستخدمين دون موافقات.
- زر واتساب متاح لجميع المستخدمين دون موافقات.
- واتساب مجرد تحويل خارجي إلى التطبيق المثبّت على جهاز المستخدم، بلا مراسلة أو تخزين أو إدارة حساب من المنصة.

## Constraints

- لا تعديل مباشر على `main`.
- لا Dependency جديدة.
- لا Runtime أو Database Migration داخل شريحة السلطة الدستورية.
- لا أسرار أو قيم رسمية مخترعة.
- كل سلوك جديد يبدأ باختبار RED ثم تنفيذ GREEN.
- الإنتاج والدول لا توصف بأنها جاهزة قبل بواباتها الفعلية.

---

## Task 1 — Constitution RED/GREEN

**Files:**

- `tests/v13-1-owner-constitution.test.cjs`
- `project-control/v13.1/contracts/owner_constitution.json`

- [x] كتابة اختبار سلطة V13.1.
- [x] كتابة اختبار 7 صور وعدم الارتباط بالسعر.
- [x] كتابة اختبار منع الرقم العالمي للظهور.
- [x] كتابة اختبار الوصول العام للدردشة والتوصيل والوساطة.
- [x] كتابة اختبار واتساب كتحويل خارجي فقط.
- [x] كتابة اختبار يمنع أي موافقة أو منحة لزر واتساب.
- [x] مشاهدة RED في GitHub Actions.
- [x] تحديث العقد بالحد الأدنى لتحقيق القرار.

العقد النهائي لواتساب يجب أن يتضمن:

```json
{
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

---

## Task 2 — Fail-Closed Validator

**Files:**

- `tests/v13-1-authority-validator.test.cjs`
- `project-control/scripts/validate_v13_1_authority.mjs`

- [x] اختبار فقدان أو تلف الدستور.
- [x] اختبار حد الصور.
- [x] اختبار الرقم العالمي للظهور.
- [x] اختبار منع تقييد القدرات العامة.
- [x] اختبار منع دور مراسلة داخلي لواتساب.
- [x] اختبار منع جميع الموافقات والمنح لواتساب.
- [x] مشاهدة RED بسبب المدقق القديم.
- [x] تحديث المدقق بالرموز الجديدة.

رموز الفشل المطلوبة:

```text
V13_CAPABILITY_ACCESS_RESTRICTED
V13_WHATSAPP_EXTERNAL_HANDOFF_REQUIRED
V13_WHATSAPP_APPROVAL_FORBIDDEN
```

---

## Task 3 — Conflict Registry and SHA-256 Manifest

**Files:**

- `project-control/v13.1/contracts/conflict_registry.json`
- `project-control/v13.1/authority-manifest.json`
- `tests/v13-1-authority-manifest.test.cjs`

- [x] إنشاء سجل التعارضات الستة.
- [x] ربط كل تعارض بالقاعدة النهائية.
- [x] إنشاء Manifest لبصمة الدستور وسجل التعارضات.
- [x] اختبار فقدان السجل والـManifest.
- [x] اختبار Hash tampering.
- [x] تحديث المدقق لفحص SHA-256.
- [x] تحديث بصمة الدستور بعد قرار إلغاء الموافقات.

---

## Task 4 — Documentation Consistency

**Files:**

- `docs/architecture/v13.1/V13_1_OWNER_FINAL_AMENDMENT.md`
- `docs/architecture/v13.1/V13_1_EXECUTION_STATUS.json`
- `docs/architecture/v13.1/V13_1_SCOPE_GUARD.md`
- `project-control/v13.1/README_AR.md`
- `docs/superpowers/specs/2026-08-05-v13-1-executable-authority-design.md`
- هذا الملف.

- [x] إزالة لغة «محجوب تشغيليًا» من سياسة الوصول العامة.
- [x] إزالة لغة «واتساب معطل» و«قرار تفعيل منفصل».
- [x] إزالة شروط موافقة المالك أو الشركاء.
- [x] تثبيت أن المنصة لا تتعامل مع رسائل واتساب.
- [x] إبقاء الفرق واضحًا بين سياسة الوصول واكتمال Runtime الفعلي.

---

## Task 5 — Dedicated Quality Gate

**Files:**

- `tests/v13-1-quality-gate-contract.test.cjs`
- `scripts/quality-gate.sh`

- [ ] كتابة اختبار RED يطلب `GATE_v13_1_authority_integrity`.
- [ ] تشغيل الاختبار ومشاهدة الفشل المقصود.
- [ ] إضافة المدقق بعد `validate_project_control`.
- [ ] تشغيل `bash -n scripts/quality-gate.sh`.
- [ ] تشغيل الاختبارات الموجهة.
- [ ] تشغيل Quality Gate المعزولة كاملة.

العلامة المطلوبة:

```text
GATE_v13_1_authority_integrity=PASS
```

---

## Task 6 — PR Completion

- [ ] تحديث عنوان ووصف PR ليعكسا القرار النهائي.
- [ ] التحقق من عدم وجود Runtime أو Migration في Diff.
- [ ] التحقق من عدم وجود أسرار.
- [ ] نجاح VVIP Quality Gate.
- [ ] نجاح Project Control Integrity.
- [ ] نجاح Dependency Review.
- [ ] نجاح CodeQL.
- [ ] مراجعة كل ملفات PR بحثًا عن حكم متعارض.
- [ ] تحويل PR من Draft إلى Ready فقط بعد اكتمال الأدلة.
- [ ] الدمج باستخدام Head SHA المراجع فقط.

---

## Subsequent Runtime Program

بعد دمج شريحة السلطة، يبدأ التنفيذ البرمجي الكامل بخطط مستقلة مرتبة:

1. الحساب العالمي وسياقات الدول.
2. الصلاحيات وRLS.
3. الإعلان وسبع صور.
4. الظهور وختم الدولة.
5. المحفظة والدفتر المزدوج.
6. القطاعات السبعة والبحث.
7. الدردشة لجميع المستخدمين.
8. التوصيل لجميع المستخدمين.
9. الوساطة لجميع المستخدمين.
10. زر التحويل الخارجي إلى واتساب لجميع المستخدمين بلا موافقات.
11. نظام الشاشات وإمكانية الوصول.
12. الأمن والتعافي وSLO.
13. حزمة الأردن والPilot المحكوم.

لا تعتبر أي شريحة مكتملة إلا بعد RED وGREEN وFull Gate وPR Evidence.

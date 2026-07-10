# VVIP TIGER — متتبع المراحل الرسمي

آخر تحديث: 2026-07-10

## الحالات

| الرمز | الحالة |
|---|---|
| ⬜ | لم تبدأ |
| 🟡 | قيد التنفيذ أو منفذة جزئيًا |
| ⛔ | متوقفة |
| 🔵 | جاهزة للتحقق |
| ✅ | تم التنفيذ والتحقق |
| 🛡️ | تم التنفيذ والتحقق الأمني |
| 🚀 | جاهزة للإطلاق |

## خارطة التنفيذ الرسمية الحالية

هذه الحالة هي المرجع اليومي المختصر لخارطة التنفيذ الرسمية، وتعلو على أي ملخصات قديمة داخل هذا الملف.

| المرحلة | الحالة | الملاحظة |
|---|---|---|
| P00 | Completed and Post-Merge Verified | Discovery Experience Shell أُغلق رسميًا |
| P00.1 | Completed and Post-Merge Verified | Master Execution Roadmap أُغلق رسميًا |
| P01 | Ready for Merge | التدقيق أُنجز توثيقيًا، والتنفيذ ما يزال Not Started |
| P02-P34 | Pending | جميع المراحل اللاحقة ما تزال قيد الانتظار |

ملاحظة تنفيذية:

- P00.1 كانت In Progress أثناء إعداد المرجع، ثم أصبحت Completed and Post-Merge Verified بعد الدمج والتحقق.
- لا يعتبر P01 قد بدأ حتى إنشاء فرعه وChange Control Manifest الخاص به.
- P01 does not become in progress until its dedicated branch and Change Control Manifest are created.
- P01 في حالة Ready for Merge ضمن نطاق Audit وDocumentation فقط، ولا تصبح P02 مصرحًا بها قبل دمج P01 والتحقق بعد الدمج.

## المراحل

| الأولوية | المرحلة | الحالة | الملاحظة |
|---:|---|:---:|---|
| 0 | Memory Map | ✅ | موجود ومعتمد |
| 0 | Implementation Checklist | ✅ | موجود ومعتمد |
| 0 | Clerk Authentication | ✅ | تسجيل Google والملف الخاص |
| 0 | Clerk–Supabase Profile Bridge | 🛡️ | منفذ ومراجع أمنيًا |
| 0 | Atomic Profile Resolver | 🛡️ | منفذ ومراجع |
| 0 | Frontend Safe Baseline | ✅ | Baseline موثق |
| 0 | PR #19 Runtime Guard | ✅ | تم الدمج والتحقق |
| 0 | PR #20 Discovery | ✅ | أُغلق دون تغيير لعدم وجود خلل |
| 0 | Owner Master Reference | 🔵 | أُنشئ في هذا الفرع وينتظر الدمج |
| 0 | Values and Names Charter | 🔵 | أُنشئ في هذا الفرع وينتظر الدمج |
| 0 | Owner Runtime Control Center | ⬜ | يحتاج صلاحية مالك حقيقية |
| 1 | الهوية البصرية والألوان | ⬜ | المرحلة المرئية التالية |
| 2 | App Shell وFeed | 🟡 | أجزاء أولية فقط |
| 3 | بحث السوق المفتوح | ⬜ | غير منفذ بالكامل |
| 4 | محرك الإعلانات | ⬜ | إنشاء وتفاصيل وتعديل وحذف |
| 4 | خط صور 7 صور | ⬜ | قص وضغط وتخزين |
| 5 | أنواع الحسابات | ⬜ | معتمدة |
| 5 | صلاحيات القطاعات | ⬜ | معتمدة |
| 5 | 4 منشورات أسبوعيًا | ⬜ | غير مفروضة بالكامل |
| 5 | انتهاء الإعلان بعد 120 يومًا | ⬜ | غير منفذ آليًا |
| 5 | تجربة 4 أشهر | 🟡 | حقول الأساس موجودة |
| 6 | المحادثات الفردية | ⬜ | لا مجموعات |
| 6 | المشاركة الفردية | ⬜ | لا Broadcast |
| 7 | Tiger Care | ⬜ | معتمد |
| 7 | لوحة الإدارة | ⬜ | غير مكتملة |
| 8 | المفضلة والإشعارات والسجل | ⬜ | غير مكتملة |
| 8 | Trust Score وQR | ⬜ | مرحلة لاحقة |
| 9 | PWA وLite Mode | ⬜ | قبل الإطلاق |
| 9 | الإطلاق المحدود | ⬜ | بعد جاهزية المنتج |
| 10 | AI المتقدم | ⬜ | بعد ثبات المنتج |
| 10 | الدفع والتطبيق الأصلي وAWS | ⬜ | مراحل مستقبلية |

<!-- VVIP_DISCOVERY_PHASE_TRACKER -->

## تجربة الاكتشاف والبحث

| الأولوية | المرحلة | الحالة | الملاحظة |
|---:|---|:---:|---|
| 1 | Facebook Familiar Discovery Shell | 🔵 | منفذ على الفرع وينتظر الدمج والتحقق |
| 3 | OpenSooq-style Quick Search | 🔵 | منفذ على الفرع وينتظر الدمج والتحقق |
| 3 | Advanced Common Filters | 🔵 | المدينة والمنطقة والسعر والحالة والمعلن |
| 3 | Automotive Filters | 🔵 | القطعة والماركة والموديل والسنة والطاقة |
| 3 | Real Estate Filters | 🔵 | البيع والإيجار والنوع والمساحة والغرف |
| 3 | Materials & Supplies Filters | 🔵 | المادة والمورد والجملة والوحدة والحد الأدنى والتسليم |
| 3 | Backend Search Adapter | ⬜ | يحتاج مخطط بيانات وصلاحيات Supabase مستقلة |

ملاحظة إكمال:

- PR #22 hardening اكتمل على الفرع `feat/vvip-discovery-experience-shell`.
- الإصلاحات غطت hidden/display state وmobile nav وsr-only وclearExternalItems().

## دليل الإكمال المطلوب

عند إكمال أي مرحلة يسجل:

- اسم الفرع.
- Commit.
- Pull Request.
- الملفات المتأثرة.
- الاختبارات.
- نتيجة Security Shield.
- نتيجة Fast Feeling.
- نتيجة الهاتف.
- خطة الرجوع.
- تاريخ الدمج.
- Post-Merge Verification.

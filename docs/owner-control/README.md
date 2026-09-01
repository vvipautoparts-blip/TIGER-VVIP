# VVIP TIGER — Owner Control Reference

**Status:** `CURRENT_ONLY / OWNER-CONTROL INDEX / NON-AUTHORITY`

> هذا الملف فهرس تنفيذي فقط. لا ينشئ قرار منتج ولا يتقدم على سلطة المالك الحالية.

## نقطة البداية الإلزامية

قبل أي برمجة أو تنظيف أو تعديل Runtime/UI/API/Config/Test/CI أو قرار إصدار، المرجع الأول الإلزامي هو:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

والمرجع العربي الموجّه للمالك هو:

`docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

قاعدة `CURRENT_ONLY`: أحدث قرار صريح معتمد من المالك هو السلطة الوحيدة داخل نطاقه. أي مادة أقدم تتعارض معه لا تبقى كمرجع أو fallback أو archive أو legacy داخل الشجرة الحالية؛ Git history فقط يحفظ الأثر التاريخي.

## السلطات التشغيلية الحالية

1. `TIGER_OWNER_BINDING_CURRENT.md` — المرجع الأول ودستور Latest-Only.
2. `TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md` — تجربة TIGER NEXUS 2026 الحالية.
3. `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — Social Core حيث يظل متوافقًا مع NEXUS الأحدث.
4. `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — سلطة Pulse الحالية.
5. `TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md` — التوزيع المالي الحالي.
6. `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — حوكمة التنظيف والإزالة المحمية.
7. `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — سلطة post-launch-autonomy المحمية ضمن حدودها.
8. `project-control/authority/authority-registry.v1.json` — الرسم الآلي للسلطات الحالية.
9. `config/fusion/current-authority.json` — عقد المنتج الحالي القابل للقراءة آليًا.
10. `config/finance/current-distribution.json` — عقد التوزيع المالي الحالي القابل للقراءة آليًا.
11. exact Git SHA/tree + matching protected CI evidence — حقيقة التنفيذ.

## أدلة التقارب — ليست سلطة منتج

- `DELETION_MANIFEST_CURRENT.md` يوثق فقط ما ثبت حذفه أو استبداله أثناء التقارب الحالي، مع قاعدة **No Blind Deletion**.
- وثائق مراحل قديمة متوافقة قد تبقى كأدلة تنفيذية فقط إذا لم تدّعِ سلطة حالية ولم تحمل قيمة أو قاعدة متعارضة.
- أي وثيقة مرحلة أو تقرير أو خطة تتعارض مع أحدث سلطة مالك تُحذف من الشجرة الحالية بعد إثبات التعارض والاستبدال.
- ملفات migrations المطبقة تاريخيًا لا يعاد تحريرها؛ أي أثر قديم فيها يعالج بـ forward migration محمي عند الحاجة.

## حدود التنفيذ الحالية

هذا الفهرس لا يصرح بـ:

- الدمج إلى `main`؛
- تحويل PR #349 من Draft؛
- Production أو Staging mutation؛
- تعديل provider/database/credentials؛
- تجاوز أو تخفيف أي Quality/Security/Release gate.

مسار التنفيذ المحمي يبقى:

`CURRENT OWNER AUTHORITY → RED CONTRACT → IMPLEMENT/RECONCILE → DELETE PROVEN CONFLICT → EXACT-HEAD RUNNER GREEN → REVIEW → PROTECTED MERGE → VERIFICATION`

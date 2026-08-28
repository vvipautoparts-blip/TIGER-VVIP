# مرجع مالك TIGER الحالي — CURRENT ONLY

**الحالة:** `CURRENT OWNER ENTRYPOINT / CURRENT_ONLY / NO_FALLBACK`  
**آخر اعتماد:** 2026-08-28

هذه هي نقطة البداية الوحيدة لمعرفة الحقيقة الحالية في VVIP TIGER.

## 1. القاعدة العليا

المرجع الأعلى الملزم:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

> **الأحدث الذي يعتمده المالك هو السلطة الوحيدة في نطاقه. كل قديم متعارض يُزال من Runtime/UI/API/Config/Tests/CI/Current Docs/Launch Gates ولا يعود كـfallback.**

الأثر التاريخي إن لزم يبقى في Git history أو audit غير تشغيلي فقط.

## 2. قرارات المنتج الحالية

- هوية المنتج الأساسية: `SOCIAL_NETWORK_FIRST`.
- Marketplace وحدة داخل المنصة الاجتماعية، وليس هوية Home الرئيسية.
- النشر العادي ليس منتجًا مدفوعًا ولا يحتاج بطاقة/اشتراك/خانة/خطة ظهور/إيصال استحقاق.
- لا توجد quota تجارية أو أسبوعية ثابتة حالية لعدد المنشورات.
- الحد الحالي للصور في إعلان Marketplace العادي: 7 صور.
- لا توجد مدة منتج/محتوى للمنشور أو الإعلان أو بطاقة/رصيد الظهور أو Pulse verified-impression balance.
- المدد التقنية الأمنية مثل OTP/session/signed URL/anti-replay/cache مسموحة لأنها حماية تقنية وليست مدة منتج.
- الإعلان المدفوع الحالي: `TIGER PULSE RING` فقط بمستويات 3 / 10 / 20 JOD مقابل verified eligible impressions، بلا انتهاء زمني لقيمة الظهور المشتراة.
- VVIP TIGER ليس طرفًا في صفقة البائع/المشتري أو مزود الخدمة/المستفيد، ولا يقدم checkout/escrow/settlement/delivery/warranty للصفقة بين الأطراف.

## 3. السلطات الحالية فقط

1. `TIGER_OWNER_BINDING_CURRENT.md` — دستور Latest-Only الأعلى.
2. `TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md` — Social Core.
3. `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` — paid visibility.
4. `TIGER_PHOENIX_CLEANROOM_2026_CURRENT_OWNER_AUTHORITY.md` — cleanup governance.
5. `TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md` — destructive-disposal/post-launch autonomy gate.
6. `project-control/authority/authority-registry.v1.json` — Authority Graph الآلي.
7. `config/fusion/current-authority.json` — عقد المنتج الحالي القابل للقراءة آليًا.
8. exact Git SHA/tree + matching CI evidence — حقيقة التنفيذ.

أي وثيقة أخرى لا تملك سلطة على هذه القائمة إذا تعارضت معها.

## 4. قاعدة التنظيف

أمر المالك العام `نظف / cleanup` يعني PHOENIX CLEANROOM كاملًا.

- `NO PROOF OF RECLAMATION → NO DESTRUCTIVE DISPOSAL`.
- أي حذف مدمر يمر عبر AION disposal chain.
- حماية البيانات والأدلة لا تعني إبقاء قاعدة منتج قديمة فعالة.

## 5. منع الادعاء الزائف

لا يعتبر القرار منفذًا لمجرد وجوده في وثيقة.

المسار الإلزامي:

`OWNER DECISION → RED CONTRACT → IMPLEMENT → GREEN EXACT-HEAD CI → REVIEW → PROTECTED MERGE → VERIFICATION`

لا كتابة مباشرة على `main` ولا تجاوز للبوابات الأمنية/القانونية/الإنتاجية.

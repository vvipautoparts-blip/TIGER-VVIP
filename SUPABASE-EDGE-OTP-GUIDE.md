# Supabase Edge Function for Internal Phone Verification

هذا المسار يفعّل التحقق الهاتفي الداخلي عبر Supabase Edge Function، مع إبقاء Meta خيارًا اختياريًا فقط.

## 1. الملفات الجاهزة

- الدالة: [supabase/functions/phone-verification/index.ts](supabase/functions/phone-verification/index.ts)
- لا يوجد مستهلك Frontend نشط حاليًا؛ يجب ربط الواجهة بالدالة صراحة قبل اعتبار التحقق الهاتفي مفعّلًا.

## 2. المتطلبات

للوضع الداخلي الحالي لا تحتاج أي مزود خارجي.

اختياري فقط إذا أردت تفعيل Meta لاحقًا:

- `WHATSAPP_PROVIDER=meta`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANG`

## 3. تسجيل الدخول إلى Supabase CLI

نفّذ محلياً:

```bash
npm exec --yes supabase -- login
npm exec --yes supabase -- link --project-ref YOUR_PROJECT_REF
```

بديل (إذا كان Supabase CLI مثبتاً عالمياً):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 4. ضبط أسرار الدالة

نفّذ:

```bash
npm exec --yes supabase -- secrets set WHATSAPP_PROVIDER=internal
```

إذا أردت تفعيل Meta لاحقًا، بدّل `WHATSAPP_PROVIDER=meta` ثم أضف مفاتيح Meta المذكورة أعلاه.

## 5. نشر الدالة

نفّذ:

```bash
npm exec --yes supabase -- functions deploy phone-verification
```

رابط الدالة سيكون بهذا الشكل:

```text
https://YOUR_PROJECT_REF.functions.supabase.co/phone-verification
```

## 6. ربطها مع الواجهة

خزّن مفاتيح Supabase كقيم runtime في المتصفح:

```js
localStorage.setItem("TIGER_SUPABASE_URL", "https://YOUR_PROJECT.supabase.co");
localStorage.setItem("TIGER_SUPABASE_ANON_KEY", "YOUR_REAL_ANON_KEY");
```

ثم أضف مستهلكًا صريحًا في Runtime الحالي مع اختبار عقد الطلب قبل تفعيل الميزة للمستخدمين.

## 7. عقد الطلب الذي تستقبله الدالة

الواجهة ترسل:

```json
{
  "phone": "+962780003302",
  "code": "123456",
  "channel": "internal"
}
```

والدالة ترجع عند النجاح:

```json
{
  "success": true,
  "provider": "internal"
}
```

## 8. اختبار سريع بعد النشر

جرّب:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/phone-verification" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+962780003302","code":"123456","channel":"internal"}'
```

## 9. ملاحظات مهمة

- تشغيل زر الإرسال في الواجهة يتطلب:
  - مفاتيح Supabase الحقيقية
  - نشر [supabase/functions/phone-verification/index.ts](supabase/functions/phone-verification/index.ts)
- تسجيل الدخول بالإيميل والباسورد لا يحتاج نقطة التحقق الهاتفي، لكنه يحتاج مفاتيح Supabase الحقيقية.
- إذا كان RLS مفعلاً كما ينبغي، فالدالة لا تغيّر جداولك مباشرة؛ هي فقط تبدأ التحقق الهاتفي. التحقق الفعلي يبقى داخل التطبيق عبر جداول OTP الموجودة لديك.

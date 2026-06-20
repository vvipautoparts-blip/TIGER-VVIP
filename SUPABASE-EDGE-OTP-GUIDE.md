# Supabase Edge Function for WhatsApp OTP

هذا المسار يفعّل خيار 2: إرسال OTP عبر Supabase Edge Function.

## 1. الملفات الجاهزة

- الدالة: [supabase/functions/send-otp/index.ts](supabase/functions/send-otp/index.ts)
- الربط في الواجهة: [supabase-local.js](supabase-local.js)

## 2. المتطلبات

قبل النشر، جهّز بيانات WhatsApp Cloud API من Meta:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- اختياري للإنتاج:
  - `WHATSAPP_TEMPLATE_NAME`
  - `WHATSAPP_TEMPLATE_LANG`

ملاحظة:
إذا لم تضع `WHATSAPP_TEMPLATE_NAME` فالدالة سترسل رسالة نصية عادية. هذا قد يعمل فقط داخل نافذة 24 ساعة للمحادثة. للإنتاج، OTP الأفضل يكون عبر Template Approved من Meta.

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
npm exec --yes supabase -- secrets set WHATSAPP_PROVIDER=meta
npm exec --yes supabase -- secrets set WHATSAPP_ACCESS_TOKEN=YOUR_META_ACCESS_TOKEN
npm exec --yes supabase -- secrets set WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
npm exec --yes supabase -- secrets set WHATSAPP_TEMPLATE_NAME=your_otp_template
npm exec --yes supabase -- secrets set WHATSAPP_TEMPLATE_LANG=ar
```

إذا كنت تريد اختباراً سريعاً بدون Template approved، احذف متغير `WHATSAPP_TEMPLATE_NAME` من الإعدادات واترك الإرسال النصي فقط.

## 5. نشر الدالة

نفّذ:

```bash
npm exec --yes supabase -- functions deploy send-otp
```

رابط الدالة سيكون بهذا الشكل:

```text
https://YOUR_PROJECT_REF.functions.supabase.co/send-otp
```

## 6. ربطها مع الواجهة

حدّث [supabase-local.js](supabase-local.js):

```js
window.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_REAL_ANON_KEY";
window.WHATSAPP_OTP_ENDPOINT = "https://YOUR_PROJECT_REF.functions.supabase.co/send-otp";
```

## 7. عقد الطلب الذي تستقبله الدالة

الواجهة ترسل:

```json
{
  "phone": "+962780003302",
  "code": "123456",
  "channel": "whatsapp"
}
```

والدالة ترجع عند النجاح:

```json
{
  "success": true,
  "provider": "meta"
}
```

## 8. اختبار سريع بعد النشر

جرّب:

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+962780003302","code":"123456","channel":"whatsapp"}'
```

## 9. ملاحظات مهمة

- تشغيل زر الإرسال في الواجهة يتطلب:
  - مفاتيح Supabase الحقيقية
  - `WHATSAPP_OTP_ENDPOINT` صحيح
- تسجيل الدخول بالإيميل والباسورد لا يحتاج `WHATSAPP_OTP_ENDPOINT`، لكنه يحتاج مفاتيح Supabase الحقيقية.
- إذا كان RLS مفعلاً كما ينبغي، فالدالة لا تغيّر جداولك مباشرة؛ هي فقط ترسل OTP. التحقق الفعلي يبقى داخل التطبيق عبر جداول OTP الموجودة لديك.
# 🔤 Email Template Variables Reference

**For:** Supabase Email Templates  
**Purpose:** Understanding dynamic variables in email templates

---

## ✅ متغيرات Supabase المتاحة

عند تطبيق القالب في Supabase، يمكنك استخدام هذه المتغيرات الديناميكية:

### المتغير الرئيسي:

```html
{{ .ConfirmationURL }}
```

**الوصف:** الرابط الذي يضغط عليه المستخدم للتحقق  
**المثال:** `https://yourproject.supabase.co/auth/v1/verify?token=xxx&type=email`

---

## 📋 كل المتغيرات المتاحة

| المتغير | الوصف | المثال |
|--------|------|--------|
| `{{ .ConfirmationURL }}` | رابط التفعيل | https://... |
| `{{ .Email }}` | بريد المستخدم | user@example.com |
| `{{ .Token }}` | كود التفعيل | abc123xyz... |
| `{{ .SiteURL }}` | رابط الموقع الأساسي | https://example.com |
| `{{ .AdminEmail }}` | بريد الإدمن | admin@example.com |

---

## 💡 أمثلة الاستخدام

### مثال 1: زر التفعيل (كما في قالبنا)
```html
<a href="{{ .ConfirmationURL }}" class="cta-button">
    تفعيل الحساب الآن ✓
</a>
```

### مثال 2: نسخ يدوية من الرابط
```html
<p>أو انسخ هذا الرابط:</p>
<p>{{ .ConfirmationURL }}</p>
```

### مثال 3: رسالة شخصية
```html
<p>مرحباً {{ .Email }},</p>
```

### مثال 4: رابط بديل
```html
<p>إذا لم يعمل الزر، جرب: {{ .SiteURL }}/verify?token={{ .Token }}</p>
```

---

## ✨ القالب الحالي يستخدم:

```html
✅ {{ .ConfirmationURL }}
   - في الزر الرئيسي
   - في الرابط الاحتياطي
   - دعم كامل لـ Supabase
```

---

## 🔍 اختبار المتغيرات

في Supabase Email Templates:

1. اذهب إلى: **Authentication** → **Email Templates**
2. اختر: **Confirm signup**
3. ستجد أسفل الصفحة: **Preview**
4. ستظهر المتغيرات الفعلية عند الإرسال الفعلي

---

## 📧 مثال على الرسالة المرسلة

بعد نسخ القالب وحفظه في Supabase:

```
المستخدم يتسجل بـ: user@example.com

Supabase يرسل:
├─ من: noreply@resend.dev
├─ إلى: user@example.com
├─ الموضوع: Confirm your email
└─ القالب: [القالب الاحترافي]

داخل الرسالة:
- {{ .ConfirmationURL }} → https://xxxx?token=xxx&type=email
- {{ .Email }} → user@example.com
```

---

## ⚠️ مهم

**لا تعدّل هذه المتغيرات** في القالب:
- ✅ استخدمها كما هي: `{{ .ConfirmationURL }}`
- ❌ لا تحاول تغيير الأسماء
- ❌ لا تحذفها من القالب
- ✅ إذا حذفتها، لن يعمل التفعيل

---

## 🎯 الخطوة التطبيق

1. افتح: `/email-templates/confirm-email.html`
2. يحتوي على: `{{ .ConfirmationURL }}`
3. انسخه كما هو
4. الصقه في Supabase
5. ✅ سيعمل تلقائياً

---

نعم، القالب الذي أعطيناك يستخدم هذه المتغيرات بشكل صحيح! ✅

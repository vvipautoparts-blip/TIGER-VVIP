# تثبيت مركز التحكم العالمي داخل مستودع VVIP TIGER

هذه الحزمة إضافية ولا تعدّل ملفات Runtime القديمة. بعد نسخها إلى جذر المستودع:

```bash
node --test project-control/tests/project_control_integrity.test.mjs
node project-control/scripts/validate_project_control.mjs
git diff --check
```

ثم تُطبق migrations على Supabase Development Branch فقط وبترتيب أرقامها. لا تطبق على Production قبل نجاح GATE-01 وGATE-02 وGATE-03.

الأعداد المتوقعة بعد الاستيراد: 3 مصادر، 23 مرحلة، 70 مهمة، 2,093 متطلبًا، 112 اعتمادًا، 249 دولة، و15 بوابة إطلاق.

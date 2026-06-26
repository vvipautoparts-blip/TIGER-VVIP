# نشر المنصة HTTPS وتثبيتها على أندرويد

## الحالة
تم تجهيز المشروع كتطبيق ويب قابل للتثبيت (PWA)، وتم ضبط النشر عبر GitHub Pages من الفرع main في ملف:
- .github/workflows/pages.yml

## الخطوة 1: ربط المشروع بمستودع GitHub (مرة واحدة)
إذا لم يكن لديك مستودع لهذا المشروع بعد:

1. أنشئ مستودع جديد على GitHub (فارغ)
2. اربطه بالمشروع المحلي:

git remote add origin https://github.com/<USERNAME>/<REPO>.git

## الخطوة 2: رفع المشروع

git add .
git commit -m "Prepare Android-installable PWA + Pages deploy"
git push -u origin main

## الخطوة 3: تفعيل GitHub Pages
- ادخل إلى إعدادات المستودع على GitHub
- Pages
- Source: GitHub Actions

بعد دقائق سيظهر رابط HTTPS بالشكل:
https://<USERNAME>.github.io/<REPO>/

## الخطوة 4: تثبيت التطبيق على أندرويد
1. افتح الرابط HTTPS من Chrome على الهاتف
2. من القائمة اختر Install app أو Add to Home screen
3. سيتم تثبيت التطبيق وفتحه بشكل مستقل

## ملاحظات مهمة
- أي تغيير جديد: فقط push على main وسيتم تحديث التطبيق تلقائياً
- إذا لم يظهر زر التثبيت فوراً: حدّث الصفحة مرة أو مرتين ثم أعد فتحها
- لأفضل عمل، ضع مفاتيح Supabase الحقيقية قبل الاستخدام الإنتاجي

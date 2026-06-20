# خارطة تنفيذ منصة FlutterFlow (نمط فيسبوك)

## 1) الهدف
بناء منصة خدمات اجتماعية بتجربة قريبة من فيسبوك باستخدام FlutterFlow + Firebase، مع تركيز على:
- تسجيل دخول سلس
- عرض خدمات بشكل Feed
- بروفايل قابل للتعديل
- تواصل مباشر (واتساب واتصال)
- أمان وصلاحيات واضحة

## 2) المعمارية المقترحة
- الواجهة: FlutterFlow
- قاعدة البيانات: Firestore
- التوثيق: Firebase Authentication (Email/Password)
- الملفات والصور: Firebase Storage
- الإشعارات: Firebase Cloud Messaging
- الوظائف الخلفية الحساسة: Firebase Cloud Functions

## 3) نموذج البيانات (Firestore Schema)

### Users
- uid: string (Document ID)
- fullName: string
- email: string
- phone: string
- photoUrl: string
- membershipType: string (basic | premium | admin)
- role: string (user | provider | admin)
- isActive: bool
- createdAt: timestamp
- updatedAt: timestamp

### Services
- serviceId: string (Document ID)
- ownerUid: string (ref Users.uid)
- title: string
- description: string
- price: number
- category: string
- contactPhone: string
- whatsappNumber: string
- imageUrl: string
- status: string (active | inactive)
- city: string
- createdAt: timestamp
- updatedAt: timestamp

### Interactions
- interactionId: string (Document ID)
- serviceId: string
- userUid: string
- providerUid: string
- type: string (whatsapp_click | call_click | order_request)
- note: string
- createdAt: timestamp

### Notifications
- notificationId: string (Document ID)
- targetUid: string
- title: string
- body: string
- type: string (order | message | system)
- isRead: bool
- createdAt: timestamp

## 4) الصلاحيات (Security Rules)

### قواعد أساسية
- المستخدم يقرأ/يعدل وثيقته فقط في Users
- أي مستخدم مسجل يقرأ Services النشطة
- إنشاء Service مسموح فقط لصاحب الدور provider أو admin
- تعديل/حذف Service مسموح فقط للمالك أو admin
- Interactions تُنشأ من المستخدم الحالي فقط
- Notifications يقرأها صاحبها فقط

### ملاحظات تنفيذ
- لا تعتمد على role من الواجهة فقط؛ تحقق منها داخل Security Rules
- أي عملية حساسة (مثل اعتماد خدمة أو تغيير دور) تنفذ عبر Cloud Function

## 5) شاشات FlutterFlow

### Auth
- Login
- Register
- Forgot Password

### Main Feed
- AppBar + Search
- Dropdown للفئات
- ListView للخدمات
- Pagination لاحقاً عند زيادة البيانات

### Service Details
- صورة الخدمة
- وصف وسعر
- زر واتساب
- زر اتصال
- زر تفاعل/طلب

### Profile Dashboard
- بيانات المستخدم
- Edit Profile
- خدماتي (إن كان Provider)
- نشاطي/تفاعلاتي

### Admin (اختياري في المرحلة الأولى)
- إدارة المستخدمين
- إدارة الخدمات
- مراجعة البلاغات/الطلبات

## 6) الأكشنز داخل FlutterFlow

### بعد نجاح Login
- Action: Navigate to MainFeed أو ProfileDashboard حسب الدور

### الفلترة الديناميكية
- Dropdown value => Firestore Query where category == selectedCategory
- عند اختيار All يتم إلغاء شرط الفلترة

### واتساب
- Action: Launch URL
- الصيغة:
  - https://wa.me/9627XXXXXXXX?text=مرحبا%20أرغب%20بخدمتكم

### اتصال
- Action: Launch Phone
- الصيغة:
  - tel:+9627XXXXXXXX

### تسجيل التفاعل
- عند الضغط على واتساب/اتصال:
  - إنشاء وثيقة في Interactions مع type المناسب

## 7) نظام الألوان والهوية
- Primary: #1877F2
- Background: #F0F2F5
- Surface: #FFFFFF
- Text Primary: #1C1E21
- Text Secondary: #65676B

## 8) خطة التنفيذ (Sprint Plan)

### Sprint 1 (3-5 أيام)
- ربط Firebase + Auth
- إنشاء Collections الأساسية
- بناء Login/Register/Profile
- تطبيق Security Rules الأساسية

### Sprint 2 (4-6 أيام)
- بناء Main Feed + Service Details
- فلترة Dropdown
- أزرار واتساب واتصال
- تسجيل Interactions

### Sprint 3 (3-5 أيام)
- Notifications الأساسية
- تحسينات الأداء
- اختبار شامل + إصلاحات
- تجهيز نسخة تجريبية UAT

## 9) خطة الاختبار (UAT Checklist)
- تسجيل مستخدم جديد
- تسجيل دخول وخروج
- تعديل البروفايل ورفع صورة
- إنشاء خدمة جديدة (Provider)
- ظهور الخدمة في Feed
- الفلترة حسب التصنيف
- زر واتساب يفتح التطبيق بالرابط الصحيح
- زر الاتصال يفتح الاتصال
- إنشاء Interaction عند الضغط
- منع مستخدم من تعديل بيانات مستخدم آخر

## 10) متطلبات قانونية وتشغيلية
- صفحة سياسة الخصوصية (Privacy Policy)
- صفحة الشروط والأحكام (Terms)
- رسالة موافقة على استخدام رقم الهاتف
- نسخة احتياطية دورية للبيانات
- مراقبة الأخطاء (Crashlytics)

## 11) مخرجات التسليم للمبرمج
- مشروع FlutterFlow مربوط بـ Firebase
- Security Rules مفعلة
- جميع الشاشات الأساسية جاهزة
- ملف توثيق API/Flows
- قائمة اختبارات UAT منفذة مع نتائج

## 12) نص جاهز للإرسال للمبرمج
نحتاج تنفيذ منصة FlutterFlow متكاملة على Firebase وفق التالي:
1. إعداد Firebase وربط Auth بنظام Email/Password.
2. إنشاء Collections: Users, Services, Interactions, Notifications.
3. بناء شاشات: Login, Register, Main Feed, Service Details, Profile Dashboard.
4. تفعيل فلترة الخدمات عبر Dropdown وربطها بـ Firestore Query.
5. تفعيل Launch URL للواتساب وLaunch Phone للاتصال.
6. تسجيل كل عملية تواصل في Interactions.
7. تطبيق Security Rules بحيث لا يستطيع المستخدم الوصول لبيانات غيره.
8. تنفيذ صفحة سياسة الخصوصية والشروط.
9. تسليم نسخة UAT مع قائمة اختبار كاملة.

## 13) ملاحظات مهمة قبل البدء
- يفضّل البدء بمشروع Firebase نظيف ومنظم من اليوم الأول.
- لا تضع أي مفاتيح حساسة داخل الواجهة مباشرة.
- أي منطق صلاحيات متقدم يمر عبر Cloud Functions.
- عند الحاجة للتوسع، أضف Elasticsearch أو Algolia للبحث المتقدم.

# مواصفة دمج مركز التحكم بالمشروع داخل VVIP TIGER

## الوحدة المقترحة

`owner-control/project-control`

## الحدود

- قاعدة البيانات داخل schema مستقلة باسم `project_control`.
- الوصول من المتصفح يمر عبر Backend/API يطبق صلاحية Owner أو Technical Lead.
- لا يُرسل Service Role أو أي مفتاح إداري إلى الواجهة.
- كل تغيير حالة يسجل في `status_history` مع السبب والدليل.

## الشاشات

1. لوحة الملخص: المراحل، المهام، نسبة الإنجاز، المتوقفة، P0.
2. سجل المهام: بحث، فلاتر، حالة، أولوية، مسؤول، مرحلة.
3. تفاصيل المهمة: الهدف، فائدة المستخدم، فائدة المنصة، خطوات المبرمج، الأمن، QA، القبول، الاعتمادات، الأدلة.
4. سجل القرارات.
5. سجل المخاطر.
6. السجل الاستراتيجي للمهام المؤجلة.
7. بوابات الإطلاق والأدلة.
8. سجل المصادر والبصمات.

## API المقترحة

- `GET /api/owner/project-control/summary`
- `GET /api/owner/project-control/phases`
- `GET /api/owner/project-control/tasks`
- `GET /api/owner/project-control/tasks/:code`
- `PATCH /api/owner/project-control/tasks/:code/status`
- `POST /api/owner/project-control/tasks/:code/evidence`
- `GET|POST /api/owner/project-control/decisions`
- `GET|POST|PATCH /api/owner/project-control/risks`
- `GET|POST /api/owner/project-control/strategic-backlog`

## شروط القبول

- مستخدم غير مخول يتلقى 403 ولا تظهر له بيانات المشروع.
- كل تعديل حالة يحتاج سببًا ويسجل في التاريخ.
- لا يمكن تعليم مهمة Done دون أدلة CI/QA/Acceptance حسب نوعها.
- تصدير JSON/CSV يعيد كل السجلات بلا فقد.
- البحث يعمل بالعربية والإنجليزية والرمز.
- اللوحة تدعم RTL والهاتف وحالات loading/error/empty/forbidden.

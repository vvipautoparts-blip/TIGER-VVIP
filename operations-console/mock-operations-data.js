export const CONTEXT = { actor: 'نورا الحارثي', sector: 'قطع السيارات وخدماتها', region: 'عمّان', area: 'غرب عمّان', queue: 'Tiger Care - عمّان' };

export const metrics = [
  ['المستخدمون التجريبيون', '1,248', 'نشط هذا الأسبوع'], ['حسابات جديدة', '46', 'بانتظار المراجعة 8'],
  ['إعلانات تحتاج مراجعة', '18', 'عاجل 3'], ['طلبات Tiger Care', '27', 'متأخرة عن SLA 2'],
  ['بلاغات حرجة', '4', 'تحتاج قرارًا'], ['حالة SLA', '92%', 'ضمن المستهدف'],
];

export const employees = [
  { id: 'EMP-104', name: 'نورا الحارثي', role: 'مدير Tiger Care', scope: 'assigned_queue', sector: 'قطع السيارات وخدماتها', region: 'عمّان', area: 'غرب عمّان', status: 'نشطة', assigned: '2026-06-01', activity: 'منذ 12 دقيقة', permissions: '14 نشطة', pending: '0', owner: 'نورا الحارثي' },
  { id: 'EMP-217', name: 'سامر الدروبي', role: 'مشرف محتوى', scope: 'area', sector: 'قطع السيارات وخدماتها', region: 'عمّان', area: 'غرب عمّان', status: 'نشطة', assigned: '2026-06-11', activity: 'منذ ساعة', permissions: '8 نشطة', pending: '1', owner: 'نورا الحارثي' },
  { id: 'EMP-309', name: 'ليان أبو زيد', role: 'منسق مزودي خدمات', scope: 'region', sector: 'المواد والتوريدات', region: 'الزرقاء', area: 'وسط الزرقاء', status: 'مراجعة', assigned: '2026-07-02', activity: 'أمس', permissions: '5 نشطة', pending: '2', owner: 'ليان أبو زيد' },
  { id: 'EMP-411', name: 'حازم المجالي', role: 'موظف مبيعات', scope: 'own_records', sector: 'العقارات', region: 'عمّان', area: 'شرق عمّان', status: 'منتهية قريبًا', assigned: '2026-04-12', activity: 'منذ يومين', permissions: '3 نشطة', pending: '0', owner: 'حازم المجالي' },
];

export const tickets = [
  { id: 'TC-2081', title: 'طلب مراجعة إعلان قطعة غير مطابقة', type: 'إعلان', sector: 'قطع السيارات وخدماتها', priority: 'عالية', status: 'قيد المراجعة', assignee: 'نورا الحارثي', queue: 'Tiger Care - عمّان', region: 'عمّان', area: 'غرب عمّان', owner: 'هشام صبري', updated: 'منذ 18 دقيقة', message: 'أرجو مراجعة مطابقة وصف القطعة مع الصور.', timeline: ['تم الاستلام', 'تم التعيين إلى Tiger Care', 'بانتظار قرار المراجعة'] },
  { id: 'TC-2094', title: 'استفسار عن اعتماد مزود خدمة', type: 'مزود خدمة', sector: 'المواد والتوريدات', priority: 'متوسطة', status: 'بانتظار المستخدم', assignee: 'ليان أبو زيد', queue: 'Tiger Care - الزرقاء', region: 'الزرقاء', area: 'وسط الزرقاء', owner: 'رنا غيث', updated: 'منذ ساعة', message: 'تمت مراجعة الطلب ونحتاج توضيح نوع الخدمة.', timeline: ['تم الاستلام', 'طلب معلومات إضافية'] },
  { id: 'TC-2107', title: 'طلب مساعدة في تحديث حساب', type: 'حساب', sector: 'العقارات', priority: 'عاجلة', status: 'مصعدة', assignee: 'نورا الحارثي', queue: 'Tiger Care - عمّان', region: 'عمّان', area: 'غرب عمّان', owner: 'جود غانم', updated: 'منذ ساعتين', message: 'الحساب موقوف ويحتاج مراجعة إدارية.', timeline: ['تم الاستلام', 'تم التصعيد إلى الإدارة'] },
];

export const reports = [
  { id: 'R-501', title: 'وصف إعلان مضلل', entity: 'إعلان AD-880', priority: 'عالية', action: 'إخفاء محتوى Preview', status: 'بانتظار القرار', sector: 'قطع السيارات وخدماتها', region: 'عمّان', area: 'غرب عمّان', queue: 'Moderation - عمان', assignee: 'سامر الدروبي', owner: 'مستخدم تجريبي', evidence: 'لقطتا شاشة تجريبيتان' },
  { id: 'R-502', title: 'محتوى مخالف للتصنيف', entity: 'إعلان AD-912', priority: 'متوسطة', action: 'طلب معلومات إضافية', status: 'قيد المراجعة', sector: 'المواد والتوريدات', region: 'الزرقاء', area: 'وسط الزرقاء', queue: 'Moderation - الزرقاء', assignee: 'سامر الدروبي', owner: 'مستخدم تجريبي', evidence: 'وصف تجريبي' },
];

export const alerts = [
  ['بلاغ حرج يحتاج قرارًا', 'R-501', 'حرج'], ['تذكرة متأخرة عن SLA', 'TC-2107', 'عالية'], ['تغيير صلاحية بانتظار المراجعة', 'EMP-309', 'متوسطة'], ['محاولة وصول غير مسموحة', 'AUD-108', 'منخفضة']
].map(([title, linked, level]) => ({ title, linked, level, read: false }));

export const auditEntries = [
  { actor: 'نورا الحارثي', role: 'مدير Tiger Care', action: 'تصعيد تذكرة', entity: 'TC-2107', reason: 'تحتاج مراجعة إدارية', time: '2026-07-16 10:42', scope: 'Tiger Care - عمّان', result: 'تم', risk: 'متوسط' },
  { actor: 'سامر الدروبي', role: 'مشرف محتوى', action: 'طلب معلومات إضافية', entity: 'R-502', reason: 'دليل غير مكتمل', time: '2026-07-16 09:14', scope: 'غرب عمّان', result: 'بانتظار رد', risk: 'منخفض' },
  { actor: 'دلال عبيدات', role: 'مخول تعيين الأدوار', action: 'طلب مراجعة صلاحية', entity: 'EMP-309', reason: 'نطاق جديد مطلوب', time: '2026-07-15 16:20', scope: 'global', result: 'قيد المراجعة', risk: 'عالي' },
];
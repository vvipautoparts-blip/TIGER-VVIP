export const PROFILE = { name: 'سارة النمري', type: 'individual_seller', region: 'عمّان', area: 'غرب عمّان', status: 'active', trialStart: '2026-04-01', trialEnd: '2026-08-01', daysLeft: 16, postingState: 'Authorized' };
export const LISTINGS = [
  { id:'L-101', title:'طقم فلاتر محرك أصلي', sector:'قطع السيارات وخدماتها', category:'قطع غيار', price:42, region:'عمّان', area:'غرب عمّان', summary:'قطع جديدة مع مواصفات واضحة.', specs:'المقاس القياسي · ضمان تجريبي', owner:'متجر مدار', color:'auto' },
  { id:'L-202', title:'أرضيات بورسلان للمشاريع', sector:'المواد والتوريدات', category:'مواد بناء', price:18, region:'الزرقاء', area:'وسط الزرقاء', summary:'توريد محلي للمشاريع الصغيرة.', specs:'مقاوم للخدش · 60×60', owner:'شركة البوصلة', color:'materials' },
  { id:'L-303', title:'مكتب جاهز للأعمال', sector:'العقارات', category:'مكاتب', price:650, region:'عمّان', area:'الشميساني', summary:'مساحة عملية في منطقة أعمال.', specs:'مفروش · موقف واحد', owner:'مكتب الساحة', color:'estate' }
];
export const NOTIFICATIONS = [
  ['إعلان يحتاج تعديلًا', 'L-101', false], ['رسالة جديدة', 'M-1', false], ['تحديث Tiger Care', 'TC-901', true], ['انتهاء إعلان قريبًا', 'L-303', true], ['طلب صلاحية نشر', 'posting', true], ['تنبيه أمني تجريبي', 'profile', true]
].map(([title, link, read]) => ({ title, link, read }));
export const MESSAGES = [{ id:'M-1', person:'متجر مدار', subject:'استفسار عن الفلاتر', messages:[['متجر مدار','مرحبًا، هل القطعة متاحة؟'],['سارة النمري','نعم، المعاينة توضح أنها متاحة.']] }];
export const TICKETS = [{ id:'TC-901', title:'طلب مراجعة صلاحية نشر', status:'قيد المراجعة', priority:'متوسطة', timeline:['تم استلام الطلب','تمت مراجعته في المعاينة'] }];
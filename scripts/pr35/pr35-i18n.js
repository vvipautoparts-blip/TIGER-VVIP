const ar = {
  'mode.local': 'وضع عرض محلي — لا يتم الحفظ في قاعدة بيانات بعيدة.',
  'mode.productionUnavailable': 'الخدمة الآمنة غير مهيأة حاليًا. لم يتم حفظ أي تغيير.',
  'care.title': 'طلب إلى Tiger Care',
  'care.confirmation': 'تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة.',
  'care.pending': 'جاري إرسال الطلب…',
  'care.failed': 'تعذر إرسال الطلب بأمان. يمكنك المحاولة مرة أخرى.',
  'care.offlinePending': 'الطلب معلّق على هذا الجهاز حتى عودة الاتصال.',
  'common.close': 'إغلاق', 'common.cancel': 'إلغاء', 'common.continue': 'متابعة',
  'common.retry': 'إعادة المحاولة', 'common.loading': 'جاري التحميل…',
  'common.empty': 'لا توجد نتائج مطابقة حاليًا.', 'common.denied': 'هذا الإجراء غير متاح لصلاحياتك الحالية.'
};
const en = {
  'mode.local': 'Local demo mode — changes are not saved to a remote database.',
  'mode.productionUnavailable': 'Secure service is not configured. No change was saved.',
  'care.title': 'Tiger Care request',
  'care.confirmation': 'Your request has been received. We will contact you within 24 hours.',
  'care.pending': 'Sending your request…',
  'care.failed': 'Your request could not be sent safely. Please try again.',
  'care.offlinePending': 'This request is pending on this device until the connection returns.',
  'common.close': 'Close', 'common.cancel': 'Cancel', 'common.continue': 'Continue',
  'common.retry': 'Retry', 'common.loading': 'Loading…',
  'common.empty': 'No matching results yet.', 'common.denied': 'This action is unavailable with your current permissions.'
};

export const dictionaries = Object.freeze({ ar: Object.freeze(ar), en: Object.freeze(en) });
export function translate(key, lang = 'ar', params = {}) {
  const dictionary = dictionaries[lang] || dictionaries.ar;
  return String(dictionary[key] || dictionaries.ar[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
export function setDocumentLanguage(lang = 'ar', documentRef = document) {
  const selected = lang === 'en' ? 'en' : 'ar';
  documentRef.documentElement.lang = selected;
  documentRef.documentElement.dir = selected === 'ar' ? 'rtl' : 'ltr';
  return selected;
}

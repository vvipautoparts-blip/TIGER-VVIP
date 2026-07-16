export const SECURITY_NOTICE = 'CLIENT-SIDE USER JOURNEY PREVIEW IS NOT A PRODUCTION APPLICATION. AUTHENTICATION, AUTHORIZATION, DATA STORAGE, LIMITS AND SECURITY MUST BE ENFORCED BY AUTHORIZED BACKEND PHASES.';

export const USER_TYPES = [
  ['viewer', 'المشاهد'], ['standard_buyer', 'المشتري القياسي'], ['individual_seller', 'البائع الفردي'], ['parts_shop', 'متجر قطع غيار'], ['maintenance_center', 'مركز صيانة'], ['electrical_hybrid_center', 'مركز كهرباء وهجين'], ['general_service_center', 'مركز خدمات عامة'], ['dealer_distributor', 'وكيل أو موزع'], ['company_institution', 'شركة أو مؤسسة'], ['service_provider', 'مزود خدمة'], ['personal_vip', 'مستخدم VIP شخصي']
].map(([id, label]) => ({ id, label }));

export const SECTORS = ['قطع السيارات وخدماتها', 'المواد والتوريدات', 'العقارات'];
export const POSTING_STATES = ['Authorized', 'Pending approval', 'Not authorized', 'Sector mismatch', 'Weekly limit reached', 'Account suspended', 'Trial expired', 'Missing required profile data'];

export function canMessage(type) { return type !== 'viewer'; }
export function canPublish(type, postingState = 'Not authorized') { return type !== 'viewer' && postingState === 'Authorized'; }
export function publishingGuidance(postingState) {
  return postingState === 'Authorized' ? 'يمكنك إكمال مراجعة الإعلان التجريبية.' : 'نوع الحساب لا يمنح صلاحية النشر تلقائيًا. أكمل الملف أو اطلب التخويل أو تواصل مع Tiger Care.';
}
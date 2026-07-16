export const SECURITY_NOTICE = 'CLIENT-SIDE ROLE PREVIEW IS NOT A SECURITY BOUNDARY. REAL AUTHORIZATION MUST BE ENFORCED BY BACKEND/RLS IN A LATER AUTHORIZED SECURITY PHASE.';

export const ROLES = [
  ['owner_super_admin', 'المالك / المدير الأعلى', 'global'],
  ['platform_admin', 'مدير المنصة', 'global'],
  ['sector_manager', 'مدير القطاع', 'sector'],
  ['regional_manager', 'المدير الإقليمي', 'region'],
  ['area_manager', 'مدير المنطقة', 'area'],
  ['tiger_care_manager', 'مدير Tiger Care', 'assigned_queue'],
  ['tiger_care_agent', 'موظف Tiger Care', 'assigned_queue'],
  ['moderator', 'المشرف على المحتوى والبلاغات', 'assigned_queue'],
  ['sales_manager', 'مدير المبيعات', 'region'],
  ['sales_agent', 'موظف المبيعات', 'own_records'],
  ['marketing_manager', 'مدير التسويق', 'global'],
  ['campaign_manager', 'مدير الحملات', 'sector'],
  ['service_provider_coordinator', 'منسق مزودي الخدمات', 'region'],
  ['authorized_role_assigner', 'الشخص المخول بتعيين الأدوار', 'global'],
  ['regular_user', 'مستخدم عادي للمقارنة', 'own_records'],
].map(([id, label, defaultScope]) => ({ id, label, defaultScope }));

export const SCOPES = ['global', 'sector', 'region', 'area', 'assigned_queue', 'own_records'];

export function allowedScopes(role) {
  const roleDefinition = ROLES.find((item) => item.id === role);
  return roleDefinition ? [roleDefinition.defaultScope] : [];
}

const all = ['overview', 'users', 'employees', 'listings', 'reports', 'alerts', 'audit', 'matrix', 'settings', 'sectors', 'regions', 'sales', 'marketing', 'providers', 'tiger-care', 'moderation'];
const limited = ['overview', 'users', 'employees', 'listings', 'reports', 'alerts', 'sectors', 'regions', 'tiger-care', 'moderation', 'sales', 'marketing', 'providers'];

export const ACCESS = {
  owner_super_admin: all,
  platform_admin: all.filter((screen) => screen !== 'settings'),
  sector_manager: ['overview', 'users', 'listings', 'reports', 'alerts', 'sectors', 'tiger-care', 'moderation'],
  regional_manager: ['overview', 'users', 'employees', 'listings', 'reports', 'alerts', 'regions', 'tiger-care', 'moderation', 'providers'],
  area_manager: ['overview', 'users', 'employees', 'listings', 'alerts', 'regions', 'tiger-care', 'moderation'],
  tiger_care_manager: ['overview', 'tiger-care', 'alerts', 'reports'],
  tiger_care_agent: ['overview', 'tiger-care', 'alerts'],
  moderator: ['overview', 'listings', 'moderation', 'alerts'],
  sales_manager: ['overview', 'sales', 'alerts', 'reports'],
  sales_agent: ['overview', 'sales', 'alerts'],
  marketing_manager: ['overview', 'marketing', 'alerts', 'reports'],
  campaign_manager: ['overview', 'marketing', 'alerts'],
  service_provider_coordinator: ['overview', 'providers', 'alerts'],
  authorized_role_assigner: ['overview', 'employees', 'matrix', 'audit', 'alerts'],
  regular_user: [],
};

export const PERMISSION_COLUMNS = [
  ['overview', 'مشاهدة لوحة العمليات'], ['users', 'مشاهدة المستخدمين'], ['account', 'تعديل حالة الحساب'],
  ['listings', 'مراجعة الإعلانات'], ['moderation', 'معالجة البلاغات'], ['tiger-care', 'معالجة Tiger Care'],
  ['employees', 'تعيين الموظفين'], ['assign-role', 'تعيين الأدوار'], ['reports', 'مشاهدة التقارير'],
  ['audit', 'مشاهدة Audit Log'], ['settings', 'الإعدادات العامة'], ['scope', 'حدود Scope'],
];

export function canAccess(role, screen) {
  return Boolean(ACCESS[role]?.includes(screen));
}

export function canAssignRoles(role) {
  return ['owner_super_admin', 'authorized_role_assigner'].includes(role);
}

export function permissionStatus(role, permission) {
  if (role === 'regular_user') return 'غير مسموح';
  if (permission === 'assign-role') return canAssignRoles(role) ? 'مسموح' : 'يحتاج موافقة أعلى';
  if (permission === 'settings') return role === 'owner_super_admin' ? 'مسموح' : 'غير مسموح';
  if (permission === 'account' && role === 'platform_admin') return 'محدود بالنطاق';
  return canAccess(role, permission) || ['account', 'scope'].includes(permission) ? (ROLES.find((item) => item.id === role)?.defaultScope === 'global' ? 'مسموح' : 'محدود بالنطاق') : 'غير مسموح';
}

export function isInScope(item, context) {
  if (context.scope === 'global') return true;
  if (context.scope === 'sector') return item.sector === context.sector;
  if (context.scope === 'region') return item.region === context.region;
  if (context.scope === 'area') return item.area === context.area;
  if (context.scope === 'assigned_queue') return item.queue === context.queue || item.assignee === context.actor;
  return item.owner === context.actor || item.assignee === context.actor;
}
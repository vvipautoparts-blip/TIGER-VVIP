const frozen = (values) => Object.freeze([...values]);

export const ROLE_IDS = frozen(['owner', 'platform_admin', 'sector_manager', 'regional_manager',
  'area_manager', 'group_manager', 'campaign_manager', 'sales', 'marketing', 'tiger_care',
  'moderator', 'service_provider', 'regular_user']);

export const PERMISSION_IDS = frozen(['owner.console.read', 'authorization.assignment.read',
  'authorization.assignment.manage', 'authorization.owner.manage',
  'authorization.permission.delegate', 'care.request.create', 'care.ticket.read.own',
  'care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.assign',
  'care.ticket.transition', 'care.ticket.escalate', 'care.ticket.resolve',
  'care.message.create.own', 'care.message.create.scoped', 'care.internal_note.read',
  'care.internal_note.create', 'care.routing.manage', 'care.sla.manage',
  'audit.event.read.scoped', 'audit.event.append']);

export const SCOPE_LEVELS = frozen(['platform', 'sector', 'region', 'area', 'team']);
export const ASSIGNMENT_STATES = frozen(['pending', 'active', 'suspended', 'revoked', 'expired']);
export const CARE_CATEGORIES = frozen(['management_contact', 'support', 'complaint_report',
  'missing_category', 'rejection_appeal', 'account_issue', 'sector_access_request',
  'fraud_safety', 'other']);
export const CARE_PRIORITIES = frozen(['low', 'normal', 'high', 'urgent']);
export const TICKET_STATUSES = frozen(['new', 'acknowledged', 'in_review', 'waiting_user',
  'escalated', 'resolved', 'closed', 'cancelled']);

const permissions = (...ids) => Object.freeze({ permissionIds: frozen(ids) });
const allExceptBackendAudit = PERMISSION_IDS.filter((id) => id !== 'audit.event.append');
export const ROLE_TEMPLATES = Object.freeze({
  owner: permissions(...allExceptBackendAudit),
  platform_admin: permissions('owner.console.read', 'authorization.assignment.read',
    'authorization.assignment.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped',
    'care.ticket.acknowledge', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate',
    'care.ticket.resolve', 'care.message.create.scoped', 'care.routing.manage', 'care.sla.manage',
    'audit.event.read.scoped'),
  sector_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
  regional_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition', 'care.ticket.escalate'),
  area_manager: permissions('care.ticket.read.scoped', 'care.ticket.assign', 'care.ticket.transition'),
  group_manager: permissions('care.ticket.read.scoped', 'care.ticket.transition'),
  campaign_manager: permissions('care.ticket.read.scoped'), sales: permissions(), marketing: permissions(),
  tiger_care: permissions('care.ticket.read.scoped', 'care.ticket.acknowledge', 'care.ticket.transition',
    'care.ticket.escalate', 'care.ticket.resolve', 'care.message.create.scoped'),
  moderator: permissions('care.ticket.read.scoped'), service_provider: permissions(),
  regular_user: permissions('care.request.create', 'care.ticket.read.own', 'care.message.create.own')
});

export const ERROR_CODES = Object.freeze({
  PAGE_LIMIT_EXCEEDED: 'PAGE_LIMIT_EXCEEDED', FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  INVALID_CORRELATION_KEY: 'INVALID_CORRELATION_KEY', INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY'
});
export const LIMITS = Object.freeze({ PAGE_DEFAULT: 20, PAGE_MAX: 50, CURSOR: 256, KEY: 128,
  TEXT: 500, REASON: 500, LIST: 50, AUDIT_METADATA_KEYS: 20 });

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
function validateKey(value, prefix, code) {
  return typeof value === 'string' && value.startsWith(prefix) && keyPattern.test(value)
    ? { ok: true, code: 'OK', value }
    : { ok: false, code };
}
export const validateCorrelationKey = (value) => validateKey(value, 'corr_', ERROR_CODES.INVALID_CORRELATION_KEY);
export const validateIdempotencyKey = (value) => validateKey(value, 'idem_', ERROR_CODES.INVALID_IDEMPOTENCY_KEY);

export function validatePageRequest({ limit = LIMITS.PAGE_DEFAULT, cursor = null } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.PAGE_MAX) return { ok: false, code: ERROR_CODES.PAGE_LIMIT_EXCEEDED };
  if (cursor !== null && (typeof cursor !== 'string' || [...cursor].length > LIMITS.CURSOR)) return { ok: false, code: ERROR_CODES.FIELD_TOO_LONG };
  return { ok: true, code: 'OK', value: { limit, cursor } };
}

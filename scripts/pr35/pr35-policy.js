import { PERMISSION_IDS, ROLE_IDS } from './pr35-contracts.js';
import { normalizeScope, scopeContains } from './pr35-scope.js';

const rank = Object.freeze({ regular_user: 0, service_provider: 1, sales: 1, marketing: 1,
  moderator: 2, tiger_care: 2, campaign_manager: 3, group_manager: 4,
  regional_manager: 6, sector_manager: 7, platform_admin: 8, owner: 9 });
const decision = (allowed, code, ids = []) => Object.freeze({ allowed, code, effectiveAssignmentIds: Object.freeze([...ids]) });

function identityFailure(actor) {
  if (!actor?.id) return 'IDENTITY_REQUIRED';
  if (actor.accountState === 'suspended') return 'ACCOUNT_SUSPENDED';
  if (actor.accountState !== 'active') return 'ACCOUNT_INACTIVE';
  if (actor.sessionValidAfter && (!actor.sessionIssuedAt || Date.parse(actor.sessionIssuedAt) < Date.parse(actor.sessionValidAfter))) return 'SESSION_INVALIDATED';
  return null;
}
export function resolveEffectiveAssignments({ actor, now }) {
  if (identityFailure(actor) || !Number.isFinite(Date.parse(now))) return [];
  const at = Date.parse(now);
  return (Array.isArray(actor.assignments) ? actor.assignments : []).filter((item) =>
    item?.state === 'active' && item.subjectId === actor.id && Number.isFinite(Date.parse(item.startsAt)) &&
    Date.parse(item.startsAt) <= at && (!item.expiresAt || Date.parse(item.expiresAt) > at));
}
export function authorize({ actor, permission, resourceScope, now }) {
  const failure = identityFailure(actor); if (failure) return decision(false, failure);
  if (!PERMISSION_IDS.includes(permission)) return decision(false, 'UNKNOWN_PERMISSION');
  let scope; try { scope = normalizeScope(resourceScope); } catch { return decision(false, 'INVALID_SCOPE'); }
  const assignments = resolveEffectiveAssignments({ actor, now });
  const owned = assignments.filter((item) => Array.isArray(item.permissionIds) && item.permissionIds.includes(permission));
  if (!owned.length) return decision(false, 'PERMISSION_DENIED');
  const contained = owned.filter((item) => scopeContains(item.scope, scope));
  if (!contained.length) return decision(false, 'SCOPE_DENIED');
  return decision(true, 'AUTHORIZED', contained.map((item) => item.id).sort());
}
export function canDelegate({ actor, subjectId, permissionIds, scope, roleId, now }) {
  if (!subjectId || subjectId === actor?.id) return decision(false, 'SELF_ELEVATION_DENIED');
  if (!ROLE_IDS.includes(roleId)) return decision(false, 'UNKNOWN_ROLE');
  if (!Array.isArray(permissionIds) || permissionIds.length > 50 || new Set(permissionIds).size !== permissionIds.length) return decision(false, 'INVALID_PERMISSION_LIST');
  if (permissionIds.some((id) => !PERMISSION_IDS.includes(id))) return decision(false, 'UNKNOWN_PERMISSION');
  const effective = resolveEffectiveAssignments({ actor, now });
  if (identityFailure(actor)) return decision(false, identityFailure(actor));
  const permissionOwners = effective.filter((item) => scopeContains(item.scope, scope));
  const ownerAssignment = effective.find((item) => item.roleId === 'owner' && item.permissionIds?.includes('authorization.owner.manage') && scopeContains(item.scope, scope));
  if (roleId === 'owner' || permissionIds.includes('authorization.owner.manage')) {
    if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
    return ownerAssignment ? decision(true, 'AUTHORIZED', [ownerAssignment.id]) : decision(false, 'OWNER_CONTROL_REQUIRED');
  }
  const delegators = effective.filter((item) => item.permissionIds?.includes('authorization.permission.delegate') && scopeContains(item.scope, scope));
  if (!delegators.length) return decision(false, 'DELEGATION_SCOPE_EXCEEDED');
  if (permissionIds.some((permission) => !permissionOwners.some((item) => item.permissionIds?.includes(permission)))) return decision(false, 'UNOWNED_PERMISSION_DENIED');
  const ceiling = Math.max(...delegators.map((item) => rank[item.roleId] ?? -1));
  if ((rank[roleId] ?? Infinity) >= ceiling) return decision(false, 'DELEGATION_AUTHORITY_EXCEEDED');
  return decision(true, 'AUTHORIZED', delegators.map((item) => item.id).sort());
}

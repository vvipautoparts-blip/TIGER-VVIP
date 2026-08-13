'use strict';

const { evaluateOwnerAccess } = require('./owner-access-policy.js');

const QUERIES = Object.freeze({
  READ_OWNER_SECURITY_SUMMARY: Object.freeze({ level: 'L1' }),
  READ_OWNER_PUBLIC_PROFILE: Object.freeze({ level: 'L1' }),
  READ_OWNER_PRIVATE_VAULT_METADATA: Object.freeze({ level: 'L3' }),
});
function fail(code) { return Object.freeze({ ok: false, code }); }
function bounded(value, max = 256) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function isPlain(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const p = Object.getPrototypeOf(value); return p === Object.prototype || p === null; }
function pick(source, keys) { const out = {}; for (const key of keys) if (source && Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key]; return Object.freeze(out); }
function createOwnerQueryBoundary(deps) {
  const configured = deps && typeof deps.loadOwnerContext === 'function' && typeof deps.clock === 'function'
    && typeof deps.loadPublicProfile === 'function' && typeof deps.loadPrivateVaultMetadata === 'function';
  if (!configured) return Object.freeze({ execute: async () => fail('ERR_OWNER_QUERY_CONFIGURATION') });
  return Object.freeze({ async execute(request) {
    if (!isPlain(request) || !bounded(request.authenticatedClerkUserId) || !bounded(request.sessionId) || !QUERIES[request.queryCode]) return fail('ERR_OWNER_QUERY_INVALID');
    let context;
    try { context = await deps.loadOwnerContext({ clerkUserId: request.authenticatedClerkUserId, sessionId: request.sessionId }); }
    catch { return fail('ERR_OWNER_TRUSTED_CONTEXT_UNAVAILABLE'); }
    if (!isPlain(context) || !isPlain(context.auth) || context.auth.clerkUserId !== request.authenticatedClerkUserId || context.auth.sessionId !== request.sessionId) return fail('ERR_OWNER_TRUSTED_CONTEXT_MISMATCH');
    const query = QUERIES[request.queryCode];
    const access = evaluateOwnerAccess({ authority: context.authority, security: context.security, auth: context.auth, requiredLevel: query.level }, { now: deps.clock });
    if (!access.allowed) return fail(access.code);
    if (request.queryCode === 'READ_OWNER_SECURITY_SUMMARY') return Object.freeze({ ok: true, code: 'OWNER_QUERY_OK', data: pick({ ...context.security, authorityStatus: context.authority.status }, ['authorityStatus','killSwitch','l4Enabled','holdState','recoveryState','securityVersion']) });
    try {
      if (request.queryCode === 'READ_OWNER_PUBLIC_PROFILE') {
        const row = await deps.loadPublicProfile(context.authority.ownerAuthorityId);
        return Object.freeze({ ok: true, code: 'OWNER_QUERY_OK', data: pick(row, ['publicDisplayName','publicTitle','publicCountryCode','publicBio','publicAvatarUrl','approvedPublicContactUrl','verifiedOwnerBadge','publicationStatus','publicVersion']) });
      }
      const row = await deps.loadPrivateVaultMetadata(context.authority.ownerAuthorityId);
      return Object.freeze({ ok: true, code: 'OWNER_QUERY_OK', data: pick(row, ['classification','dataVersion','keyVersion','cipherSuite','retentionPolicy','updatedAt']) });
    } catch {
      return fail('ERR_OWNER_QUERY_ENFORCEMENT_FAILED');
    }
  }});
}
module.exports = Object.freeze({ createOwnerQueryBoundary, QUERIES });

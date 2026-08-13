'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOwnerQueryBoundary } = require('../scripts/security/soa/owner-query-boundary.js');
const NOW = '2026-08-13T13:01:00.000Z';
function context(overrides = {}) { return { authority: { ownerAuthorityId: 'oa_1', status: 'ACTIVE', clerkUserId: 'user_owner' }, security: { killSwitch: false, holdState: 'CLEAR', recoveryState: 'NONE', l4Enabled: false, securityVersion: 3 }, auth: { clerkUserId: 'user_owner', sessionId: 'sess_1', sessionAuthenticated: true, mfaVerifiedAt: '2026-08-13T13:00:00.000Z', reverifiedAt: '2026-08-13T13:00:00.000Z', ...(overrides.auth || {}) }, policyVersion: 'SOA-2026.1' }; }
function boundary(trusted = context()) { return createOwnerQueryBoundary({ loadOwnerContext: async () => trusted, clock: () => NOW, loadPublicProfile: async () => ({ publicDisplayName: 'Owner', publicTitle: 'Founder', publicCountryCode: 'JO', publicBio: 'Bio', publicAvatarUrl: '/avatar.webp', approvedPublicContactUrl: null, verifiedOwnerBadge: true, publicationStatus: 'PUBLISHED', publicVersion: 7, publishedBy: 'internal_actor', ownerAuthorityId: 'oa_1' }), loadPrivateVaultMetadata: async () => ({ classification: 'OWNER_RESTRICTED', dataVersion: 2, keyVersion: 'kms-v1', cipherSuite: 'AES-256-GCM', retentionPolicy: 'OWNER-LIFECYCLE', updatedAt: NOW, encryptedPayload: 'ciphertext', privateEmail: 'secret@example.invalid' }) }); }
function req(queryCode) { return { authenticatedClerkUserId: 'user_owner', sessionId: 'sess_1', queryCode }; }

test('owner dashboard summary is minimal and omits identity/vault data', async () => { const result = await boundary().execute(req('READ_OWNER_SECURITY_SUMMARY')); assert.equal(result.ok, true); assert.deepEqual(Object.keys(result.data).sort(), ['authorityStatus','holdState','killSwitch','l4Enabled','recoveryState','securityVersion'].sort()); });

test('owner public profile query strips internal metadata', async () => { const result = await boundary().execute(req('READ_OWNER_PUBLIC_PROFILE')); assert.equal(result.ok, true); assert.equal('publishedBy' in result.data, false); assert.equal('ownerAuthorityId' in result.data, false); assert.equal(result.data.publicDisplayName, 'Owner'); });

test('private vault metadata requires L3 and never returns ciphertext or plaintext PII', async () => { const stale = await boundary(context({ auth: { reverifiedAt: '2026-08-13T12:50:00.000Z' } })).execute(req('READ_OWNER_PRIVATE_VAULT_METADATA')); assert.equal(stale.code, 'ERR_OWNER_REVERIFICATION_REQUIRED'); const result = await boundary().execute(req('READ_OWNER_PRIVATE_VAULT_METADATA')); assert.equal(result.ok, true); assert.equal('encryptedPayload' in result.data, false); assert.equal('privateEmail' in result.data, false); assert.deepEqual(Object.keys(result.data).sort(), ['classification','dataVersion','keyVersion','cipherSuite','retentionPolicy','updatedAt'].sort()); });

test('security context cannot override authoritative status and provider errors fail closed', async () => {
  const poisoned = context();
  poisoned.security.authorityStatus = 'REVOKED';
  const summary = await boundary(poisoned).execute(req('READ_OWNER_SECURITY_SUMMARY'));
  assert.equal(summary.data.authorityStatus, 'ACTIVE');
  const failing = createOwnerQueryBoundary({
    loadOwnerContext: async () => context(),
    clock: () => NOW,
    loadPublicProfile: async () => { throw new Error('database secret detail'); },
    loadPrivateVaultMetadata: async () => ({})
  });
  const result = await failing.execute(req('READ_OWNER_PUBLIC_PROFILE'));
  assert.deepEqual(result, { ok: false, code: 'ERR_OWNER_QUERY_ENFORCEMENT_FAILED' });
});

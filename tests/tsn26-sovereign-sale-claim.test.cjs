'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  createUnsignedClaim,
  signAndLockClaim,
  verifyLockedClaim,
  resolveWinningClaim,
} = require('../src/tsn26/sovereign-sale-claim.cjs');

function baseClaim(overrides = {}) {
  return createUnsignedClaim({
    claimId: 'claim-001',
    sellerUid: 'seller-001',
    sellerRole: 'MARKETER',
    buyerUid: 'buyer-001',
    offerId: 'T45',
    sectorId: 'AUTO',
    countryId: 'JO',
    issuedAt: '2026-08-26T00:00:00.000Z',
    expiresAt: '2026-08-26T01:00:00.000Z',
    nonce: 'nonce-001',
    ...overrides,
  });
}

test('claim is cryptographically locked and verifiable before settlement', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const locked = signAndLockClaim(baseClaim(), { privateKey, keyId: 'seller-key-1' });
  assert.equal(locked.status, 'LOCKED');
  assert.equal(Object.isFrozen(locked), true);
  assert.equal(verifyLockedClaim(locked, { publicKey, now: '2026-08-26T00:30:00.000Z' }), true);
});

test('tampering after signature invalidates the claim', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const locked = signAndLockClaim(baseClaim(), { privateKey, keyId: 'seller-key-1' });
  const tampered = { ...locked, sellerUid: 'attacker' };
  assert.throws(
    () => verifyLockedClaim(tampered, { publicKey, now: '2026-08-26T00:30:00.000Z' }),
    /TSN26_CLAIM_SIGNATURE_INVALID/,
  );
});

test('expired claims fail closed', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const locked = signAndLockClaim(baseClaim(), { privateKey, keyId: 'seller-key-1' });
  assert.throws(
    () => verifyLockedClaim(locked, { publicKey, now: '2026-08-26T01:00:00.001Z' }),
    /TSN26_CLAIM_EXPIRED/,
  );
});

test('multiple valid claims require an explicit deterministic winner or fail closed', () => {
  const keysA = crypto.generateKeyPairSync('ed25519');
  const keysB = crypto.generateKeyPairSync('ed25519');
  const a = signAndLockClaim(baseClaim({ claimId: 'claim-a' }), { privateKey: keysA.privateKey, keyId: 'key-a' });
  const b = signAndLockClaim(baseClaim({ claimId: 'claim-b', sellerUid: 'seller-b', sellerRole: 'SECTOR_MANAGER' }), { privateKey: keysB.privateKey, keyId: 'key-b' });

  assert.throws(
    () => resolveWinningClaim([a, b], { explicitClaimId: null }),
    /TSN26_AMBIGUOUS_SALE_CLAIMS/,
  );
  assert.equal(resolveWinningClaim([a, b], { explicitClaimId: 'claim-b' }).claimId, 'claim-b');
});

test('invalid seller roles cannot create sovereign claims', () => {
  assert.throws(() => baseClaim({ sellerRole: 'PARTNER_1' }), /TSN26_INVALID_SELLER_ROLE/);
  assert.throws(() => baseClaim({ sellerRole: 'OWNER' }), /TSN26_INVALID_SELLER_ROLE/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createUnsignedClaim, signAndLockClaim } = require('../src/tsn26/sovereign-sale-claim.cjs');
const { orchestratePurchaseSettlement } = require('../src/tsn26/settlement-orchestrator.cjs');

function signedClaim() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const claim = createUnsignedClaim({
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
  });
  return {
    publicKey,
    locked: signAndLockClaim(claim, { privateKey, keyId: 'seller-key-1' }),
  };
}

test('verified locked sale claim is the only path to a seller 7% allocation', () => {
  const { publicKey, locked } = signedClaim();
  const result = orchestratePurchaseSettlement({
    grossMicro: 45_000_000n,
    saleClaim: locked,
    claimVerification: { publicKey, now: '2026-08-26T00:30:00.000Z' },
  });
  assert.equal(result.attribution.mode, 'SALE_CLAIM');
  assert.equal(result.attribution.sellerRole, 'MARKETER');
  assert.equal(result.attribution.sellerUid, 'seller-001');
  assert.equal(result.allocation.allocations.marketer, 3_150_000n);
});

test('null claim is explicit direct purchase and applies 7% discount before allocation', () => {
  const result = orchestratePurchaseSettlement({
    grossMicro: 45_000_000n,
    saleClaim: null,
  });
  assert.equal(result.attribution.mode, 'DIRECT_PURCHASE');
  assert.equal(result.allocation.discountMicro, 3_150_000n);
  assert.equal(result.allocation.collectedMicro, 41_850_000n);
  assert.equal(result.allocation.allocations.salesAbsence, 8_788_500n);
});

test('raw seller role injection is rejected rather than treated as entitlement evidence', () => {
  assert.throws(
    () => orchestratePurchaseSettlement({ grossMicro: 45_000_000n, sellerRole: 'MARKETER' }),
    /TSN26_RAW_SELLER_ROLE_FORBIDDEN/,
  );
});

test('tampered or unverifiable claim never reaches financial allocation', () => {
  const { publicKey, locked } = signedClaim();
  const tampered = { ...locked, sellerUid: 'attacker' };
  assert.throws(
    () => orchestratePurchaseSettlement({
      grossMicro: 45_000_000n,
      saleClaim: tampered,
      claimVerification: { publicKey, now: '2026-08-26T00:30:00.000Z' },
    }),
    /TSN26_CLAIM_/,
  );
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const identity = require('../scripts/platform/platform-identity-contract.js');

function input(overrides = {}) {
  return {
    brandUid: 'brand:global:vvip:001',
    displayName: 'VVIP TIGER',
    domain: 'example.com',
    themeId: 'theme:sovereign-dark',
    incorporationJurisdiction: 'US-DE',
    deploymentRegion: 'eu-central-1',
    marketGeography: 'JO',
    policyAdapterId: 'policy:market:jo:v1',
    ...overrides,
  };
}

test('brandUid is explicit stable identity and is not derived from mutable branding', () => {
  const original = identity.createPlatformIdentity(input());
  const renamed = identity.rebrandPlatformIdentity(original, {
    displayName: 'New Public Name',
    domain: 'new-example.net',
    themeId: 'theme:minimal-light',
  });

  assert.equal(original.brandUid, 'brand:global:vvip:001');
  assert.equal(renamed.brandUid, original.brandUid);
  assert.equal(renamed.displayName, 'New Public Name');
  assert.equal(renamed.domain, 'new-example.net');
  assert.equal(renamed.themeId, 'theme:minimal-light');
  assert.notEqual(renamed.displayName, original.displayName);
  assert.equal(Object.isFrozen(original), true);
  assert.equal(Object.isFrozen(renamed), true);
});

test('rebrand cannot mutate canonical identity or jurisdiction/deployment/market context', () => {
  const original = identity.createPlatformIdentity(input());

  for (const forbidden of [
    ['brandUid', 'brand:other'],
    ['incorporationJurisdiction', 'GB'],
    ['deploymentRegion', 'us-east-1'],
    ['marketGeography', 'US'],
    ['policyAdapterId', 'policy:other'],
  ]) {
    assert.throws(
      () => identity.rebrandPlatformIdentity(original, { [forbidden[0]]: forbidden[1] }),
      /rebrand|canonical|context|policy/i,
    );
  }
});

test('incorporation jurisdiction, deployment region and market geography are separate explicit fields', () => {
  const model = identity.createPlatformIdentity(input());

  assert.equal(model.incorporationJurisdiction, 'US-DE');
  assert.equal(model.deploymentRegion, 'eu-central-1');
  assert.equal(model.marketGeography, 'JO');
  assert.equal(model.policyAdapterId, 'policy:market:jo:v1');
  assert.equal('masterCountry' in model, false);
  assert.equal('homeCountry' in model, false);
  assert.equal('sovereignCountryMaster' in model, false);
});

test('same stable brand can be represented in a different market/deployment context without rebranding identity', () => {
  const jordan = identity.createPlatformIdentity(input());
  const portugal = identity.createPlatformIdentity(input({
    deploymentRegion: 'eu-west-1',
    marketGeography: 'PT',
    policyAdapterId: 'policy:market:pt:v1',
  }));

  assert.equal(jordan.brandUid, portugal.brandUid);
  assert.equal(jordan.displayName, portugal.displayName);
  assert.notEqual(jordan.marketGeography, portugal.marketGeography);
  assert.notEqual(jordan.deploymentRegion, portugal.deploymentRegion);
  assert.notEqual(jordan.policyAdapterId, portugal.policyAdapterId);
});

test('context fields are required independently and are never inferred from one another', () => {
  for (const field of [
    'incorporationJurisdiction',
    'deploymentRegion',
    'marketGeography',
    'policyAdapterId',
  ]) {
    const value = input();
    delete value[field];
    assert.throws(() => identity.createPlatformIdentity(value), new RegExp(field, 'i'));
  }

  const sameText = identity.createPlatformIdentity(input({
    incorporationJurisdiction: 'GLOBAL-X',
    deploymentRegion: 'GLOBAL-X',
    marketGeography: 'GLOBAL-X',
  }));
  assert.equal(sameText.incorporationJurisdiction, 'GLOBAL-X');
  assert.equal(sameText.deploymentRegion, 'GLOBAL-X');
  assert.equal(sameText.marketGeography, 'GLOBAL-X');
  assert.notStrictEqual(
    Object.getOwnPropertyDescriptor(sameText, 'incorporationJurisdiction'),
    Object.getOwnPropertyDescriptor(sameText, 'marketGeography'),
  );
});

test('there is no built-in required country master or country-specific canonical brand ID', () => {
  const model = identity.createPlatformIdentity(input({
    brandUid: 'brand:universal:001',
    incorporationJurisdiction: 'CA-BC',
    deploymentRegion: 'ap-southeast-2',
    marketGeography: 'NZ',
    policyAdapterId: 'policy:market:nz:v3',
  }));

  assert.equal(model.brandUid, 'brand:universal:001');
  assert.doesNotMatch(model.brandUid, /JO|Jordan|US-DE|NZ/i);
  assert.equal(identity.REQUIRED_MASTER_COUNTRY, undefined);
});

test('applicable policy adapter is mandatory and legal-bypass semantics are rejected', () => {
  assert.throws(
    () => identity.createPlatformIdentity(input({ policyAdapterId: '' })),
    /policyAdapterId/i,
  );
  assert.throws(
    () => identity.createPlatformIdentity(input({
      policyAdapterId: 'policy:bypass-all-law',
    })),
    /policy|bypass/i,
  );
  assert.throws(
    () => identity.createPlatformIdentity(input({
      legalBypass: true,
    })),
    /bypass|legal/i,
  );
});

test('mutable display values are validated but never become authority keys', () => {
  assert.throws(() => identity.createPlatformIdentity(input({ brandUid: 'VVIP TIGER' })), /brandUid/i);
  assert.throws(() => identity.createPlatformIdentity(input({ displayName: '' })), /displayName/i);
  assert.throws(() => identity.createPlatformIdentity(input({ domain: 'https://bad path/' })), /domain/i);
  assert.throws(() => identity.createPlatformIdentity(input({ themeId: '' })), /themeId/i);
});

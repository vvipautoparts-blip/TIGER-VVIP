'use strict';

const REBRAND_FIELDS = Object.freeze(['displayName', 'domain', 'themeId']);
const CONTEXT_FIELDS = Object.freeze([
  'incorporationJurisdiction',
  'deploymentRegion',
  'marketGeography',
  'policyAdapterId',
]);

function requireObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function requireBrandUid(value) {
  requireString(value, 'brandUid');
  if (!/^brand:[a-z0-9][a-z0-9:_-]*$/.test(value)) {
    throw new TypeError('brandUid must be an explicit stable canonical brand identifier');
  }
  return value;
}

function requireDomain(value) {
  requireString(value, 'domain');
  if (value.includes('://') || /\s/.test(value) || !/^[A-Za-z0-9.-]+$/.test(value)) {
    throw new TypeError('domain must be a host name without scheme, path, or whitespace');
  }
  if (value.startsWith('.') || value.endsWith('.') || !value.includes('.')) {
    throw new TypeError('domain must be a valid host-like domain');
  }
  return value.toLowerCase();
}

function requirePolicyAdapter(value) {
  requireString(value, 'policyAdapterId');
  if (/bypass|ignore[-_: ]?(law|policy)|override[-_: ]?(law|jurisdiction)/i.test(value)) {
    throw new TypeError('policyAdapterId cannot encode policy or legal bypass semantics');
  }
  return value;
}

function rejectLegalBypassSemantics(input) {
  for (const key of Object.keys(input)) {
    if (/legal.*bypass|bypass.*legal|ignore.*law|law.*ignore/i.test(key) && input[key]) {
      throw new TypeError('legal bypass semantics are forbidden');
    }
  }
}

function createPlatformIdentity(rawInput) {
  const input = requireObject(rawInput, 'platform identity');
  rejectLegalBypassSemantics(input);

  const model = {
    brandUid: requireBrandUid(input.brandUid),
    displayName: requireString(input.displayName, 'displayName'),
    domain: requireDomain(input.domain),
    themeId: requireString(input.themeId, 'themeId'),
    incorporationJurisdiction: requireString(
      input.incorporationJurisdiction,
      'incorporationJurisdiction',
    ),
    deploymentRegion: requireString(input.deploymentRegion, 'deploymentRegion'),
    marketGeography: requireString(input.marketGeography, 'marketGeography'),
    policyAdapterId: requirePolicyAdapter(input.policyAdapterId),
  };

  return Object.freeze(model);
}

function rebrandPlatformIdentity(currentIdentity, rawChanges) {
  const current = createPlatformIdentity(requireObject(currentIdentity, 'currentIdentity'));
  const changes = requireObject(rawChanges, 'rebrand changes');
  rejectLegalBypassSemantics(changes);

  for (const key of Object.keys(changes)) {
    if (!REBRAND_FIELDS.includes(key)) {
      if (key === 'brandUid') {
        throw new TypeError('rebrand cannot mutate canonical brandUid');
      }
      if (CONTEXT_FIELDS.includes(key)) {
        throw new TypeError('rebrand cannot mutate jurisdiction/deployment/market context or policy adapter');
      }
      throw new TypeError(`rebrand does not support field ${key}`);
    }
  }

  return Object.freeze({
    brandUid: current.brandUid,
    displayName: Object.prototype.hasOwnProperty.call(changes, 'displayName')
      ? requireString(changes.displayName, 'displayName')
      : current.displayName,
    domain: Object.prototype.hasOwnProperty.call(changes, 'domain')
      ? requireDomain(changes.domain)
      : current.domain,
    themeId: Object.prototype.hasOwnProperty.call(changes, 'themeId')
      ? requireString(changes.themeId, 'themeId')
      : current.themeId,
    incorporationJurisdiction: current.incorporationJurisdiction,
    deploymentRegion: current.deploymentRegion,
    marketGeography: current.marketGeography,
    policyAdapterId: current.policyAdapterId,
  });
}

module.exports = {
  REBRAND_FIELDS,
  CONTEXT_FIELDS,
  createPlatformIdentity,
  rebrandPlatformIdentity,
};

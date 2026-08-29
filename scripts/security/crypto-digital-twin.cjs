'use strict';
const crypto = require('node:crypto');
const { REQUIRED_SURFACES } = require('./crypto-evidence-harvester.cjs');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}
function sha256(value) { return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex'); }

function buildCryptoTwin(evidence, options = {}) {
  const generatedAt = Number(options.generatedAt);
  if (!Number.isFinite(generatedAt)) throw new Error('CRYPTO_TWIN_GENERATED_AT_REQUIRED');
  const list = Array.isArray(evidence) ? evidence : [];

  const assets = REQUIRED_SURFACES.map((surface) => {
    const matches = list.filter((item) => item && item.surface === surface);
    if (!matches.length) {
      return Object.freeze({
        surface,
        status: 'DISCOVERY_REQUIRED',
        algorithm: null,
        primitive: null,
        provider: null,
        keyLocation: null,
        evidenceDigests: Object.freeze([]),
        migrationStatus: 'NOT_ASSESSED'
      });
    }

    const algorithms = [...new Set(matches.map((item) => item.algorithm).filter(Boolean))];
    const primitives = [...new Set(matches.map((item) => item.primitive).filter(Boolean))];
    const providers = [...new Set(matches.map((item) => item.provider).filter(Boolean))];
    const locations = [...new Set(matches.map((item) => item.keyLocation).filter(Boolean))];
    const complete = algorithms.length === 1 && providers.length === 1 && locations.length === 1;
    return Object.freeze({
      surface,
      status: complete ? 'EVIDENCED' : 'PARTIALLY_EVIDENCED',
      algorithm: algorithms.length === 1 ? algorithms[0] : null,
      primitive: primitives.length === 1 ? primitives[0] : null,
      provider: providers.length === 1 ? providers[0] : null,
      keyLocation: locations.length === 1 ? locations[0] : null,
      evidenceDigests: Object.freeze(matches.map((item) => item.evidenceDigest).sort()),
      migrationStatus: 'NOT_ASSESSED'
    });
  });

  const pendingSurfaces = assets.filter((asset) => asset.status !== 'EVIDENCED').map((asset) => asset.surface);
  const payload = { schemaVersion:'TIGER_CRYPTO_DIGITAL_TWIN_V1', generatedAt, assets, pendingSurfaces };
  return Object.freeze({
    ...payload,
    inventoryComplete: pendingSurfaces.length === 0,
    twinDigest: sha256(JSON.stringify(stable(payload)))
  });
}

function detectCryptoDrift(expected, observed) {
  if (!expected || !observed || expected.surface !== observed.surface) {
    return Object.freeze({ drift:true, code:'CRYPTO_DRIFT_CONTEXT' });
  }
  if (expected.algorithm && observed.algorithm && expected.algorithm !== observed.algorithm) {
    return Object.freeze({ drift:true, code:'CRYPTO_DRIFT_ALGORITHM', expected:expected.algorithm, observed:observed.algorithm });
  }
  if (expected.provider && observed.provider && expected.provider !== observed.provider) {
    return Object.freeze({ drift:true, code:'CRYPTO_DRIFT_PROVIDER', expected:expected.provider, observed:observed.provider });
  }
  if (expected.keyLocation && observed.keyLocation && expected.keyLocation !== observed.keyLocation) {
    return Object.freeze({ drift:true, code:'CRYPTO_DRIFT_KEY_LOCATION', expected:expected.keyLocation, observed:observed.keyLocation });
  }
  return Object.freeze({ drift:false, code:'CRYPTO_NO_DRIFT' });
}

module.exports = Object.freeze({ buildCryptoTwin, detectCryptoDrift });

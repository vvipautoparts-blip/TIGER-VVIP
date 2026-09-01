'use strict';

const INTENTS = Object.freeze(['OFFER','NEED','SERVICE','OPPORTUNITY']);
const REQUIRED_COUNT = 25000;

function assertRegistry(value, code) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(code);
  }
  return Object.freeze([...new Set(value.map(item => item.trim()))]);
}

function seed32(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 0x9e3779b9;
}

function xorshift32(state) {
  let x = state >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

function generateF08Showcase(options = {}) {
  const sectors = assertRegistry(options.sectors, 'F08_SECTOR_REGISTRY_REQUIRED');
  const countries = assertRegistry(options.countries, 'F08_COUNTRY_REGISTRY_REQUIRED');
  const seed = typeof options.seed === 'string' && options.seed.trim() ? options.seed.trim() : 'TIGER-F08';
  let state = seed32(seed);
  const rows = new Array(REQUIRED_COUNT);

  for (let index = 0; index < REQUIRED_COUNT; index += 1) {
    state = xorshift32(state + index + 1);
    const sector = sectors[state % sectors.length];
    state = xorshift32(state);
    const countryCode = countries[state % countries.length];
    const intent = INTENTS[index % INTENTS.length];
    const serial = String(index + 1).padStart(5, '0');
    rows[index] = Object.freeze({
      synthetic: true,
      syntheticId: `F08-${seed32(seed).toString(16).padStart(8, '0')}-${serial}`,
      provenance: `SYNTHETIC:${seed}:${serial}`,
      sector,
      countryCode,
      intent,
      title: `Synthetic ${intent} ${serial}`,
      summary: `Deterministic VVIP TIGER launch showcase object ${serial}.`,
      mediaProfile: index % 5,
      priceProfile: index % 7
    });
  }
  return Object.freeze(rows);
}

module.exports = Object.freeze({ REQUIRED_COUNT, INTENTS, generateF08Showcase });

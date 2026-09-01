'use strict';

const { REQUIRED_COUNT, INTENTS } = require('./generate-f08-showcase.cjs');
const FORBIDDEN_KEYS = new Set(['phone','email','contactPhone','contact_email','expiresAt','expiry','productLifetime','lifetimeDays']);
const CONTACT_PATTERN = /@|https?:\/\/|wa\.me|tel:/i;

function verifyF08Showcase(rows, options = {}) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length !== REQUIRED_COUNT) {
    errors.push('F08_REQUIRES_EXACTLY_25000_OBJECTS');
  }
  const sectors = new Set(Array.isArray(options.sectors) ? options.sectors : []);
  const countries = new Set(Array.isArray(options.countries) ? options.countries : []);
  const ids = new Set();
  let allSynthetic = true;
  let registryValid = true;
  let safe = true;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      allSynthetic = false;
      safe = false;
      continue;
    }
    if (row.synthetic !== true) allSynthetic = false;
    if (typeof row.syntheticId !== 'string' || !row.syntheticId) safe = false;
    else ids.add(row.syntheticId);
    if (!sectors.has(row.sector) || !countries.has(row.countryCode) || !INTENTS.includes(row.intent)) registryValid = false;
    for (const key of Object.keys(row)) if (FORBIDDEN_KEYS.has(key)) safe = false;
    if (CONTACT_PATTERN.test(JSON.stringify(row))) safe = false;
  }

  if (!allSynthetic) errors.push('F08_ALL_OBJECTS_MUST_BE_SYNTHETIC');
  if (Array.isArray(rows) && ids.size !== rows.length) errors.push('F08_SYNTHETIC_IDS_MUST_BE_UNIQUE');
  if (!registryValid) errors.push('F08_OBJECT_OUTSIDE_SUPPLIED_REGISTRIES');
  if (!safe) errors.push('F08_SYNTHETIC_DATA_SAFETY_VIOLATION');

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

module.exports = Object.freeze({ verifyF08Showcase });

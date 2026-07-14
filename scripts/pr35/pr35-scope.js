import { SCOPE_LEVELS } from './pr35-contracts.js';
import { normalizeText, domainError } from './pr35-sanitize.js';

const ancestors = ['sectorId', 'regionId', 'areaId', 'teamId'];
export function normalizeScope(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !SCOPE_LEVELS.includes(input.level)) throw domainError('INVALID_SCOPE');
  try {
    const levelIndex = SCOPE_LEVELS.indexOf(input.level);
    const output = { level: input.level };
    for (let index = 1; index <= levelIndex; index += 1) {
      const key = ancestors[index - 1];
      output[key] = normalizeText(input[key], { max: 128, required: true });
    }
    const allowed = new Set(['level', ...ancestors.slice(0, levelIndex)]);
    if (Object.keys(input).some((key) => !allowed.has(key))) throw domainError('INVALID_SCOPE');
    return Object.freeze(output);
  } catch { throw domainError('INVALID_SCOPE'); }
}
export function scopeContains(grantInput, resourceInput) {
  try {
    const grant = normalizeScope(grantInput); const resource = normalizeScope(resourceInput);
    const grantIndex = SCOPE_LEVELS.indexOf(grant.level); const resourceIndex = SCOPE_LEVELS.indexOf(resource.level);
    if (grantIndex > resourceIndex) return false;
    return ancestors.slice(0, grantIndex).every((key) => grant[key] === resource[key]);
  } catch { return false; }
}

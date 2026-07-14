import { LIMITS } from './pr35-contracts.js';

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
export function domainError(code) { const error = new TypeError(code); error.code = code; return error; }
export function assertSafeKey(key) {
  if (typeof key !== 'string' || forbiddenKeys.has(key)) throw domainError('UNSAFE_KEY');
  return key;
}
export function normalizeText(value, { max = LIMITS.TEXT, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw domainError('FIELD_REQUIRED');
    return '';
  }
  if (typeof value !== 'string') throw domainError('INVALID_FIELD_TYPE');
  const normalized = value.normalize('NFC').trim();
  if (required && !normalized) throw domainError('FIELD_REQUIRED');
  if ([...normalized].length > max) throw domainError('FIELD_TOO_LONG');
  return normalized;
}
export function sanitizeRecord(input, schema) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_RECORD');
  const output = Object.create(null);
  for (const key of Object.keys(input)) {
    assertSafeKey(key);
    if (!Object.hasOwn(schema, key)) throw domainError('UNKNOWN_FIELD');
  }
  for (const [key, rule] of Object.entries(schema)) {
    assertSafeKey(key);
    const value = input[key];
    if (rule.type === 'text') output[key] = normalizeText(value, rule);
    else if (rule.type === 'textList') {
      if (value === undefined) { output[key] = Object.freeze([]); continue; }
      if (!Array.isArray(value)) throw domainError('INVALID_FIELD_TYPE');
      if (value.length > rule.maxItems) throw domainError('LIST_LIMIT_EXCEEDED');
      output[key] = Object.freeze(value.map((item) => normalizeText(item, { max: rule.itemMax, required: true })));
    } else throw domainError('INVALID_SCHEMA');
  }
  return Object.freeze(output);
}

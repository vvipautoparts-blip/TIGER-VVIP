import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, sanitizeRecord, assertSafeKey } from '../../scripts/pr35/pr35-sanitize.js';

test('normalizes bounded Unicode without interpreting HTML', () => {
  assert.equal(normalizeText('  مرحباً <b>بك</b>  ', { max: 30, required: true }), 'مرحباً <b>بك</b>');
  assert.throws(() => normalizeText('', { max: 2, required: true }), (e) => e.code === 'FIELD_REQUIRED');
  assert.throws(() => normalizeText('abc', { max: 2 }), (e) => e.code === 'FIELD_TOO_LONG');
  assert.throws(() => normalizeText(12, { max: 2 }), (e) => e.code === 'INVALID_FIELD_TYPE');
});

test('schema sanitizer rejects unknown and prototype-polluting keys', () => {
  const schema = { name: { type: 'text', max: 20, required: true }, tags: { type: 'textList', maxItems: 2, itemMax: 8 } };
  const clean = sanitizeRecord({ name: ' أمين ', tags: [' عادل ', 'care'] }, schema);
  assert.equal(Object.getPrototypeOf(clean), null);
  assert.deepEqual({ ...clean }, { name: 'أمين', tags: ['عادل', 'care'] });
  assert.ok(Object.isFrozen(clean.tags));
  assert.throws(() => sanitizeRecord({ name: 'x', extra: true }, schema), (e) => e.code === 'UNKNOWN_FIELD');
  const polluted = JSON.parse('{"name":"x","__proto__":{"admin":true}}');
  assert.throws(() => sanitizeRecord(polluted, schema), (e) => e.code === 'UNSAFE_KEY');
  for (const key of ['__proto__', 'prototype', 'constructor']) {
    assert.throws(() => assertSafeKey(key), (e) => e.code === 'UNSAFE_KEY');
  }
  assert.equal({}.admin, undefined);
});

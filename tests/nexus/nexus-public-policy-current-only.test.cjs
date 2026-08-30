'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const policyFiles = [
  'privacy-policy.html',
  'terms-of-service.html',
  'data-deletion.html',
];

for (const relative of policyFiles) {
  test(`${relative} is current-only, self-contained NEXUS public policy`, () => {
    const source = fs.readFileSync(relative, 'utf8');
    assert.match(source, /VVIP TIGER NEXUS/);
    assert.doesNotMatch(source, /marketplace|إعلانات مبوبة|الإعلانات تخضع|مساحة سوق/i);
    assert.doesNotMatch(source, /vvip-visual-trust-layer\.css|vvip-safe-ux-guard\.js/);
    assert.doesNotMatch(source, /private-profile-p03\.html|fusion-home-f02\.html|raw\.githack\.com/i);
    assert.doesNotMatch(source, /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=/i);
    assert.doesNotMatch(source, /<script\s+[^>]*src=/i);
  });
}

test('terms preserve the current payment boundary and one-platform relationship', () => {
  const source = fs.readFileSync('terms-of-service.html', 'utf8');
  assert.match(source, /does not receive or process product or service payments between users/i);
  assert.match(source, /لا تستقبل ولا تعالج مدفوعات المنتجات أو الخدمات بين المستخدمين/);
});

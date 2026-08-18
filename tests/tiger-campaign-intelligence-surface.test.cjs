const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');

test('home loads one campaign intelligence layer before my listings runtime', () => {
  const html = read('index.html');
  const css = 'styles/vvip-tiger-campaign-intelligence.css';
  const campaign = 'scripts/advertising/vvip-tiger-campaign-intelligence.js';
  const myListings = 'scripts/runtime/vvip-my-listings.js';

  assert.match(html, new RegExp(css.replaceAll('/', '\\/')));
  assert.match(html, new RegExp(campaign.replaceAll('/', '\\/')));
  assert.ok(html.indexOf(campaign) < html.indexOf(myListings));
});

test('owned active listing exposes one simple promote action and no legacy tiers', () => {
  const source = read('scripts/runtime/vvip-my-listings.js');
  assert.match(source, /data-vvip-campaign-open/);
  assert.match(source, /روّج إعلانك/);
  assert.match(source, /ACTIVE/);
  assert.doesNotMatch(source, /SPARK|PULSE|SURGE|BASIC|GOLD|ROYAL/);
});

test('campaign runtime is transport-driven and contains no hard-coded payment provider or price', () => {
  const source = read('scripts/advertising/vvip-tiger-campaign-intelligence.js');
  assert.match(source, /VVIP_CAMPAIGN_TRANSPORT/);
  assert.match(source, /getQuote/);
  assert.match(source, /beginPayment/);
  assert.doesNotMatch(source, /Stripe|PayPal|HyperPay|Amazon Pay/);
  assert.doesNotMatch(source, /\b(?:3|10|20)\s*(?:JOD|JD)\b/);
});

test('campaign success copy is guarded by server-authoritative payment ledger and campaign state', () => {
  const source = read('scripts/advertising/vvip-tiger-campaign-intelligence.js');
  const successCopyIndex = source.indexOf('تم الدفع وتفعيل الحملة');
  const guardIndex = source.indexOf('campaignSuccessAllowed');
  assert.ok(guardIndex >= 0);
  assert.ok(successCopyIndex > guardIndex);
  assert.match(source, /الحملات المدفوعة لهذا السوق غير مفعّلة بعد/);
});

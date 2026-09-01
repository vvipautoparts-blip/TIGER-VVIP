'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/nexus/opportunity-radar.js')).href;

async function loadSubject() {
  return import(moduleUrl + `?t=${Date.now()}-${Math.random()}`);
}

test('maps only safe server opportunity states to human-readable descriptors', async () => {
  const { deriveOpportunityState } = await loadSubject();
  const expected = {
    LOW: false,
    BALANCED: false,
    STRONG: false,
    FROZEN: true
  };
  for (const [state, autoFrozen] of Object.entries(expected)) {
    const result = deriveOpportunityState({ state, reason: 'CURRENT_ELIGIBLE_INVENTORY' });
    assert.equal(result.ok, true);
    assert.equal(result.state, state);
    assert.equal(result.autoFrozen, autoFrozen);
    assert.equal(typeof result.label, 'string');
    assert.ok(result.label.length > 0);
    assert.equal(typeof result.message, 'string');
    assert.ok(result.message.length > 0);
  }
});

test('FROZEN uses the owner-approved zero-burn protection copy exactly', async () => {
  const { deriveOpportunityState, AUTO_FREEZE_MESSAGE_AR } = await loadSubject();
  const result = deriveOpportunityState({ state: 'FROZEN', reason: 'NO_QUALIFIED_OPPORTUNITY' });
  assert.equal(AUTO_FREEZE_MESSAGE_AR, 'رصيدك محفوظ — لا نحرق الظهور عندما لا توجد فرصة مؤهلة.');
  assert.equal(result.message, AUTO_FREEZE_MESSAGE_AR);
  assert.equal(result.autoFrozen, true);
});

test('malformed or invented opportunity states fail closed into protected FROZEN display', async () => {
  const { deriveOpportunityState, AUTO_FREEZE_MESSAGE_AR } = await loadSubject();
  for (const input of [null, {}, { state: 'GUARANTEED' }, { state: 'STRONG', reason: 'x'.repeat(1000) }]) {
    const result = deriveOpportunityState(input);
    if (input && input.state === 'STRONG') {
      assert.equal(result.ok, true);
      assert.ok(result.reason.length <= 160);
    } else {
      assert.equal(result.ok, false);
      assert.equal(result.state, 'FROZEN');
      assert.equal(result.autoFrozen, true);
      assert.equal(result.message, AUTO_FREEZE_MESSAGE_AR);
    }
  }
});

test('Opportunity Radar copy never promises sale, lead, first position, or completion time', async () => {
  const { deriveOpportunityState } = await loadSubject();
  const combined = ['LOW', 'BALANCED', 'STRONG', 'FROZEN']
    .map((state) => {
      const result = deriveOpportunityState({ state, reason: null });
      return `${result.label} ${result.message}`;
    })
    .join(' ');
  assert.doesNotMatch(combined, /مضمون|ضمان\s+بيع|بيع\s+مؤكد|عميل\s+مضمون|المركز\s+الأول|خلال\s+\d+\s*(?:ساعة|يوم)/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NETWORK_STATES,
  createNetworkBrain
} from '../scripts/network/vvip-network-brain.js';

test('network brain exposes the six sovereign network states', () => {
  assert.deepEqual(NETWORK_STATES, [
    'EXCELLENT',
    'GOOD',
    'DEGRADED',
    'POOR',
    'OFFLINE',
    'RECOVERING'
  ]);
});

test('offline is explicit and reconnect remains recovering until healthy requests complete', () => {
  const brain = createNetworkBrain({ online: false, recoverySuccesses: 2 });

  assert.equal(brain.snapshot().state, 'OFFLINE');
  brain.updateConnectivity(true);
  assert.equal(brain.snapshot().state, 'RECOVERING');

  brain.recordRequest({ durationMs: 120, outcome: 'success' });
  assert.equal(brain.snapshot().state, 'RECOVERING');
  brain.recordRequest({ durationMs: 130, outcome: 'success' });
  assert.equal(brain.snapshot().state, 'EXCELLENT');
});

test('classification uses measured RTT, timeout rate, error rate, reconnect churn, and request health', () => {
  const brain = createNetworkBrain({ online: true, windowSize: 10 });

  for (let index = 0; index < 10; index += 1) {
    brain.recordRequest({ durationMs: 180, outcome: 'success' });
  }
  assert.equal(brain.snapshot().state, 'GOOD');

  brain.recordRequest({ durationMs: 1200, outcome: 'timeout' });
  brain.recordReconnect();
  const degraded = brain.snapshot();
  assert.equal(degraded.state, 'DEGRADED');
  assert.equal(degraded.metrics.timeoutRate, 0.1);
  assert.equal(degraded.metrics.errorRate, 0);
  assert.equal(degraded.metrics.requestHealth, 0.9);
  assert.equal(degraded.metrics.reconnectChurn, 0.1);

  for (let index = 0; index < 4; index += 1) {
    brain.recordRequest({ durationMs: 2500, outcome: 'error' });
  }
  assert.equal(brain.snapshot().state, 'POOR');
});

test('measurement window is bounded and does not invent packet loss', () => {
  const brain = createNetworkBrain({ online: true, windowSize: 3 });

  brain.recordRequest({ durationMs: 2000, outcome: 'timeout' });
  brain.recordRequest({ durationMs: 80, outcome: 'success' });
  brain.recordRequest({ durationMs: 90, outcome: 'success' });
  brain.recordRequest({ durationMs: 100, outcome: 'success' });

  const snapshot = brain.snapshot();
  assert.equal(snapshot.metrics.sampleCount, 3);
  assert.equal(snapshot.metrics.timeoutRate, 0);
  assert.equal(snapshot.metrics.rttMs, 90);
  assert.equal(Object.hasOwn(snapshot.metrics, 'packetLoss'), false);
});

test('invalid measurements fail closed without corrupting the current snapshot', () => {
  const brain = createNetworkBrain({ online: true });
  const before = brain.snapshot();

  assert.throws(
    () => brain.recordRequest({ durationMs: -1, outcome: 'success' }),
    /INVALID_NETWORK_MEASUREMENT/
  );
  assert.throws(
    () => brain.recordRequest({ durationMs: 1, outcome: 'unknown' }),
    /INVALID_NETWORK_OUTCOME/
  );
  assert.deepEqual(brain.snapshot(), before);
});
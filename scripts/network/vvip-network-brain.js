export const NETWORK_STATES = Object.freeze([
  'EXCELLENT',
  'GOOD',
  'DEGRADED',
  'POOR',
  'OFFLINE',
  'RECOVERING'
]);

const OUTCOMES = new Set(['success', 'timeout', 'error']);

function boundedInteger(value, fallback, minimum, maximum) {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function roundedRate(count, total) {
  return total === 0 ? 0 : Number((count / total).toFixed(4));
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function classify(metrics) {
  if (metrics.sampleCount === 0) return 'GOOD';
  if (
    metrics.rttMs <= 150 &&
    metrics.timeoutRate === 0 &&
    metrics.errorRate === 0 &&
    metrics.reconnectChurn === 0
  ) return 'EXCELLENT';
  if (
    metrics.rttMs <= 400 &&
    metrics.timeoutRate <= 0.05 &&
    metrics.errorRate <= 0.05 &&
    metrics.reconnectChurn <= 0.1 &&
    metrics.requestHealth >= 0.9
  ) return 'GOOD';
  if (
    metrics.rttMs <= 1200 &&
    metrics.timeoutRate <= 0.2 &&
    metrics.errorRate <= 0.2 &&
    metrics.reconnectChurn <= 0.3 &&
    metrics.requestHealth >= 0.7
  ) return 'DEGRADED';
  return 'POOR';
}

export function createNetworkBrain({
  online = true,
  windowSize = 20,
  recoverySuccesses = 2,
  monotonicNow = () => performance.now()
} = {}) {
  const sampleLimit = boundedInteger(windowSize, 20, 3, 100);
  const recoveryTarget = boundedInteger(recoverySuccesses, 2, 1, 10);
  const samples = [];
  const reconnects = [];
  const listeners = new Set();
  let requestSequence = 0;
  let connected = online === true;
  let recoveryRemaining = 0;
  let lastState = connected ? 'GOOD' : 'OFFLINE';

  function metrics() {
    const sampleCount = samples.length;
    const timeoutCount = samples.filter((sample) => sample.outcome === 'timeout').length;
    const errorCount = samples.filter((sample) => sample.outcome === 'error').length;
    const successCount = sampleCount - timeoutCount - errorCount;
    const oldestSequence = samples[0]?.sequence ?? requestSequence;
    while (reconnects.length > 0 && reconnects[0] < oldestSequence) reconnects.shift();
    return Object.freeze({
      sampleCount,
      rttMs: median(samples.map((sample) => sample.durationMs)),
      timeoutRate: roundedRate(timeoutCount, sampleCount),
      errorRate: roundedRate(errorCount, sampleCount),
      reconnectChurn: roundedRate(reconnects.length, sampleCount),
      requestHealth: roundedRate(successCount, sampleCount)
    });
  }

  function currentState(currentMetrics) {
    if (!connected) return 'OFFLINE';
    if (recoveryRemaining > 0) return 'RECOVERING';
    return classify(currentMetrics);
  }

  function snapshot() {
    const currentMetrics = metrics();
    return Object.freeze({
      state: currentState(currentMetrics),
      online: connected,
      metrics: currentMetrics
    });
  }

  function publish() {
    const current = snapshot();
    if (current.state === lastState) return current;
    lastState = current.state;
    for (const listener of listeners) listener(current);
    return current;
  }

  function recordRequest({ durationMs, outcome }) {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new TypeError('INVALID_NETWORK_MEASUREMENT');
    }
    if (!OUTCOMES.has(outcome)) throw new TypeError('INVALID_NETWORK_OUTCOME');
    requestSequence += 1;
    samples.push(Object.freeze({ durationMs: Math.round(durationMs), outcome, sequence: requestSequence }));
    if (samples.length > sampleLimit) samples.shift();
    if (recoveryRemaining > 0) {
      recoveryRemaining = outcome === 'success' ? recoveryRemaining - 1 : recoveryTarget;
    }
    return publish();
  }

  async function measureRequest(operation) {
    if (typeof operation !== 'function') throw new TypeError('INVALID_NETWORK_OPERATION');
    const startedAt = monotonicNow();
    try {
      const result = await operation();
      recordRequest({ durationMs: monotonicNow() - startedAt, outcome: 'success' });
      return result;
    } catch (error) {
      const outcome = error?.name === 'AbortError' || error?.code === 'REQUEST_TIMEOUT' ? 'timeout' : 'error';
      recordRequest({ durationMs: monotonicNow() - startedAt, outcome });
      throw error;
    }
  }

  return Object.freeze({
    snapshot,
    recordRequest,
    measureRequest,
    recordReconnect() {
      reconnects.push(requestSequence);
      return publish();
    },
    updateConnectivity(nextOnline) {
      const wasConnected = connected;
      connected = nextOnline === true;
      if (!connected) recoveryRemaining = 0;
      if (!wasConnected && connected) recoveryRemaining = recoveryTarget;
      return publish();
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('INVALID_NETWORK_LISTENER');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
}
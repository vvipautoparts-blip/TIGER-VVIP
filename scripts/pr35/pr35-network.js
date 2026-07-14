const codedError = (code) => Object.assign(new Error(code), { code });
const signature = (value) => JSON.stringify(value, Object.keys(value || {}).sort());

export async function withRequestPolicy(operation, { signal, timeoutMs = 8000, maxAttempts = 3,
  baseDelayMs = 250, random = Math.random, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  idempotent = true } = {}) {
  if (signal?.aborted) throw codedError('REQUEST_CANCELLED');
  const attempts = idempotent ? Math.min(3, Math.max(1, maxAttempts)) : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const cancel = () => controller.abort(codedError('REQUEST_CANCELLED'));
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(codedError('REQUEST_TIMEOUT')), Math.min(30000, Math.max(1, timeoutMs)));
    const aborted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }));
    try { return await Promise.race([operation(controller.signal, attempt), aborted]); }
    catch (error) {
      const reason = controller.signal.aborted ? controller.signal.reason : error;
      if (reason?.code === 'REQUEST_TIMEOUT' || reason?.code === 'REQUEST_CANCELLED') throw reason;
      if (!error?.retryable || attempt === attempts) throw codedError('REQUEST_FAILED');
      const ceiling = Math.min(2000, baseDelayMs * (2 ** (attempt - 1)));
      await sleep(Math.max(0, Math.floor(ceiling * Math.min(1, Math.max(0, random())))));
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  throw codedError('REQUEST_FAILED');
}

export function createDedupeRegistry() {
  const entries = new Map();
  return Object.freeze({
    run(key, payload, operation) {
      if (typeof key !== 'string' || !key) return Promise.reject(codedError('INVALID_IDEMPOTENCY_KEY'));
      const payloadSignature = signature(payload);
      if (entries.has(key)) {
        const entry = entries.get(key);
        if (entry.signature !== payloadSignature) return Promise.reject(codedError('IDEMPOTENCY_CONFLICT'));
        return entry.promise;
      }
      const promise = Promise.resolve().then(operation);
      entries.set(key, Object.freeze({ signature: payloadSignature, promise }));
      promise.catch(() => entries.delete(key));
      return promise;
    }, clear: () => entries.clear()
  });
}

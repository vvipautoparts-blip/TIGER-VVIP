(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_PR36_SCHEDULER = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function mediaError(code) { const error = new Error(code); error.code = code; return error; }
  function createScheduler(options) {
    const settings = options || {};
    const maximum = Math.max(1, Math.min(2, Number(settings.maxConcurrency) || 2));
    const jobTimeout = settings.jobTimeoutMs || 20000;
    const sessionTimeout = settings.sessionTimeoutMs || 120000;
    const clock = settings.clock || { now: Date.now, setTimeout, clearTimeout };
    const queue = [];
    const running = new Map();
    let active = 0;
    let disposed = false;

    function settleQueued(entry, code) {
      if (entry.settled) return;
      entry.settled = true;
      entry.reject(mediaError(code));
    }
    function pump() {
      while (!disposed && active < maximum && queue.length) {
        const entry = queue.shift();
        if (entry.queueTimer) { clock.clearTimeout(entry.queueTimer); entry.queueTimer = null; }
        if (entry.cancelled) { settleQueued(entry, "cancelled"); continue; }
        const remaining = sessionTimeout - (clock.now() - entry.sessionStartedAt);
        if (remaining <= 0) { settleQueued(entry, "session_timeout"); continue; }
        active += 1;
        const controller = new AbortController();
        entry.controller = controller;
        running.set(entry, controller);
        const deadline = Math.min(jobTimeout, remaining);
        const timeoutCode = remaining <= jobTimeout ? "session_timeout" : "processing_timeout";
        entry.timer = clock.setTimeout(function () {
          if (entry.settled) return;
          const error = mediaError(timeoutCode);
          entry.settled = true;
          controller.abort(error);
          entry.reject(error);
        }, deadline);
        Promise.resolve().then(function () {
          if (controller.signal.aborted) throw controller.signal.reason || mediaError("cancelled");
          return entry.job.run(controller.signal);
        }).then(function (value) {
          if (entry.settled) return;
          entry.settled = true;
          entry.resolve(value);
        }, function (error) {
          if (entry.settled) return;
          entry.settled = true;
          if (controller.signal.aborted) entry.reject(controller.signal.reason || mediaError("cancelled"));
          else entry.reject(error);
        }).finally(function () {
          clock.clearTimeout(entry.timer);
          running.delete(entry);
          active -= 1;
          pump();
        });
      }
    }
    function enqueue(job) {
      if (disposed) return Promise.reject(mediaError("cancelled"));
      const sessionStartedAt = Number.isFinite(job.sessionStartedAt) ? job.sessionStartedAt : clock.now();
      if (clock.now() - sessionStartedAt >= sessionTimeout) return Promise.reject(mediaError("session_timeout"));
      return new Promise(function (resolve, reject) {
        const entry = { job, sessionStartedAt, resolve, reject, cancelled: false, settled: false, queueTimer: null };
        const remaining = sessionTimeout - (clock.now() - sessionStartedAt);
        entry.queueTimer = clock.setTimeout(function () {
          if (entry.settled) return;
          const index = queue.indexOf(entry);
          if (index < 0) return;
          queue.splice(index, 1);
          settleQueued(entry, "session_timeout");
          pump();
        }, remaining);
        queue.push(entry);
        pump();
      });
    }
    function cancelOperation(operationId) {
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        const entry = queue[index];
        if (entry.job.operationId !== operationId) continue;
        queue.splice(index, 1);
        if (entry.queueTimer) { clock.clearTimeout(entry.queueTimer); entry.queueTimer = null; }
        entry.cancelled = true;
        settleQueued(entry, "cancelled");
      }
      for (const [entry, controller] of running) {
        if (entry.job.operationId !== operationId) continue;
        const error = mediaError("cancelled");
        controller.abort(error);
        if (!entry.settled) { entry.settled = true; entry.reject(error); }
      }
      pump();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      queue.splice(0).forEach(function (entry) { if (entry.queueTimer) clock.clearTimeout(entry.queueTimer); settleQueued(entry, "cancelled"); });
      for (const [entry, controller] of running) {
        const error = mediaError("cancelled");
        controller.abort(error);
        if (!entry.settled) { entry.settled = true; entry.reject(error); }
      }
    }
    return Object.freeze({ enqueue, cancelOperation, dispose });
  }
  return Object.freeze({ createScheduler });
});

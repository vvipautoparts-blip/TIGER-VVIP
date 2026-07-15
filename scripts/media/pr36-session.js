(function (root, factory) {
  "use strict";
  const policy = typeof module === "object" && module.exports ? require("./pr36-policy.js") : root.VVIP_PR36_POLICY;
  const api = factory(policy);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_PR36_SESSION = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (policy) {
  "use strict";
  function mediaError(code) { const error = new Error(code); error.code = code; return error; }

  function createMediaSession(options) {
    const ids = options.ids;
    const urls = options.urls;
    const validator = options.validator;
    const processor = options.processor;
    const scheduler = options.scheduler || null;
    const now = options.now || Date.now;
    let committed = [];
    let provisional = [];
    let cover = null;
    let operationNumber = 0;
    let operationController = null;
    let sessionStarted = 0;
    let disposed = false;

    function revoke(item) {
      if (!item) return;
      if (item.url) { urls.revoke(item.url); item.url = ""; }
      item.file = null;
      item.source = null;
      item.header = null;
    }
    function revokeUrl(item) { if (item && item.url) { urls.revoke(item.url); item.url = ""; } }
    function current(operationId) { return !disposed && operationId === operationNumber && operationController && !operationController.signal.aborted; }
    function bounded(work, signal) {
      const remaining = 120000 - (now() - sessionStarted);
      if (remaining <= 0) return Promise.reject(mediaError("session_timeout"));
      return new Promise(function (resolve, reject) {
        let settled = false;
        const milliseconds = Math.min(20000, remaining);
        const timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          reject(mediaError(remaining <= 20000 ? "session_timeout" : "processing_timeout"));
        }, milliseconds);
        function finish(handler, value) { if (settled) return; settled = true; clearTimeout(timer); handler(value); }
        Promise.resolve().then(work).then(function (value) { finish(resolve, value); }, function (error) { finish(reject, error); });
        if (signal) signal.addEventListener("abort", function () { finish(reject, mediaError("cancelled")); }, { once: true });
      });
    }
    function processSource(source, edit, operationId) {
      const run = function (signal) {
        const combined = edit || {};
        combined.signal = signal || combined.signal;
        return processor(source, combined);
      };
      if (scheduler) return scheduler.enqueue({ operationId: String(operationId), sessionStartedAt: sessionStarted, run });
      return bounded(function () { return run(edit.signal); }, edit.signal);
    }
    async function mapTwo(list, iteratee) {
      const output = new Array(list.length);
      let cursor = 0;
      async function worker() { while (cursor < list.length) { const index = cursor++; output[index] = await iteratee(list[index], index); } }
      await Promise.all([worker(), worker()]);
      return output;
    }
    function cancelOperation() {
      const cancelledId = operationNumber;
      operationNumber += 1;
      if (operationController) operationController.abort(mediaError("cancelled"));
      if (scheduler) scheduler.cancelOperation(String(cancelledId));
      operationController = null;
      provisional.forEach(revoke);
      provisional = [];
    }
    async function select(files) {
      if (disposed) throw mediaError("cancelled");
      validator.validateSelection(files, committed.length);
      const list = Array.from(files || []);
      cancelOperation();
      const operationId = operationNumber;
      sessionStarted = now();
      operationController = new AbortController();
      const signal = operationController.signal;
      const created = [];
      const validated = [];
      try {
        for (const file of list) {
          const source = await validator.validateSource(file, { signal });
          if (!current(operationId)) throw mediaError("stale_result");
          validated.push({ file, source });
        }
        const next = await mapTwo(validated, async function (validatedItem) {
          const file = validatedItem.file;
          const source = validatedItem.source;
          try {
            const transform = { zoom: 1, panX: 0, panY: 0 };
            const result = await processSource(source, { transform, signal }, operationId);
            if (!current(operationId)) throw mediaError("stale_result");
            const item = { id: ids(), file, source, transform, blob: result.blob, width: result.width, height: result.height, altText: "صورة الإعلان" };
            item.url = urls.create(item.blob);
            created.push(item);
            return item;
          } catch (error) {
            if (source) { source.file = null; source.header = null; }
            throw error;
          }
        });
        if (!current(operationId)) throw mediaError("stale_result");
        provisional = next;
        return next.length;
      } catch (error) {
        created.forEach(revoke);
        validated.forEach(function (validatedItem) {
          if (!validatedItem.source) return;
          validatedItem.source.file = null;
          validatedItem.source.header = null;
        });
        if (current(operationId) && operationController) operationController.abort(mediaError("cancelled"));
        throw error;
      }
    }
    function beginEdit(id) {
      if (disposed || provisional.length) return false;
      const item = committed.find(function (candidate) { return candidate.id === id; });
      if (!item) return false;
      cancelOperation();
      const operationId = operationNumber;
      sessionStarted = now();
      operationController = new AbortController();
      const clone = {
        id: item.id, replaceId: item.id, file: null,
        source: { file: item.blob, mimeType: item.blob.type },
        transform: { zoom: 1, panX: 0, panY: 0 }, blob: item.blob,
        width: item.width, height: item.height, altText: item.altText,
        url: urls.create(item.blob), operationId
      };
      provisional = [clone];
      return true;
    }
    async function previewEdit(id, transform) {
      const item = provisional.find(function (candidate) { return candidate.id === id; });
      if (!item || !transform) return false;
      const values = [Number(transform.zoom), Number(transform.panX), Number(transform.panY)];
      if (!values.every(Number.isFinite)) return false;
      item.transform = { zoom: Math.max(1, Math.min(4, values[0])), panX: Math.max(-1, Math.min(1, values[1])), panY: Math.max(-1, Math.min(1, values[2])) };
      item.revision = (item.revision || 0) + 1;
      const revision = item.revision;
      const operationId = operationNumber;
      const signal = operationController && operationController.signal;
      const result = await processSource(item.source, { transform: item.transform, signal }, operationId);
      if (!current(operationId) || item.revision !== revision) throw mediaError("stale_result");
      const nextUrl = urls.create(result.blob);
      revokeUrl(item);
      item.blob = result.blob;
      item.width = result.width;
      item.height = result.height;
      item.url = nextUrl;
      return true;
    }
    async function confirmOperation() {
      if (!provisional.length) return displaySnapshot();
      const previousId = operationNumber;
      if (operationController) operationController.abort(mediaError("stale_result"));
      if (scheduler) scheduler.cancelOperation(String(previousId));
      operationNumber += 1;
      const operationId = operationNumber;
      operationController = new AbortController();
      const signal = operationController.signal;
      const pending = provisional.slice();
      const replacements = [];
      try {
        for (const item of pending) {
          const result = await processSource(item.source, { transform: item.transform, signal }, operationId);
          if (!current(operationId)) throw mediaError("stale_result");
          replacements.push({ item, result, url: urls.create(result.blob) });
        }
        const nextCommitted = committed.slice();
        const retired = [];
        for (const replacement of replacements) {
          if (!replacement.item.replaceId) continue;
          const index = nextCommitted.findIndex(function (candidate) { return candidate.id === replacement.item.replaceId; });
          if (index < 0) throw mediaError("stale_result");
          replacement.index = index;
        }
        for (const replacement of replacements) {
          const item = replacement.item;
          const finalItem = { id: item.id, file: null, source: null, transform: item.transform, blob: replacement.result.blob, width: replacement.result.width, height: replacement.result.height, altText: item.altText, url: replacement.url };
          if (item.replaceId) {
            retired.push(nextCommitted[replacement.index]);
            nextCommitted[replacement.index] = finalItem;
          } else nextCommitted.push(finalItem);
        }
        pending.forEach(revoke);
        committed = nextCommitted.slice(0, 7);
        retired.forEach(revoke);
        provisional = [];
        operationController = null;
        if (!cover && committed[0]) cover = committed[0].id;
        return displaySnapshot();
      } catch (error) {
        replacements.forEach(function (replacement) { if (replacement.url) urls.revoke(replacement.url); });
        cancelOperation();
        throw error && typeof error.code === "string" ? mediaError(error.code) : mediaError("decode_failed");
      }
    }
    function reorder(id, index) { const currentIndex = committed.findIndex(function (item) { return item.id === id; }); if (currentIndex < 0) return false; const item = committed.splice(currentIndex, 1)[0]; committed.splice(Math.max(0, Math.min(committed.length, index)), 0, item); return true; }
    function setCover(id) { if (!committed.some(function (item) { return item.id === id; })) return false; cover = id; return true; }
    function remove(id) { const index = committed.findIndex(function (item) { return item.id === id; }); if (index < 0) return false; revoke(committed.splice(index, 1)[0]); if (cover === id) cover = committed[0] ? committed[0].id : null; return true; }
    function displaySnapshot() { return policy.projectMetadata(committed, cover); }
    function previewSnapshot() { return committed.map(function (item) { return { imageId: item.id, url: item.url }; }); }
    function provisionalSnapshot() { return provisional.map(function (item) { return { imageId: item.id, url: item.url, transform: Object.assign({}, item.transform) }; }); }
    function reset() { cancelOperation(); committed.forEach(revoke); committed = []; cover = null; }
    function dispose() { if (disposed) return; reset(); if (scheduler) scheduler.dispose(); disposed = true; }
    return Object.freeze({ select, beginEdit, previewEdit, confirmOperation, cancelOperation, remove, reorder, setCover, displaySnapshot, previewSnapshot, provisionalSnapshot, reset, dispose });
  }
  return Object.freeze({ createMediaSession });
});

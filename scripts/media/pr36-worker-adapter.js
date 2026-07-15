(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_PR36_WORKER = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const NON_FALLBACK_CODES = new Set(["too_many_photos", "source_too_large", "selection_total_too_large", "mime_not_allowed", "signature_mismatch", "unknown_format", "dimensions_too_small", "decoded_pixels_exceeded", "orientation_uncertain", "decode_failed", "encode_failed", "cancelled", "stale_result"]);
  function mediaError(code) { const error = new Error(code); error.code = code; return error; }
  function validResult(result) { return result && result.blob && ["image/webp", "image/jpeg"].includes(result.blob.type) && Number.isInteger(result.blob.size) && result.blob.size > 0 && result.blob.size <= 15*1024*1024 && Number.isInteger(result.width) && Number.isInteger(result.height) && result.width > 0 && result.height > 0 && result.width <= 1600 && result.height <= 1200 && result.width * 3 === result.height * 4; }
  function validJob(job){return job&&typeof job.jobId==='string'&&job.jobId.length>0&&job.jobId.length<=80&&job.bytes instanceof ArrayBuffer&&job.bytes.byteLength>0&&job.bytes.byteLength<=15*1024*1024&&['image/jpeg','image/png','image/webp'].includes(job.mimeType)&&job.transform&&[job.transform.zoom,job.transform.panX,job.transform.panY].every(Number.isFinite)&&job.policy&&job.policy.maxPixels===40000000&&job.policy.maxWidth===1600&&job.policy.maxHeight===1200;}

  function selectProcessingAdapter(options) {
    const capable = Boolean(options.Worker && options.OffscreenCanvas && options.createImageBitmap && options.workerFactory);
    if (!capable) return options.mainThread;
    return Object.freeze({
      process: function (job) {
        if (!validJob(job)) return Promise.reject(mediaError("unknown_format"));
        if (job.signal && job.signal.aborted) return Promise.reject(mediaError("cancelled"));
        return new Promise(function (resolve, reject) {
          let settled = false;
          let worker = null;
          function cleanup() {
            if (job.signal) job.signal.removeEventListener("abort", onAbort);
            if (!worker) return;
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            worker.terminate();
          }
          function finish(handler, value) { if (settled) return; settled = true; cleanup(); handler(value); }
          function fallback() {
            if (settled) return;
            settled = true;
            cleanup();
            if (job.signal && job.signal.aborted) { reject(mediaError("cancelled")); return; }
            Promise.resolve(options.mainThread.process(job)).then(resolve, reject);
          }
          function onAbort() { finish(reject, mediaError("cancelled")); }
          function onError() { fallback(); }
          function onMessage(event) {
            const message = event && event.data;
            if (!message || message.jobId !== job.jobId) { finish(reject, mediaError("capability_unavailable")); return; }
            if (message.type === "error") {
              const code = typeof message.code === "string" ? message.code : "capability_unavailable";
              if (NON_FALLBACK_CODES.has(code)) finish(reject, mediaError(code));
              else fallback();
              return;
            }
            if (message.type !== "result" || !validResult(message.result)) { finish(reject, mediaError("encode_failed")); return; }
            finish(resolve, message.result);
          }
          try {
            worker = options.workerFactory();
            worker.addEventListener("message", onMessage);
            worker.addEventListener("error", onError);
            if (job.signal) job.signal.addEventListener("abort", onAbort, { once: true });
            worker.postMessage({ type: "process", jobId: job.jobId, bytes: job.bytes, mimeType: job.mimeType, transform: job.transform, policy: job.policy }, job.bytes ? [job.bytes] : []);
          } catch (error) { fallback(); }
        });
      }
    });
  }
  return Object.freeze({ selectProcessingAdapter });
});

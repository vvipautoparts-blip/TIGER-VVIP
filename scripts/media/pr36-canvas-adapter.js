(function (root, factory) {
  "use strict";
  const geometry = typeof module === "object" && module.exports ? require("./pr36-geometry.js") : root.VVIP_PR36_GEOMETRY;
  const signature = typeof module === "object" && module.exports ? require("./pr36-signature.js") : root.VVIP_PR36_SIGNATURE;
  const api = factory(geometry, signature);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_PR36_CANVAS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (geometry, signature) {
  "use strict";

  function mediaError(code) { const error = new Error(code); error.code = code; return error; }
  function abortIfNeeded(signal) { if (signal && signal.aborted) throw mediaError("cancelled"); }

  async function verifyEncodedBlob(blob, mimeType, output, signal) {
    if (typeof blob.slice !== "function") {
      if ((blob.width != null && blob.width !== output.width) || (blob.height != null && blob.height !== output.height)) throw mediaError("encode_failed");
      return;
    }
    let header = null;
    try {
      header = new Uint8Array(await blob.slice(0, 262144).arrayBuffer());
      abortIfNeeded(signal);
      if (!signature || signature.detectSignature(header) !== mimeType) throw mediaError("encode_failed");
      const dimensions = signature.dimensions(header, mimeType);
      if (!dimensions || dimensions.width !== output.width || dimensions.height !== output.height) throw mediaError("encode_failed");
    } catch (error) {
      if (error && error.code) throw error;
      throw mediaError("encode_failed");
    } finally {
      if (header) header.fill(0);
    }
  }

  function createCanvasAdapter(adapters) {
    if (!adapters || !geometry) throw mediaError("capability_unavailable");

    async function process(job) {
      let decoded = null;
      let canvas = null;
      const signal = job && job.signal;
      try {
        abortIfNeeded(signal);
        decoded = await adapters.decode(job.source && (job.source.file || job.source), signal);
        abortIfNeeded(signal);
        const width = decoded && decoded.width;
        const height = decoded && decoded.height;
        if (decoded && decoded.orientationUncertain) throw mediaError("orientation_uncertain");
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw mediaError("decode_failed");
        if (job.source && Number.isInteger(job.source.width) && (job.source.width !== width || job.source.height !== height)) throw mediaError("decode_failed");
        const transform = job.transform || {};
        const crop = job.crop || geometry.fitCrop({
          sourceWidth: width, sourceHeight: height,
          zoom: transform.zoom == null ? 1 : transform.zoom,
          panX: transform.panX == null ? 0 : transform.panX,
          panY: transform.panY == null ? 0 : transform.panY
        });
        const output = geometry.outputSize(crop);
        abortIfNeeded(signal);
        canvas = adapters.createCanvas(output.width, output.height);
        if (!canvas) throw mediaError("capability_unavailable");
        adapters.draw(canvas, decoded, crop, output);
        abortIfNeeded(signal);
        const webp = await adapters.probeWebP();
        abortIfNeeded(signal);
        const mimeType = webp ? "image/webp" : "image/jpeg";
        const quality = webp ? 0.82 : 0.86;
        const blob = await adapters.encode(canvas, mimeType, quality);
        abortIfNeeded(signal);
        if (!blob || !Number.isInteger(blob.size) || blob.size < 1 || blob.size > 15 * 1024 * 1024 || blob.type !== mimeType) throw mediaError("encode_failed");
        if (output.width * 3 !== output.height * 4) throw mediaError("encode_failed");
        await verifyEncodedBlob(blob, mimeType, output, signal);
        return Object.freeze({ blob, width: output.width, height: output.height });
      } catch (error) {
        if (signal && signal.aborted) throw mediaError("cancelled");
        throw error && error.code ? error : mediaError("decode_failed");
      } finally {
        if (decoded && typeof adapters.closeDecoded === "function") adapters.closeDecoded(decoded);
        if (canvas && typeof adapters.clearCanvas === "function") adapters.clearCanvas(canvas);
      }
    }
    return Object.freeze({ process });
  }
  return Object.freeze({ createCanvasAdapter });
});

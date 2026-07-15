(function () {
  "use strict";
  if(typeof importScripts==='function')importScripts('pr36-signature.js');

  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function finite(value) { return typeof value === "number" && Number.isFinite(value); }
  const LIMITS=Object.freeze({maxBytes:15*1024*1024,maxPixels:40000000,minWidth:320,minHeight:240,maxWidth:1600,maxHeight:1200,webpQuality:.82,jpegQuality:.86});
  function cropFor(width, height, transform, policy) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < policy.minWidth || height < policy.minHeight) fail("dimensions_too_small");
    if (width * height > policy.maxPixels) fail("decoded_pixels_exceeded");
    const input = transform || {};
    if (![input.zoom, input.panX, input.panY].every(finite)) fail("orientation_uncertain");
    const zoom = Math.max(1, Math.min(4, input.zoom));
    const panX = Math.max(-1, Math.min(1, input.panX));
    const panY = Math.max(-1, Math.min(1, input.panY));
    let cropWidth = Math.min(width, Math.floor(height * 4 / 3));
    cropWidth = Math.max(4, Math.floor(cropWidth / zoom / 4) * 4);
    const cropHeight = cropWidth * 3 / 4;
    const outputWidth = Math.min(policy.maxWidth, cropWidth);
    const outputHeight = outputWidth * 3 / 4;
    return {
      x: Math.round(((width - cropWidth) / 2) * (panX + 1)),
      y: Math.round(((height - cropHeight) / 2) * (panY + 1)),
      width: cropWidth, height: cropHeight, outputWidth, outputHeight
    };
  }

  self.addEventListener("message", async function (event) {
    const job = event.data;
    if (!job || job.type !== "process" || typeof job.jobId !== "string" || job.jobId.length<1 || job.jobId.length>80) return;
    let image = null;
    let canvas = null;
    let outputHeader = null;
    try {
      if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") fail("capability_unavailable");
      if (!(job.bytes instanceof ArrayBuffer) || job.bytes.byteLength<1 || job.bytes.byteLength>LIMITS.maxBytes || !["image/jpeg", "image/png", "image/webp"].includes(job.mimeType)) fail("unknown_format");
      if(!job.transform||![job.transform.zoom,job.transform.panX,job.transform.panY].every(finite))fail("orientation_uncertain");
      const policy = job.policy || {};
      if(policy.maxPixels!==LIMITS.maxPixels||policy.minWidth!==LIMITS.minWidth||policy.minHeight!==LIMITS.minHeight||policy.maxWidth!==LIMITS.maxWidth||policy.maxHeight!==LIMITS.maxHeight||policy.webpQuality!==LIMITS.webpQuality||policy.jpegQuality!==LIMITS.jpegQuality)fail("unknown_format");
      const signature=self.VVIP_PR36_SIGNATURE;const header=new Uint8Array(job.bytes,0,Math.min(job.bytes.byteLength,262144));
      if(!signature||signature.detectSignature(header)!==job.mimeType)fail("signature_mismatch");
      const declared=signature.dimensions(header,job.mimeType);if(!declared)fail("unknown_format");
      if(declared.width<LIMITS.minWidth||declared.height<LIMITS.minHeight)fail("dimensions_too_small");
      if(declared.width>Math.floor(LIMITS.maxPixels/declared.height))fail("decoded_pixels_exceeded");
      image = await createImageBitmap(new Blob([job.bytes], { type: job.mimeType }), { imageOrientation: "from-image" });
      if(image.width!==declared.width||image.height!==declared.height)fail("decode_failed");
      const crop = cropFor(image.width, image.height, job.transform, policy);
      canvas = new OffscreenCanvas(crop.outputWidth, crop.outputHeight);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) fail("capability_unavailable");
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.outputWidth, crop.outputHeight);
      image.close(); image = null;
      let output = await canvas.convertToBlob({ type: "image/webp", quality: policy.webpQuality });
      if (!output || output.type !== "image/webp" || output.size < 1) output = await canvas.convertToBlob({ type: "image/jpeg", quality: policy.jpegQuality });
      if (!output || !["image/webp", "image/jpeg"].includes(output.type) || output.size < 1 || output.size > LIMITS.maxBytes) fail("encode_failed");
      outputHeader = new Uint8Array(await output.slice(0, 262144).arrayBuffer());
      if (signature.detectSignature(outputHeader) !== output.type) fail("encode_failed");
      const encodedSize = signature.dimensions(outputHeader, output.type);
      if (!encodedSize || encodedSize.width !== crop.outputWidth || encodedSize.height !== crop.outputHeight) fail("encode_failed");
      self.postMessage({ type: "result", jobId: job.jobId, result: { blob: output, width: crop.outputWidth, height: crop.outputHeight } });
    } catch (error) {
      const allowed = new Set(["signature_mismatch", "unknown_format", "dimensions_too_small", "decoded_pixels_exceeded", "decode_failed", "orientation_uncertain", "encode_failed"]);
      self.postMessage({ type: "error", jobId: job.jobId, code: allowed.has(error && error.code) ? error.code : "capability_unavailable" });
    } finally {
      if (image && typeof image.close === "function") image.close();
      if (outputHeader) outputHeader.fill(0);
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
  });
})();

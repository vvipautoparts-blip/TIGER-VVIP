(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){exports.F05_LIMITS=api.F05_LIMITS;exports.admitHeifDecode=api.admitHeifDecode;Object.freeze(module.exports);}else root.VVIP_F05_HEIF_POLICY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MiB=1024*1024;
  const F05_LIMITS=Object.freeze({maxDecodedPixels:40000000,maxWasmMemoryBytes:384*MiB,maxHeifConcurrency:1,minWidth:320,minHeight:240,workingBytesPerPixel:12,workingOverheadBytes:32*MiB});
  function deny(code){return Object.freeze({ok:false,code});}
  function safeRuntimeBudget(runtime){const configured=runtime&&runtime.memoryBudgetBytes;if(Number.isSafeInteger(configured)&&configured>0)return Math.min(configured,F05_LIMITS.maxWasmMemoryBytes);return F05_LIMITS.maxWasmMemoryBytes;}
  function admitHeifDecode(meta,runtime){if(!meta||typeof meta!=='object'||Array.isArray(meta))return deny('heif_dimensions_invalid');if(meta.codec!=='hevc')return deny('heif_codec_unsupported');if(meta.isStill!==true)return deny('heif_sequence_denied');const width=meta.width,height=meta.height;if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<F05_LIMITS.minWidth||height<F05_LIMITS.minHeight)return deny('heif_dimensions_invalid');if(width>Math.floor(F05_LIMITS.maxDecodedPixels/height))return deny('heif_dimensions_invalid');const activeHeifWorkers=runtime&&runtime.activeHeifWorkers;if(!Number.isSafeInteger(activeHeifWorkers)||activeHeifWorkers<0)return deny('heif_memory_limit');if(activeHeifWorkers>=F05_LIMITS.maxHeifConcurrency)return deny('heif_memory_limit');const pixels=width*height;const estimatedWorkingSetBytes=pixels*F05_LIMITS.workingBytesPerPixel+F05_LIMITS.workingOverheadBytes;if(!Number.isSafeInteger(estimatedWorkingSetBytes))return deny('heif_memory_limit');const memoryBudgetBytes=safeRuntimeBudget(runtime);if(estimatedWorkingSetBytes>memoryBudgetBytes)return deny('heif_memory_limit');return Object.freeze({ok:true,estimatedWorkingSetBytes,memoryBudgetBytes});}
  return Object.freeze({F05_LIMITS,admitHeifDecode});
});

(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VVIP_F05_HEIF_ADAPTER=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MIMES=new Set(['image/heic','image/heif']);
  const MAX_BYTES=15*1024*1024;
  function error(code){const e=new Error(code);e.code=code;return e;}
  function validJob(j){return j&&typeof j.jobId==='string'&&j.jobId.length>0&&j.jobId.length<=80&&j.bytes instanceof ArrayBuffer&&j.bytes.byteLength>0&&j.bytes.byteLength<=MAX_BYTES&&MIMES.has(j.mimeType);}
  function canonicalize(frame,route){if(!frame||!Number.isSafeInteger(frame.width)||!Number.isSafeInteger(frame.height)||frame.width<1||frame.height<1||frame.width>Math.floor(40000000/frame.height)||!frame.pixelsOrDisplayFrame||frame.orientationApplied!==true||frame.colorSpace!=='srgb'||!['heic','heif'].includes(frame.sourceKind))throw error('heif_decode_failed');return Object.freeze({width:frame.width,height:frame.height,pixelsOrDisplayFrame:frame.pixelsOrDisplayFrame,orientationApplied:true,colorSpace:'srgb',sourceKind:frame.sourceKind,decodeRoute:route});}
  function buildWorkerTransfer(job){if(!validJob(job))throw error('heif_container_invalid');const message=Object.freeze({type:'decode',jobId:job.jobId,bytes:job.bytes,mimeType:job.mimeType});return Object.freeze({message,transfer:Object.freeze([job.bytes])});}
  function createHeifAdapter(options){if(!options||typeof options.nativeProbe!=='function'||typeof options.nativeDecode!=='function'||typeof options.wasmDecode!=='function')throw error('heif_decode_failed');return Object.freeze({async process(job){if(!validJob(job))throw error('heif_container_invalid');if(job.signal&&job.signal.aborted)throw error('cancelled');let nativeSupported=false;try{nativeSupported=(await options.nativeProbe(job.mimeType))===true;}catch(_){nativeSupported=false;}if(job.signal&&job.signal.aborted)throw error('cancelled');if(nativeSupported){try{const frame=await options.nativeDecode(job);if(job.signal&&job.signal.aborted)throw error('cancelled');return canonicalize(frame,'native');}catch(e){if((job.signal&&job.signal.aborted)||(e&&e.code==='cancelled'))throw error('cancelled');throw error('heif_decode_failed');}}try{const frame=await options.wasmDecode(job);if(job.signal&&job.signal.aborted)throw error('cancelled');return canonicalize(frame,'wasm');}catch(e){if((job.signal&&job.signal.aborted)||(e&&e.code==='cancelled'))throw error('cancelled');throw error('heif_decode_failed');}}});}
  return Object.freeze({createHeifAdapter,buildWorkerTransfer});
});

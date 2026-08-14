(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){exports.classifyWorkerFailure=api.classifyWorkerFailure;Object.freeze(module.exports);}else root.VVIP_F05_WORKER_RESILIENCE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PRESERVED=new Set([
    'cancelled','capability_unavailable','decoder_integrity_mismatch','heif_container_invalid','heif_codec_unsupported',
    'heif_sequence_denied','heif_memory_limit','heif_decode_timeout','heif_decode_failed','heif_worker_crash',
    'signature_mismatch','orientation_uncertain','metadata_not_stripped','encode_failed'
  ]);
  const MEMORY_PATTERNS=[
    'out of memory','cannot enlarge memory','failed to grow memory','std::bad_alloc','allocation failed','memory allocation'
  ];
  const TRAP_PATTERNS=['memory access out of bounds','unreachable','aborted('];

  function classifyWorkerFailure(error){
    if(error&&typeof error.code==='string'&&PRESERVED.has(error.code))return error.code;
    const message=String(error&&error.message||error||'').toLowerCase();
    if(MEMORY_PATTERNS.some(pattern=>message.includes(pattern)))return'heif_memory_limit';
    if(error instanceof WebAssembly.RuntimeError||TRAP_PATTERNS.some(pattern=>message.includes(pattern)))return'heif_worker_crash';
    return'heif_decode_failed';
  }

  return Object.freeze({classifyWorkerFailure});
});

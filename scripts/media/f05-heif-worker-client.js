(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){exports.createHeifWorkerClient=api.createHeifWorkerClient;Object.freeze(module.exports);}else root.VVIP_F05_HEIF_WORKER_CLIENT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_BYTES=15*1024*1024;
  const DEFAULT_TIMEOUT_MS=20000;
  const SOURCE_KIND=Object.freeze({'image/heic':'heic','image/heif':'heif'});
  const DENIAL_CODES=new Set([
    'cancelled',
    'capability_unavailable',
    'decoder_integrity_mismatch',
    'heif_container_invalid',
    'heif_codec_unsupported',
    'heif_sequence_denied',
    'heif_memory_limit',
    'heif_decode_timeout',
    'heif_decode_failed',
    'signature_mismatch',
    'orientation_uncertain',
    'metadata_not_stripped',
    'encode_failed'
  ]);

  function fallbackError(code){const error=new Error(code);error.code=code;return error;}
  function validResult(result,job){
    const expectedKind=SOURCE_KIND[job&&job.mimeType];
    return Boolean(result&&result.blob&&['image/webp','image/jpeg'].includes(result.blob.type)&&Number.isInteger(result.blob.size)&&result.blob.size>0&&result.blob.size<=MAX_BYTES&&Number.isInteger(result.width)&&Number.isInteger(result.height)&&result.width>0&&result.height>0&&result.width<=1600&&result.height<=1200&&result.width*3===result.height*4&&result.decodeRoute==='wasm'&&result.sourceKind===expectedKind);
  }

  function createHeifWorkerClient(options){
    const deps=options||{};
    if(typeof deps.workerFactory!=='function'||typeof deps.buildWorkerTransfer!=='function')throw new TypeError('f05_heif_worker_client_dependencies_required');
    const createMediaError=typeof deps.createMediaError==='function'?deps.createMediaError:fallbackError;
    const timeoutMs=Number.isSafeInteger(deps.timeoutMs)&&deps.timeoutMs>0?Math.min(deps.timeoutMs,DEFAULT_TIMEOUT_MS):DEFAULT_TIMEOUT_MS;

    return Object.freeze({
      process(job){
        if(job&&job.signal&&job.signal.aborted)return Promise.reject(createMediaError('cancelled'));
        let transfer;
        try{transfer=deps.buildWorkerTransfer(job);}catch(error){return Promise.reject(error&&typeof error.code==='string'?createMediaError(error.code):createMediaError('heif_container_invalid'));}

        return new Promise(function(resolve,reject){
          let worker=null;
          let settled=false;
          let timeoutId=null;

          function cleanup(){
            if(timeoutId!==null){clearTimeout(timeoutId);timeoutId=null;}
            if(job&&job.signal&&typeof job.signal.removeEventListener==='function')job.signal.removeEventListener('abort',onAbort);
            if(!worker)return;
            try{worker.removeEventListener('message',onMessage);}catch(_){/* cleanup */}
            try{worker.removeEventListener('error',onError);}catch(_){/* cleanup */}
            try{worker.terminate();}catch(_){/* cleanup */}
          }
          function finish(handler,value){if(settled)return;settled=true;cleanup();handler(value);}
          function deny(code){finish(reject,createMediaError(DENIAL_CODES.has(code)?code:'capability_unavailable'));}
          function onAbort(){deny('cancelled');}
          function onError(){deny('capability_unavailable');}
          function onTimeout(){deny('heif_decode_timeout');}
          function onMessage(event){
            const message=event&&event.data;
            if(!message||message.jobId!==job.jobId){deny('capability_unavailable');return;}
            if(message.type==='error'){
              deny(typeof message.code==='string'?message.code:'capability_unavailable');
              return;
            }
            if(message.type!=='result'||!validResult(message.result,job)){deny('encode_failed');return;}
            finish(resolve,message.result);
          }

          try{
            worker=deps.workerFactory();
            if(!worker||typeof worker.addEventListener!=='function'||typeof worker.postMessage!=='function'||typeof worker.terminate!=='function'){deny('capability_unavailable');return;}
            worker.addEventListener('message',onMessage);
            worker.addEventListener('error',onError);
            if(job&&job.signal&&typeof job.signal.addEventListener==='function')job.signal.addEventListener('abort',onAbort,{once:true});
            timeoutId=setTimeout(onTimeout,timeoutMs);
            worker.postMessage(transfer.message,transfer.transfer);
          }catch(_){deny('capability_unavailable');}
        });
      }
    });
  }

  return Object.freeze({createHeifWorkerClient});
});

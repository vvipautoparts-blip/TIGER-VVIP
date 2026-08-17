(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){exports.createHeifWorkerCore=api.createHeifWorkerCore;Object.freeze(module.exports);}else root.VVIP_F05_HEIF_WORKER_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SOURCE_KIND=Object.freeze({'image/heic':'heic','image/heif':'heif'});
  const MAX_BYTES=15*1024*1024;
  const EXPECTED_POLICY=Object.freeze({maxPixels:40000000,minWidth:320,minHeight:240,maxWidth:1600,maxHeight:1200,webpQuality:0.82,jpegQuality:0.86});
  function fail(code){const error=new Error(code);error.code=code;throw error;}
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function validJob(job){
    if(!job||typeof job.jobId!=='string'||job.jobId.length<1||job.jobId.length>80)fail('heif_container_invalid');
    if(!(job.bytes instanceof ArrayBuffer)||job.bytes.byteLength<1||job.bytes.byteLength>MAX_BYTES)fail('heif_container_invalid');
    if(!SOURCE_KIND[job.mimeType])fail('heif_codec_unsupported');
    const transform=job.transform||{};
    if(![transform.zoom,transform.panX,transform.panY].every(finite))fail('orientation_uncertain');
    const policy=job.policy||{};
    for(const key of Object.keys(EXPECTED_POLICY))if(policy[key]!==EXPECTED_POLICY[key])fail('heif_container_invalid');
  }
  function validateDeps(deps){
    if(!deps||!deps.geometry||typeof deps.geometry.fitCrop!=='function'||typeof deps.geometry.outputSize!=='function'||!deps.heifPolicy||typeof deps.heifPolicy.admitHeifDecode!=='function'||typeof deps.inspect!=='function'||typeof deps.decode!=='function'||typeof deps.encode!=='function'||typeof deps.release!=='function')fail('capability_unavailable');
  }
  function createHeifWorkerCore(deps){
    validateDeps(deps);
    async function process(job,runtime){
      validJob(job);
      let inspected=null;
      let surface=null;
      try{
        inspected=await deps.inspect(job.bytes,job.mimeType);
        if(!inspected||!Number.isSafeInteger(inspected.width)||!Number.isSafeInteger(inspected.height)||!SOURCE_KIND[job.mimeType]||inspected.sourceKind!==SOURCE_KIND[job.mimeType])fail('signature_mismatch');
        const admission=deps.heifPolicy.admitHeifDecode({codec:inspected.codec,isStill:inspected.isStill,width:inspected.width,height:inspected.height},runtime||{});
        if(!admission||admission.ok!==true)fail(admission&&typeof admission.code==='string'?admission.code:'heif_memory_limit');
        surface=await deps.decode(inspected);
        if(!surface||surface.width!==inspected.width||surface.height!==inspected.height||surface.orientationApplied!==true||surface.colorSpace!=='srgb'||!(surface.data instanceof Uint8ClampedArray)||surface.data.length!==surface.width*surface.height*4)fail('heif_decode_failed');
        const crop=deps.geometry.fitCrop({sourceWidth:surface.width,sourceHeight:surface.height,zoom:job.transform.zoom,panX:job.transform.panX,panY:job.transform.panY});
        const output=deps.geometry.outputSize(crop);
        const encoded=await deps.encode({surface,crop,output,quality:{webp:EXPECTED_POLICY.webpQuality,jpeg:EXPECTED_POLICY.jpegQuality}});
        if(!encoded||!encoded.blob||!['image/webp','image/jpeg'].includes(encoded.blob.type)||!Number.isInteger(encoded.blob.size)||encoded.blob.size<1||encoded.blob.size>MAX_BYTES||encoded.width!==output.width||encoded.height!==output.height||encoded.width*3!==encoded.height*4)fail('encode_failed');
        return Object.freeze({blob:encoded.blob,width:encoded.width,height:encoded.height,decodeRoute:'wasm',sourceKind:inspected.sourceKind});
      }catch(error){
        throw error&&typeof error.code==='string'?fail(error.code):fail('heif_decode_failed');
      }finally{
        if(surface&&surface.data&&typeof surface.data.fill==='function')surface.data.fill(0);
        if(inspected)try{deps.release(inspected);}catch(_){/* cleanup is best effort after authority decision */}
      }
    }
    return Object.freeze({process});
  }
  return Object.freeze({createHeifWorkerCore});
});

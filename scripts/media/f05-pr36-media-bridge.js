(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VVIP_F05_PR36_MEDIA_BRIDGE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const HEIF_SOURCE_MIME=Object.freeze({'image/heic':'heic','image/heif':'heif'});
  function createF05MediaPolicyBridge(dependencies){
    const deps=dependencies||{};
    const pr36Policy=deps.pr36Policy;
    const heifPreflight=deps.heifPreflight;
    if(!pr36Policy||!pr36Policy.CONSTANTS||typeof pr36Policy.createMediaError!=='function'||typeof pr36Policy.validateSelection!=='function'||typeof pr36Policy.validateSource!=='function'||typeof pr36Policy.projectMetadata!=='function')throw new TypeError('f05_pr36_policy_required');
    if(!heifPreflight||typeof heifPreflight.probeHeifHeader!=='function'||!Number.isInteger(heifPreflight.MAX_HEIF_HEADER_BYTES)||heifPreflight.MAX_HEIF_HEADER_BYTES<8)throw new TypeError('f05_heif_preflight_required');
    const CONSTANTS=pr36Policy.CONSTANTS;
    const createMediaError=pr36Policy.createMediaError;
    function fail(code){throw createMediaError(code);}
    function validateCommonFileBounds(file){if(!file||typeof file.type!=='string')fail('mime_not_allowed');if(!Number.isFinite(file.size)||file.size<1)fail('unknown_format');if(file.size>CONSTANTS.maxFileBytes)fail('source_too_large');}
    function validateSelection(files,existingCount){const list=Array.from(files||[]);const prior=Number.isFinite(existingCount)?existingCount:0;if(list.length+prior>CONSTANTS.maxPhotos)fail('too_many_photos');let total=0;for(const file of list){if(Object.prototype.hasOwnProperty.call(HEIF_SOURCE_MIME,file&&file.type))validateCommonFileBounds(file);else pr36Policy.validateSelection([file],0);total+=file.size;}if(total>CONSTANTS.maxTotalBytes)fail('selection_total_too_large');return list;}
    async function readBoundedHeader(file,options){const o=options||{};const limit=Math.min(file.size,CONSTANTS.maxHeaderBytes,heifPreflight.MAX_HEIF_HEADER_BYTES);const reader=o.readHeader||(async(candidate,requestedLimit)=>new Uint8Array(await candidate.slice(0,requestedLimit).arrayBuffer()));const raw=await reader(file,limit);let bytes=raw instanceof Uint8Array?raw:Uint8Array.from(raw||[]);if(bytes.length>limit)bytes=bytes.slice(0,limit);return{bytes,limit};}
    async function validateHeifSource(file,options){const o=options||{};if(o.signal&&o.signal.aborted)fail('cancelled');validateCommonFileBounds(file);let bytes;try{const bounded=await readBoundedHeader(file,o);bytes=bounded.bytes;if(o.signal&&o.signal.aborted)fail('cancelled');const result=heifPreflight.probeHeifHeader(bytes);if(!result||result.ok!==true)fail(result&&typeof result.code==='string'?result.code:'unknown_format');const expectedFamily=HEIF_SOURCE_MIME[file.type];if(!expectedFamily||result.family!==expectedFamily)fail('signature_mismatch');return Object.freeze({file,mimeType:file.type,sourceKind:expectedFamily,requiresHeifDecode:true});}catch(error){if(error&&typeof error.code==='string')throw createMediaError(error.code);throw createMediaError('unknown_format');}finally{if(bytes&&typeof bytes.fill==='function')bytes.fill(0);}}
    async function validateSource(file,options){if(Object.prototype.hasOwnProperty.call(HEIF_SOURCE_MIME,file&&file.type))return validateHeifSource(file,options);return pr36Policy.validateSource(file,options);}
    function projectMetadata(items,coverId){return pr36Policy.projectMetadata(items,coverId);}
    return Object.freeze({CONSTANTS,createMediaError,validateSelection,validateSource,projectMetadata});
  }
  return Object.freeze({createF05MediaPolicyBridge});
});

'use strict';

const MiB=1024*1024;
const PRODUCTION_MEDIA_LIMITS=Object.freeze({
  maxCandidateBytes:15*MiB,
  maxRequestBytes:16*MiB,
  maxWidth:1600,
  maxHeight:1200
});
const ALLOWED_MIMES=Object.freeze(['image/jpeg','image/webp']);

function fail(code){const e=new Error(code);e.code=code;throw e;}
function bytesOf(value){return value instanceof Uint8Array?value:null;}
function validateMediaRequestEnvelope(input){
  if(!input||!['POST','PUT'].includes(input.method))fail('media_request_invalid');
  const encoding=input.contentEncoding==null?'identity':String(input.contentEncoding).toLowerCase();
  if(encoding!=='identity')fail('media_request_invalid');
  if(!Number.isSafeInteger(input.contentLength)||input.contentLength<1||input.contentLength>PRODUCTION_MEDIA_LIMITS.maxRequestBytes)fail('media_request_invalid');
  return Object.freeze({ok:true,maxCandidateBytes:PRODUCTION_MEDIA_LIMITS.maxCandidateBytes,maxRequestBytes:PRODUCTION_MEDIA_LIMITS.maxRequestBytes});
}
function assertDeps(deps){
  if(!deps||typeof deps.authorizeAdMedia!=='function'||typeof deps.sha256!=='function'||!deps.imageStack||typeof deps.imageStack.inspect!=='function'||typeof deps.imageStack.rewrite!=='function'||!deps.auditSink||typeof deps.auditSink.write!=='function')fail('media_production_ports_unavailable');
}
function createProductionMediaPorts(deps){
  assertDeps(deps);
  const inspectPolicy=Object.freeze({allowedMimes:[...ALLOWED_MIMES],maxWidth:PRODUCTION_MEDIA_LIMITS.maxWidth,maxHeight:PRODUCTION_MEDIA_LIMITS.maxHeight,rejectMetadata:true,rejectPolyglot:true,allowAnimation:false});
  return Object.freeze({
    authorizeAdMedia:(actor,scope)=>deps.authorizeAdMedia(actor,scope),
    sha256:bytes=>deps.sha256(bytes),
    async inspectCandidate(bytes,mime){
      const value=bytesOf(bytes);if(!value||!ALLOWED_MIMES.includes(mime)||value.length<1||value.length>PRODUCTION_MEDIA_LIMITS.maxCandidateBytes)fail('media_derivative_invalid');
      return deps.imageStack.inspect(value,inspectPolicy);
    },
    async rewriteCanonical(bytes,meta){
      const value=bytesOf(bytes);if(!value||!meta||!ALLOWED_MIMES.includes(meta.mime))fail('media_derivative_rewrite_failed');
      const policy=Object.freeze({mime:meta.mime,width:meta.width,height:meta.height,maxWidth:PRODUCTION_MEDIA_LIMITS.maxWidth,maxHeight:PRODUCTION_MEDIA_LIMITS.maxHeight,stripMetadata:true,colorSpace:'srgb',allowAnimation:false});
      const rewritten=await deps.imageStack.rewrite(value,policy);
      if(!rewritten||!(rewritten.bytes instanceof Uint8Array))fail('media_derivative_rewrite_failed');
      return rewritten;
    },
    auditSecurityEvent:event=>deps.auditSink.write(event)
  });
}

exports.PRODUCTION_MEDIA_LIMITS=PRODUCTION_MEDIA_LIMITS;
exports.validateMediaRequestEnvelope=validateMediaRequestEnvelope;
exports.createProductionMediaPorts=createProductionMediaPorts;
Object.freeze(module.exports);

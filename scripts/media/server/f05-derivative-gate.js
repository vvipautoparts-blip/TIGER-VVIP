'use strict';

const MAX_BYTES=15*1024*1024;
const SHA=/^[0-9a-f]{64}$/;

function fail(code){const e=new Error(code);e.code=code;throw e;}
function bytesOf(v){return v instanceof Uint8Array?v:null;}
function sizeBucket(bytes){const MiB=1024*1024;if(!Number.isSafeInteger(bytes)||bytes<0)return'unknown';if(bytes<MiB)return'lt1mib';if(bytes<4*MiB)return'1_4mib';return'4_15mib';}
function detectMime(bytes){if(bytes&&bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return'image/jpeg';if(bytes&&bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return'image/webp';return null;}
function validInspection(x,mime){return x&&x.mime===mime&&Number.isSafeInteger(x.width)&&Number.isSafeInteger(x.height)&&x.width>0&&x.height>0&&x.width<=1600&&x.height<=1200&&x.width*3===x.height*4&&x.hasForbiddenMetadata===false&&x.isPolyglot===false;}
function validPassport(p,mime,size){return p&&p.schemaVersion==='F05_MEDIA_PASSPORT_V1'&&p.mediaPolicyVersion==='F05_BPLUS_V1'&&p.outputMime===mime&&p.sizeBytes===size&&Number.isSafeInteger(p.width)&&Number.isSafeInteger(p.height)&&p.width>0&&p.height>0&&SHA.test(String(p.sha256||''));}
function auditEvent(fields){return Object.freeze({schemaVersion:'F05_MEDIA_SECURITY_AUDIT_V1',...fields});}
async function emitAudit(ports,fields){try{await ports.auditSecurityEvent(auditEvent(fields));}catch(_){/* audit transport must never weaken a reject decision */}}
async function rejectWithAudit(ports,stage,code,context){await emitAudit(ports,{outcome:'rejected',stage,code,candidateMime:context&&context.mime||'unknown',sizeBucket:sizeBucket(context&&context.sizeBytes)});fail(code);}

async function verifyAndRewriteCandidate(input,ports){
  if(!input||!ports||typeof ports.authorizeAdMedia!=='function'||typeof ports.sha256!=='function'||typeof ports.inspectCandidate!=='function'||typeof ports.rewriteCanonical!=='function'||typeof ports.auditSecurityEvent!=='function')fail('media_derivative_invalid');

  let authorized=false;
  try{authorized=await ports.authorizeAdMedia(input.actor,input.adScope)===true;}catch(_){authorized=false;}
  if(!authorized)await rejectWithAudit(ports,'authorize','media_derivative_invalid',{sizeBytes:0});

  const bytes=bytesOf(input.candidateBytes);
  if(!bytes||bytes.length<1||bytes.length>MAX_BYTES)await rejectWithAudit(ports,'bounds','media_derivative_invalid',{sizeBytes:bytes?bytes.length:0});

  const mime=detectMime(bytes);
  if(!mime)await rejectWithAudit(ports,'signature','media_derivative_invalid',{sizeBytes:bytes.length});
  if(!validPassport(input.mediaPassport,mime,bytes.length))await rejectWithAudit(ports,'passport','media_derivative_invalid',{mime,sizeBytes:bytes.length});

  let candidateSha;
  try{candidateSha=await ports.sha256(bytes);}catch(_){candidateSha=null;}
  if(candidateSha!==input.mediaPassport.sha256)await rejectWithAudit(ports,'candidate_integrity','media_derivative_invalid',{mime,sizeBytes:bytes.length});

  let inspected;
  try{inspected=await ports.inspectCandidate(bytes,mime);}catch(_){inspected=null;}
  if(!validInspection(inspected,mime)||inspected.width!==input.mediaPassport.width||inspected.height!==input.mediaPassport.height){
    await rejectWithAudit(ports,'candidate_inspection','media_derivative_invalid',{mime,sizeBytes:bytes.length});
  }

  let rewritten;
  try{rewritten=await ports.rewriteCanonical(bytes,Object.freeze({mime,width:inspected.width,height:inspected.height}));}
  catch(_){await rejectWithAudit(ports,'rewrite','media_derivative_rewrite_failed',{mime,sizeBytes:bytes.length});}

  const canonicalBytes=bytesOf(rewritten&&rewritten.bytes);
  const canonicalMime=detectMime(canonicalBytes);
  if(!canonicalBytes||canonicalBytes.length<1||canonicalBytes.length>MAX_BYTES||!canonicalMime){
    await rejectWithAudit(ports,'canonical_signature','media_derivative_rewrite_failed',{sizeBytes:canonicalBytes?canonicalBytes.length:0});
  }

  let finalInspection;
  try{finalInspection=await ports.inspectCandidate(canonicalBytes,canonicalMime);}catch(_){finalInspection=null;}
  if(!validInspection(finalInspection,canonicalMime)){
    await rejectWithAudit(ports,'canonical_inspection','media_derivative_rewrite_failed',{mime:canonicalMime,sizeBytes:canonicalBytes.length});
  }

  let sha256;
  try{sha256=await ports.sha256(canonicalBytes);}catch(_){sha256=null;}
  if(!SHA.test(String(sha256||''))){
    await rejectWithAudit(ports,'canonical_integrity','media_derivative_rewrite_failed',{mime:canonicalMime,sizeBytes:canonicalBytes.length});
  }

  await emitAudit(ports,{outcome:'accepted',stage:'canonical',code:'ok',canonicalMime,sizeBucket:sizeBucket(canonicalBytes.length)});
  return Object.freeze({ok:true,canonicalMime,width:finalInspection.width,height:finalInspection.height,sizeBytes:canonicalBytes.length,sha256,policyVersion:'F05_BPLUS_V1',canonicalBytes});
}

exports.detectMime=detectMime;
exports.verifyAndRewriteCandidate=verifyAndRewriteCandidate;
Object.freeze(module.exports);

'use strict';
const M=1024*1024;
const PR36_LIMITS=Object.freeze({maxPhotos:7,maxFileBytes:15*M,maxTotalBytes:60*M});
const LOCAL_PR36_MIMES=Object.freeze(['image/jpeg','image/png','image/webp']);
const HEIC_SERVER_MIMES=Object.freeze(['image/heic','image/heif','image/heic-sequence','image/heif-sequence']);
const ALLOWED_MIMES=new Set([...LOCAL_PR36_MIMES,...HEIC_SERVER_MIMES]);
const QUARANTINE_STAGES=Object.freeze(['DECODE','VALIDATE','MALWARE_POLYGLOT_CHECK','COLOR_MANAGEMENT','METADATA_SANITIZATION','CONTENT_ADAPTIVE_ENCODING','DERIVATIVES','STORAGE_COMMIT']);
function fail(code){const e=new Error(code);e.code=code;throw e;}
function validateFileMetadata(file){if(!file||typeof file!=='object'||Array.isArray(file))fail('F05_FILE_METADATA_INVALID');if(typeof file.type!=='string'||!ALLOWED_MIMES.has(file.type))fail('F05_MEDIA_TYPE_DENIED');if(!Number.isFinite(file.size)||file.size<1)fail('F05_FILE_METADATA_INVALID');if(file.size>PR36_LIMITS.maxFileBytes)fail('F05_SOURCE_TOO_LARGE');return file;}
function routeMediaFile(file){validateFileMetadata(file);if(LOCAL_PR36_MIMES.includes(file.type))return Object.freeze({route:'PR36_LOCAL',requiresServerValidation:false,originalPublicUploadAllowed:false});return Object.freeze({route:'SERVER_QUARANTINE',requiresServerValidation:true,originalPublicUploadAllowed:false});}
function validateHybridSelection(files,existingCount=0){const list=Array.from(files||[]);if(!Number.isSafeInteger(existingCount)||existingCount<0||list.length+existingCount>PR36_LIMITS.maxPhotos)fail('F05_TOO_MANY_PHOTOS');let total=0;for(const file of list){validateFileMetadata(file);total+=file.size;}if(total>PR36_LIMITS.maxTotalBytes)fail('F05_SELECTION_TOTAL_TOO_LARGE');return Object.freeze(list.slice());}
function buildQuarantineRequest(file){const route=routeMediaFile(file);if(route.route!=='SERVER_QUARANTINE')fail('F05_QUARANTINE_ROUTE_REQUIRED');return Object.freeze({schemaVersion:'F05_HEIC_QUARANTINE_V1',declaredMime:file.type,sizeBytes:file.size,route:'PRIVATE_QUARANTINE',publicVisibility:false,originalPublicUploadAllowed:false,requiresServerValidation:true,processingStages:QUARANTINE_STAGES,result:'PENDING_SERVER_VALIDATION'});}
module.exports=Object.freeze({PR36_LIMITS,LOCAL_PR36_MIMES,HEIC_SERVER_MIMES,QUARANTINE_STAGES,routeMediaFile,validateHybridSelection,buildQuarantineRequest});
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){exports.DECODER_POLICY_VERSION=api.DECODER_POLICY_VERSION;exports.APP_POLICY_VERSION=api.APP_POLICY_VERSION;exports.validateDecoderPolicy=api.validateDecoderPolicy;Object.freeze(module.exports);}else root.VVIP_F05_DECODER_POLICY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DECODER_POLICY_VERSION='F05_DECODER_POLICY_V1';
  const APP_POLICY_VERSION='F05_BPLUS_V1';
  const DIGEST_RE=/^[0-9a-f]{64}$/;
  const ARTIFACT_VERSION_RE=/^[A-Za-z0-9._+-]{1,120}$/;
  function deny(code){return Object.freeze({ok:false,code});}
  function validTimestamp(value){if(typeof value!=='string'||value.length<20||value.length>40)return null;const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null;}
  function validateDecoderPolicy(descriptor,now,artifactDigest){if(!descriptor||typeof descriptor!=='object'||Array.isArray(descriptor))return deny('heif_decoder_policy_invalid');if(descriptor.serverConfirmed!==true)return deny('heif_decoder_policy_invalid');if(descriptor.decoderPolicyVersion!==DECODER_POLICY_VERSION)return deny('heif_decoder_policy_invalid');if(descriptor.minimumAppPolicyVersion!==APP_POLICY_VERSION)return deny('heif_decoder_policy_invalid');if(descriptor.status==='REVOKED'||descriptor.status==='DISABLED')return deny('heif_decoder_revoked');if(descriptor.status!=='ACTIVE')return deny('heif_decoder_policy_invalid');if(!ARTIFACT_VERSION_RE.test(String(descriptor.artifactVersion||'')))return deny('heif_decoder_policy_invalid');if(!DIGEST_RE.test(String(descriptor.artifactSha256||'')))return deny('heif_decoder_policy_invalid');if(!DIGEST_RE.test(String(artifactDigest||'')))return deny('heif_decoder_integrity_failed');if(descriptor.artifactSha256!==artifactDigest)return deny('heif_decoder_integrity_failed');if(!Number.isFinite(now))return deny('heif_decoder_policy_invalid');const notBefore=validTimestamp(descriptor.notBefore);const expiresAt=validTimestamp(descriptor.expiresAt);if(notBefore===null||expiresAt===null||expiresAt<=notBefore)return deny('heif_decoder_policy_invalid');if(now<notBefore)return deny('heif_decoder_policy_invalid');if(now>=expiresAt)return deny('heif_decoder_policy_expired');return Object.freeze({ok:true,decoderPolicyVersion:DECODER_POLICY_VERSION,artifactVersion:descriptor.artifactVersion,artifactSha256:descriptor.artifactSha256,expiresAt:descriptor.expiresAt});}
  return Object.freeze({DECODER_POLICY_VERSION,APP_POLICY_VERSION,validateDecoderPolicy});
});

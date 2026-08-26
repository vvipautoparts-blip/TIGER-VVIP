(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){
    exports.buildMediaTelemetryEvent=api.buildMediaTelemetryEvent;
    exports.bucketDurationMs=api.bucketDurationMs;
    exports.bucketBytes=api.bucketBytes;
    exports.bucketPixels=api.bucketPixels;
    Object.freeze(module.exports);
  }else root.VVIP_F05_OBSERVABILITY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ALLOWED_KEYS=new Set([
    'stage','sourceClass','decodeRoute','outcome','errorFamily','durationMs','sourceBytes','decodedPixels',
    'decoderPolicyVersion','mediaPolicyVersion'
  ]);
  const STAGES=new Set(['preflight','decode','encode','privacy_gate','server_gate']);
  const SOURCES=new Set(['heic','heif','jpeg','png','webp']);
  const ROUTES=new Set(['wasm','native','pr36-native','none']);
  const OUTCOMES=new Set(['success','rejected','timeout','cancelled','oom','crash']);
  const ERRORS=new Set(['none','container','codec','sequence','dimensions','memory','timeout','cancelled','crash','integrity','privacy','color','orientation','encode','server_validation','server_rewrite']);
  const TOKEN=/^[A-Za-z0-9._:-]{1,96}$/;

  function fail(){const e=new Error('media_telemetry_invalid');e.code='media_telemetry_invalid';throw e;}
  function finiteNonNegative(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0;}
  function safeIntegerNonNegative(value){return Number.isSafeInteger(value)&&value>=0;}
  function bucketDurationMs(ms){if(!finiteNonNegative(ms))fail();if(ms<250)return'lt250ms';if(ms<1000)return'250_999ms';if(ms<5000)return'1_4s';if(ms<20000)return'5_19s';return'20s_plus';}
  function bucketBytes(bytes){if(!safeIntegerNonNegative(bytes))fail();const MiB=1024*1024;if(bytes<MiB)return'lt1mib';if(bytes<4*MiB)return'1_4mib';return'4_15mib';}
  function bucketPixels(pixels){if(!safeIntegerNonNegative(pixels))fail();if(pixels<2_000_000)return'lt2mp';if(pixels<8_000_000)return'2_8mp';if(pixels<16_000_000)return'8_16mp';return'16_40mp';}
  function validToken(value){return typeof value==='string'&&TOKEN.test(value);}

  function buildMediaTelemetryEvent(input){
    if(!input||typeof input!=='object'||Array.isArray(input))fail();
    for(const key of Object.keys(input))if(!ALLOWED_KEYS.has(key))fail();
    if(!STAGES.has(input.stage)||!SOURCES.has(input.sourceClass)||!ROUTES.has(input.decodeRoute)||!OUTCOMES.has(input.outcome)||!ERRORS.has(input.errorFamily))fail();
    if(!validToken(input.decoderPolicyVersion)||!validToken(input.mediaPolicyVersion))fail();
    if(input.decodedPixels>40_000_000||input.sourceBytes>15*1024*1024)fail();
    return Object.freeze({
      schemaVersion:'F05_MEDIA_TELEMETRY_V1',
      stage:input.stage,
      sourceClass:input.sourceClass,
      decodeRoute:input.decodeRoute,
      outcome:input.outcome,
      errorFamily:input.errorFamily,
      durationBucket:bucketDurationMs(input.durationMs),
      sourceBytesBucket:bucketBytes(input.sourceBytes),
      decodedPixelsBucket:bucketPixels(input.decodedPixels),
      decoderPolicyVersion:input.decoderPolicyVersion,
      mediaPolicyVersion:input.mediaPolicyVersion
    });
  }

  return Object.freeze({buildMediaTelemetryEvent,bucketDurationMs,bucketBytes,bucketPixels});
});

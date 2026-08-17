(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){
    exports.inspectCanonicalDerivative=api.inspectCanonicalDerivative;
    exports.assertSanitizedBlob=api.assertSanitizedBlob;
    Object.freeze(module.exports);
  }else root.VVIP_F05_DERIVATIVE_PRIVACY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_BYTES=15*1024*1024;
  const WEBP_ALLOWED_CHUNKS=new Set(['VP8 ','VP8L','VP8X','ALPH','ICCP']);
  const JPEG_ALLOWED_APP_MARKERS=new Set([0xe0,0xe2,0xee]);

  function verdict(ok,code){return ok?Object.freeze({ok:true}):Object.freeze({ok:false,code});}
  function fail(code){const error=new Error(code);error.code=code;throw error;}
  function bytesOf(value){return value instanceof Uint8Array?value:null;}
  function ascii4(bytes,offset){return String.fromCharCode(bytes[offset],bytes[offset+1],bytes[offset+2],bytes[offset+3]);}
  function u32le(bytes,offset){return (bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0;}

  function inspectJpeg(bytes){
    if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)return verdict(false,'media_derivative_invalid');
    let offset=2;
    let inScan=false;

    while(offset<bytes.length){
      let marker;

      if(inScan){
        let found=false;
        while(offset<bytes.length){
          if(bytes[offset]!==0xff){offset++;continue;}
          offset++;
          while(offset<bytes.length&&bytes[offset]===0xff)offset++;
          if(offset>=bytes.length)return verdict(false,'media_derivative_invalid');
          marker=bytes[offset++];
          if(marker===0x00)continue;
          if(marker>=0xd0&&marker<=0xd7)continue;
          found=true;
          inScan=false;
          break;
        }
        if(!found)return verdict(false,'media_derivative_invalid');
      }else{
        if(bytes[offset]!==0xff)return verdict(false,'media_derivative_invalid');
        while(offset<bytes.length&&bytes[offset]===0xff)offset++;
        if(offset>=bytes.length)return verdict(false,'media_derivative_invalid');
        marker=bytes[offset++];
        if(marker===0x00)return verdict(false,'media_derivative_invalid');
      }

      if(marker===0xd9)return offset===bytes.length?verdict(true):verdict(false,'media_derivative_invalid');
      if(marker===0xd8)return verdict(false,'media_derivative_invalid');
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(offset+2>bytes.length)return verdict(false,'media_derivative_invalid');

      const length=(bytes[offset]<<8)|bytes[offset+1];
      if(length<2)return verdict(false,'media_derivative_invalid');
      const end=offset+length;
      if(!Number.isSafeInteger(end)||end>bytes.length)return verdict(false,'media_derivative_invalid');

      if(marker===0xfe)return verdict(false,'metadata_not_stripped');
      if(marker>=0xe0&&marker<=0xef&&!JPEG_ALLOWED_APP_MARKERS.has(marker))return verdict(false,'metadata_not_stripped');

      offset=end;
      if(marker===0xda)inScan=true;
    }

    return verdict(false,'media_derivative_invalid');
  }

  function inspectWebp(bytes){
    if(bytes.length<12||ascii4(bytes,0)!=='RIFF'||ascii4(bytes,8)!=='WEBP')return verdict(false,'media_derivative_invalid');
    const declared=u32le(bytes,4);
    if(declared!==bytes.length-8)return verdict(false,'media_derivative_invalid');
    let offset=12;
    while(offset<bytes.length){
      if(offset+8>bytes.length)return verdict(false,'media_derivative_invalid');
      const type=ascii4(bytes,offset);
      const size=u32le(bytes,offset+4);
      const dataStart=offset+8;
      const dataEnd=dataStart+size;
      if(!Number.isSafeInteger(dataEnd)||dataEnd>bytes.length)return verdict(false,'media_derivative_invalid');
      if(!WEBP_ALLOWED_CHUNKS.has(type))return verdict(false,'metadata_not_stripped');
      if(type==='VP8X'){
        if(size!==10)return verdict(false,'media_derivative_invalid');
        const flags=bytes[dataStart];
        if((flags&0x0e)!==0)return verdict(false,'metadata_not_stripped');
        if((flags&0xc1)!==0)return verdict(false,'media_derivative_invalid');
      }
      const paddedEnd=dataEnd+(size&1);
      if(paddedEnd>bytes.length)return verdict(false,'media_derivative_invalid');
      if((size&1)&&bytes[dataEnd]!==0)return verdict(false,'media_derivative_invalid');
      offset=paddedEnd;
    }
    return offset===bytes.length?verdict(true):verdict(false,'media_derivative_invalid');
  }

  function inspectCanonicalDerivative(input,mime){
    const bytes=bytesOf(input);
    if(!bytes||bytes.length<1||bytes.length>MAX_BYTES)return verdict(false,'media_derivative_invalid');
    if(mime==='image/jpeg')return inspectJpeg(bytes);
    if(mime==='image/webp')return inspectWebp(bytes);
    return verdict(false,'media_derivative_invalid');
  }

  async function assertSanitizedBlob(blob){
    if(!blob||!['image/jpeg','image/webp'].includes(blob.type)||!Number.isInteger(blob.size)||blob.size<1||blob.size>MAX_BYTES||typeof blob.arrayBuffer!=='function')fail('media_derivative_invalid');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const result=inspectCanonicalDerivative(bytes,blob.type);
    if(result.ok!==true)fail(result.code||'media_derivative_invalid');
    return blob;
  }

  return Object.freeze({inspectCanonicalDerivative,assertSanitizedBlob});
});

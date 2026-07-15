(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VVIP_PR36_SIGNATURE=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function starts(b,s){return b&&b.length>=s.length&&s.every((v,i)=>b[i]===v);}
  function u16be(b,i){return b[i]*256+b[i+1];}
  function u24le(b,i){return b[i]+b[i+1]*256+b[i+2]*65536;}
  function u32be(b,i){return b[i]*16777216+b[i+1]*65536+b[i+2]*256+b[i+3];}
  function dimensions(bytes,mime){
    const b=bytes instanceof Uint8Array?bytes:Uint8Array.from(bytes||[]);
    if(mime==='image/png'){
      if(b.length<24||!starts(b,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])||!starts(b.slice(12),[0x49,0x48,0x44,0x52]))return null;
      return{width:u32be(b,16),height:u32be(b,20)};
    }
    if(mime==='image/webp'){
      if(b.length<30||detectSignature(b)!==mime)return null;
      const kind=String.fromCharCode(b[12],b[13],b[14],b[15]);
      if(kind==='VP8X')return{width:1+u24le(b,24),height:1+u24le(b,27)};
      if(kind==='VP8 '&&b.length>=30&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a)return{width:u16be([b[27],b[26]],0)&0x3fff,height:u16be([b[29],b[28]],0)&0x3fff};
      if(kind==='VP8L'&&b.length>=25&&b[20]===0x2f){const bits=b[21]+b[22]*256+b[23]*65536+b[24]*16777216;return{width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff)};}
      return null;
    }
    if(mime==='image/jpeg'){
      if(b.length<4||!starts(b,[0xff,0xd8,0xff]))return null;
      let i=2,found=null;
      while(i+3<b.length){while(i<b.length&&b[i]===0xff)i++;const marker=b[i++];if(marker===0xda)return found;if(marker===0xd9)return null;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;if(i+1>=b.length)return null;const length=u16be(b,i);if(length<2||i+length>b.length)return null;if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||(marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)){if(length<7||found)return null;found={height:u16be(b,i+3),width:u16be(b,i+5)};}i+=length;
      }
    }
    return null;
  }
  function detectSignature(bytes){
    const b=bytes instanceof Uint8Array?bytes:Uint8Array.from(bytes||[]);
    if(starts(b,[0xff,0xd8,0xff]))return'image/jpeg';
    if(starts(b,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return'image/png';
    if(b.length>=12&&starts(b,[0x52,0x49,0x46,0x46])&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50)return'image/webp';
    return null;
  }
  return Object.freeze({detectSignature,dimensions});
});

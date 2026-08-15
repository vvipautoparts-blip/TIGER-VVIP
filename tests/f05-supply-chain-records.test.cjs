'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.join(ROOT,'third_party/f05-heif');
const read=name=>fs.readFileSync(path.join(DIR,name),'utf8');
const json=name=>JSON.parse(read(name));

test('F05 decoder supply-chain records are complete and pinned',()=>{
  for(const name of ['BUILD.md','SBOM.spdx.json','PROVENANCE.json','CHECKSUMS.sha256','NOTICE.md']) {
    assert.equal(fs.existsSync(path.join(DIR,name)),true,`${name} missing`);
  }
  const source=json('SOURCE_MANIFEST.json');
  const build=JSON.parse(fs.readFileSync(path.join(ROOT,'workers/media/f05-heif-decoder.v1.manifest.json'),'utf8'));
  const sbom=json('SBOM.spdx.json');
  const provenance=json('PROVENANCE.json');
  const sums=read('CHECKSUMS.sha256');
  const notice=read('NOTICE.md');
  const names=new Map(sbom.packages.map(p=>[p.name,p]));
  assert.equal(sbom.spdxVersion,'SPDX-2.3');
  assert.equal(names.get('libheif').versionInfo,source.libheif.version);
  assert.equal(names.get('libde265').versionInfo,source.libde265.version);
  assert.equal(names.get('Emscripten').versionInfo,source.emscripten.version);
  assert.equal(provenance.subject.sourceHeadSha,build.sourceHeadSha);
  assert.equal(provenance.materials.libheif.sha256,source.libheif.sourceSha256);
  assert.equal(provenance.materials.libde265.sha256,source.libde265.sourceSha256);
  assert.match(sums,new RegExp(build.artifacts.js.sha256+'\\s+workers/media/'+build.artifacts.js.name));
  assert.match(sums,new RegExp(build.artifacts.wasm.sha256+'\\s+workers/media/'+build.artifacts.wasm.name));
  assert.match(notice,/libheif/i);
  assert.match(notice,/libde265/i);
  assert.match(notice,/LGPL/i);
  assert.match(notice,/HEVC/i);
  assert.match(notice,/legal review/i);
});

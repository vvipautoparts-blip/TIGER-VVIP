const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const workflows=[
  '.github/workflows/f05-heif-wasm-build.yml',
  '.github/workflows/lc03-supabase-security-rehearsal.yml',
  '.github/workflows/lc04-production-legacy-rpc-rehearsal.yml',
  '.github/workflows/media-finalizer-rehearsal.yml',
  '.github/workflows/media-finalizer-db-rehearsal.yml',
  '.github/workflows/media-finalizer-infra-rehearsal.yml',
  '.github/workflows/production-release-artifact.yml',
  '.github/workflows/tiger-synapse-s4-proof-rehearsal.yml',
  '.github/workflows/tiger-media-sovereign-sealed-build.yml'
];
function uploadBlocks(source){
  const lines=source.split(/\r?\n/);const blocks=[];
  for(let i=0;i<lines.length;i++){
    if(!/uses:\s*actions\/upload-artifact@/.test(lines[i]))continue;
    const indent=(lines[i].match(/^\s*/)||[''])[0].length;const block=[lines[i]];
    for(let j=i+1;j<lines.length;j++){
      const t=lines[j];const current=(t.match(/^\s*/)||[''])[0].length;
      if(/^\s*-\s+name:/.test(t)&&current<=indent)break;
      block.push(t);
    }
    blocks.push(block.join('\n'));
  }
  return blocks;
}
test('every inventoried upload-artifact has explicit bounded retention',()=>{
  let count=0;
  for(const relative of workflows){
    const source=fs.readFileSync(path.join(root,relative),'utf8');
    const blocks=uploadBlocks(source);assert.ok(blocks.length>0,`${relative} must contain inventoried upload-artifact`);
    for(const block of blocks){count++;const match=block.match(/retention-days:\s*(\d+)/);assert.ok(match,`${relative} upload must declare retention-days`);const days=Number(match[1]);assert.ok(days>=1&&days<=14,`${relative} retention must stay bounded to 1..14 days, got ${days}`);}
  }
  assert.ok(count>=10,'inventory must cover all current artifact upload blocks');
});
test('failure diagnostics remain shorter-lived than canonical exact-head evidence',()=>{
  const source=fs.readFileSync(path.join(root,'.github/workflows/media-finalizer-db-rehearsal.yml'),'utf8');
  assert.match(source,/failure diagnostics[\s\S]*?retention-days:\s*3/);
  assert.match(source,/exact-head DB evidence[\s\S]*?retention-days:\s*14/);
});

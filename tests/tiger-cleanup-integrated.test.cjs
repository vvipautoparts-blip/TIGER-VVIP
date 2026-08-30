const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const cleanup=()=>import(pathToFileURL(path.join(root,'scripts/cleanup/tiger-cleanup.mjs')).href+`?${Math.random()}`);
function fixture({blocked=false,sibling=false}={}){
  let tick=0;
  const objects=[
    {id:'file:target',path:'tmp/target',sha256:'a'.repeat(64),ephemeral:true},
    {id:'file:authority',path:'protected/authority',sha256:'b'.repeat(64),authority:true},
    ...(sibling?[{id:'file:sibling',path:'tmp/sibling',sha256:'c'.repeat(64),authority:true}]:[])
  ];
  const state={objects};
  const observe=async()=>({schema_version:'TEST',environment_identity:'fixture-env',observed_at:new Date(1000+(tick++)*1000).toISOString(),filesystem:{capacity:{available:true,total_bytes:1000000,free_bytes:800000},inodes:{available:true,total_inodes:100000,free_inodes:80000}},git:{available:true,head:'f'.repeat(40),status:''},objects:state.objects.map(x=>({...x})),plane_coverage:[{plane:'repository',state:'OBSERVED'}]});
  const remoteAdapters=blocked?[{async observe(){return {plane:'github_actions_cache',state:'BLOCKED_CAPABILITY',objects:[]};}}]:[];
  return {state,observe,remoteAdapters};
}
const authority={authority:'OWNER_TEST',decision:'APPROVED'};
test('full-safe run preserves locks, routes target through AION, and is partial when a remote plane is blocked',async()=>{const m=await cleanup();const f=fixture({blocked:true});const r=await m.runTigerCleanup({root,mode:'full-safe',observe:f.observe,remoteAdapters:f.remoteAdapters,authorization:authority,rollbackPlanRef:'rollback:test',disposeExecutor:async target=>{f.state.objects=f.state.objects.filter(x=>x.id!==target.target_id);return {disposed:true};},now:new Date('2026-08-29T00:00:00Z')});assert.equal(r.passport.final_status,'PARTIAL');assert.deepEqual(r.verification.unexpected_deletions,[]);assert.deepEqual(r.verification.missing_aion_certificates,[]);assert.equal(r.aion_certificates.length,1);assert.equal(r.aion_certificates[0].asset_id,'file:target');assert.ok(r.passport.protected_locks.some(x=>x.includes('file:authority')));assert.equal(r.shadow_plan.targets.length,1);});
test('scoped run is idempotent: second execution is a verified no-op',async()=>{const m=await cleanup();const f=fixture();let calls=0;const options={root,mode:'scoped',observe:f.observe,authorization:authority,rollbackPlanRef:'rollback:test',disposeExecutor:async target=>{calls++;f.state.objects=f.state.objects.filter(x=>x.id!==target.target_id);},now:new Date('2026-08-29T00:00:00Z')};const first=await m.runTigerCleanup(options);assert.equal(first.passport.final_status,'GREEN_SCOPED');assert.equal(calls,1);const second=await m.runTigerCleanup(options);assert.equal(second.passport.final_status,'GREEN_SCOPED');assert.equal(second.shadow_plan.targets.length,0);assert.equal(second.verification.actual_deleted_objects.length,0);assert.equal(calls,1);});
test('collateral sibling deletion is detected and cannot receive green passport',async()=>{const m=await cleanup();const f=fixture({sibling:true});const r=await m.runTigerCleanup({root,mode:'scoped',observe:f.observe,authorization:authority,rollbackPlanRef:'rollback:test',disposeExecutor:async target=>{f.state.objects=f.state.objects.filter(x=>![target.target_id,'file:sibling'].includes(x.id));},now:new Date('2026-08-29T00:00:00Z')});assert.equal(r.verification.status,'FAILED_VERIFICATION');assert.deepEqual(r.verification.unexpected_deletions,['file:sibling']);assert.equal(r.passport.final_status,'FAILED_VERIFICATION');});
test('eligible destructive work fails closed without externally supplied approval, rollback, and executor',async()=>{const m=await cleanup();const f=fixture();await assert.rejects(()=>m.runTigerCleanup({root,mode:'scoped',observe:f.observe,now:new Date('2026-08-29T00:00:00Z')}),/DESTRUCTIVE_AUTHORITY_REQUIRED/);});
test('orchestrator contains no direct destructive primitive or second classification table',()=>{const source=fs.readFileSync(path.join(root,'scripts/cleanup/tiger-cleanup.mjs'),'utf8');assert.doesNotMatch(source,/\bfs\.rm|\bfs\.unlink|\brm\s+-rf|docker[^\n]+prune|supabase[^\n]+(?:stop|db\s+reset)/i);assert.match(source,/classifyCandidate/);assert.doesNotMatch(source,/S0_SOVEREIGN['"]\s*:/);});

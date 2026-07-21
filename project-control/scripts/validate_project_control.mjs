import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const readText = p => fs.readFileSync(path.join(root,p),'utf8');
const manifest = readJson('data/manifest.json');
const phases = readJson('data/phases.json');
const tasks = readJson('data/tasks.json');
const deps = readJson('data/task_dependencies.json');
const failures=[];
const check=(condition,message)=>{if(!condition) failures.push(message)};
check(phases.length===manifest.counts.phases,'phase count mismatch');
check(tasks.length===manifest.counts.tasks,'task count mismatch');
check(deps.length===manifest.counts.dependencies,'dependency count mismatch');
check(new Set(tasks.map(t=>t.code)).size===tasks.length,'duplicate task code');
const codes=new Set(tasks.map(t=>t.code));
for(const d of deps){check(codes.has(d.task_code),`missing task ${d.task_code}`);check(codes.has(d.depends_on_task_code),`missing dependency ${d.depends_on_task_code}`)}
for(const row of readText('data/test_case_catalog.csv').trim().split(/\r?\n/).slice(1)){
  const [testCaseId,,taskCode]=row.replace(/^\uFEFF/,'').split(',');
  check(codes.has(taskCode),`${testCaseId} references missing task ${taskCode}`);
}
for(const f of ['decision_log.csv','risk_register.csv','vendor_register.csv','launch_gate_register.csv','artifact_register.csv','strategic_backlog.csv']){
  check(readText(`data/${f}`).trim().split(/\r?\n/).length>1,`${f} is empty`);
}
const sources=readJson('data/source_registry.json');
for(const source of sources){
  const p=path.join(root,'sources',source.file_name); check(fs.existsSync(p),`missing source ${source.file_name}`);
  if(fs.existsSync(p)){const hash=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');check(hash===source.sha256,`source hash mismatch ${source.file_name}`)}
}
if(failures.length){console.error(JSON.stringify({status:'FAIL',failures},null,2));process.exit(1)}
console.log(JSON.stringify({status:'PASS',counts:manifest.counts,checked_at:new Date().toISOString()},null,2));
